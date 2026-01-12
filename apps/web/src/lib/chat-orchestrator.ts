/**
 * CHAT ORCHESTRATOR
 * Production-grade integration of Alfred's state machine with LLM calls.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Request → Orchestrator → State Machine → LLM (Circuit Breaker) → Response │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - State-driven conversation flow (8-state FSM)
 * - Circuit breaker for LLM resilience
 * - Request tracing with correlation IDs
 * - Structured logging
 * - Graceful degradation
 */

import {
  createOrchestratorContext,
  computeTransition,
  analyzeTask,
  shouldBuild,
  updateConfidence,
  addRequirement,
  transitionTo,
  incrementIteration,
  type OrchestratorContext,
  type OrchestratorState,
  type OrchestratorAction,
  type TaskComplexity,
} from '@alfred/core';

import {
  createCircuitBreaker,
  withRetry,
  type CircuitBreaker,
  type RetryConfig,
} from '@alfred/llm';

import { captureError, addBreadcrumb, generateRequestId } from './observability';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrchestratorInput {
  message: string;
  conversationId: string;
  userId: string;
  mode?: 'builder' | 'mentor' | 'reviewer';
  existingContext?: OrchestratorContext;
}

export interface OrchestratorResult {
  context: OrchestratorContext;
  action: OrchestratorAction | null;
  shouldStream: boolean;
  systemPromptAdditions: string;
  metadata: OrchestratorMetadata;
}

export interface OrchestratorMetadata {
  requestId: string;
  stateTransition: {
    from: OrchestratorState;
    to: OrchestratorState;
    reason: string;
  };
  taskAnalysis: {
    complexity: TaskComplexity;
    confidence: number;
    requiresDesign: boolean;
  };
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let circuitBreaker: CircuitBreaker | null = null;

function getCircuitBreaker(): CircuitBreaker {
  if (!circuitBreaker) {
    circuitBreaker = createCircuitBreaker({
      failureThreshold: 5,     // Open after 5 consecutive failures
      resetTimeout: 30_000,    // Try again after 30 seconds
    });

    console.log('[Orchestrator] Circuit breaker initialized');
  }
  return circuitBreaker;
}

/**
 * Get current circuit breaker status for health checks
 */
export function getCircuitBreakerStatus(): {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  healthy: boolean;
} {
  const cb = getCircuitBreaker();
  return {
    state: cb.state,
    failures: cb.failures,
    healthy: cb.state !== 'open',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Orchestrates a chat request through Alfred's state machine.
 * Returns the next action and updated context.
 */
export function orchestrate(input: OrchestratorInput): OrchestratorResult {
  const startTime = performance.now();
  const requestId = generateRequestId();

  // Breadcrumb for observability
  addBreadcrumb(`Orchestrating request`, 'user', {
    conversationId: input.conversationId,
    messageLength: input.message.length,
    hasExistingContext: !!input.existingContext,
  });

  // 1. Initialize or restore context
  let context = input.existingContext || createOrchestratorContext(
    input.mode || 'builder',
    'intermediate'
  );

  const previousState = context.state;

  // 2. Analyze the incoming task
  const taskAnalysis = analyzeTask(input.message);

  // Update context with task analysis
  if (context.state === 'IDLE' || context.state === 'COMPLETE') {
    context = {
      ...context,
      state: 'IDLE',
      taskComplexity: taskAnalysis.complexity,
      confidence: taskAnalysis.initialConfidence,
      iterationCount: 0,
      requirementsGathered: [],
      pendingConfirmations: [],
    };

    // Apply suggested mode if no existing preference
    if (taskAnalysis.suggestedMode && !input.mode) {
      context.mode = taskAnalysis.suggestedMode;
    }
  }

  // 3. Detect user signals for state transitions
  const transitionInput = parseUserSignals(input.message, context);

  // 4. Compute state transition
  const transition = computeTransition(context, transitionInput);

  // 5. Update context with new state
  context = transitionTo(context, transition.newState);

  // 6. Check build gate if applicable
  let shouldStream = true;
  let systemPromptAdditions = '';

  if (context.state === 'BUILDING' || context.state === 'ITERATING') {
    const buildCheck = shouldBuild(context, input.message);

    if (!buildCheck.allowed) {
      // Gate blocked - need more information
      console.log(`[Orchestrator] Build gate blocked: ${buildCheck.reason}`);

      systemPromptAdditions = buildGateBlockedPrompt(buildCheck.reason, context);

      // Don't prevent streaming, but adjust the prompt
      context = updateConfidence(context, -0.1);
    } else {
      systemPromptAdditions = buildModePrompt(context);
    }
  }

  // 7. Add state-specific prompt additions
  systemPromptAdditions += getStatePromptAdditions(context, transition.action);

  // 8. Compile metadata
  const durationMs = performance.now() - startTime;

  const metadata: OrchestratorMetadata = {
    requestId,
    stateTransition: {
      from: previousState,
      to: context.state,
      reason: transition.reason,
    },
    taskAnalysis: {
      complexity: taskAnalysis.complexity,
      confidence: context.confidence,
      requiresDesign: taskAnalysis.requiresDesign,
    },
    circuitBreakerState: getCircuitBreaker().state,
    durationMs,
  };

  // Log state transition
  logStateTransition(metadata);

  return {
    context,
    action: transition.action || null,
    shouldStream,
    systemPromptAdditions,
    metadata,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER SIGNAL PARSING
// ═══════════════════════════════════════════════════════════════════════════════

interface TransitionInput {
  userMessage?: string;
  userConfirmed?: boolean;
  userApproved?: boolean;
  designApproved?: boolean;
  summary?: string;
  clarificationNeeded?: string;
  revisedArchitecture?: string;
}

/**
 * Parses user message for signals that drive state transitions.
 */
function parseUserSignals(message: string, context: OrchestratorContext): TransitionInput {
  const lower = message.toLowerCase().trim();

  const input: TransitionInput = {
    userMessage: message,
  };

  // Confirmation signals
  const confirmSignals = ['yes', 'correct', 'exactly', 'that\'s right', 'proceed', 'go ahead', 'looks good', 'perfect'];
  const rejectSignals = ['no', 'not quite', 'actually', 'change', 'different', 'wrong'];

  if (context.state === 'CONFIRMING') {
    input.userConfirmed = confirmSignals.some(s => lower.includes(s));
    if (rejectSignals.some(s => lower.includes(s))) {
      input.userConfirmed = false;
    }
  }

  if (context.state === 'DESIGNING') {
    input.designApproved = confirmSignals.some(s => lower.includes(s));
    if (rejectSignals.some(s => lower.includes(s))) {
      input.designApproved = false;
    }
  }

  if (context.state === 'PREVIEWING') {
    const approvalSignals = ['looks great', 'perfect', 'ship it', 'done', 'complete', 'finished', 'good'];
    const iterationSignals = ['but', 'however', 'change', 'modify', 'update', 'fix', 'adjust'];

    input.userApproved = approvalSignals.some(s => lower.includes(s)) &&
                         !iterationSignals.some(s => lower.includes(s));
  }

  return input;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT ADDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getStatePromptAdditions(context: OrchestratorContext, action: OrchestratorAction | undefined): string {
  const parts: string[] = [];

  // State awareness
  parts.push(`\n[ORCHESTRATOR STATE: ${context.state}]`);
  parts.push(`[CONFIDENCE: ${(context.confidence * 100).toFixed(0)}%]`);
  parts.push(`[COMPLEXITY: ${context.taskComplexity}]`);

  if (context.iterationCount > 0) {
    parts.push(`[ITERATION: ${context.iterationCount}/${context.maxIterations}]`);
  }

  // State-specific instructions
  switch (context.state) {
    case 'UNDERSTANDING':
      if (context.confidence < 0.7) {
        parts.push('\n[INSTRUCTION: Confidence is low. Ask ONE clarifying question to increase understanding.]');
      }
      break;

    case 'CONFIRMING':
      parts.push('\n[INSTRUCTION: Summarize your understanding in 2-3 bullet points. Ask user to confirm before proceeding.]');
      break;

    case 'DESIGNING':
      parts.push('\n[INSTRUCTION: This is a complex task. Propose a high-level architecture before building.]');
      break;

    case 'PREVIEWING':
      parts.push('\n[INSTRUCTION: Output is ready. Ask if user wants any changes or if they\'re satisfied.]');
      break;

    case 'ITERATING':
      parts.push('\n[INSTRUCTION: User wants changes. Apply them precisely and output the complete updated code.]');
      break;
  }

  // Requirements gathered
  if (context.requirementsGathered.length > 0) {
    parts.push(`\n[GATHERED REQUIREMENTS: ${context.requirementsGathered.join('; ')}]`);
  }

  return parts.join('\n');
}

function buildModePrompt(context: OrchestratorContext): string {
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  BUILD MODE ACTIVE                                                            ║
║  Confidence: ${(context.confidence * 100).toFixed(0)}% | Complexity: ${context.taskComplexity.padEnd(8)} | Iteration: ${context.iterationCount}/${context.maxIterations}  ║
╚══════════════════════════════════════════════════════════════════════════════╝

You are cleared to generate artifacts. Output complete, production-ready code.
`;
}

function buildGateBlockedPrompt(reason: string, context: OrchestratorContext): string {
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  BUILD GATE: NOT CLEARED                                                      ║
║  Reason: ${reason.substring(0, 60).padEnd(60)}  ║
╚══════════════════════════════════════════════════════════════════════════════╝

Do NOT generate code yet. Instead:
1. Ask a clarifying question to increase confidence
2. Confirm understanding before proceeding
3. Current confidence: ${(context.confidence * 100).toFixed(0)}%
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

const LLM_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

/**
 * Wraps an LLM call with circuit breaker and retry logic.
 * Use this for all LLM API calls in production.
 */
export async function withLLMResilience<T>(
  fn: () => Promise<T>,
  options: {
    requestId?: string;
    operation?: string;
    skipCircuitBreaker?: boolean;
  } = {}
): Promise<T> {
  const { requestId = generateRequestId(), operation = 'llm_call', skipCircuitBreaker = false } = options;
  const startTime = performance.now();

  addBreadcrumb(`Starting ${operation}`, 'http', { requestId });

  try {
    let result: T;

    if (skipCircuitBreaker) {
      // Direct retry without circuit breaker
      result = await withRetry(fn, LLM_RETRY_CONFIG);
    } else {
      // Full resilience: circuit breaker + retry
      const cb = getCircuitBreaker();
      result = await cb.execute(() => withRetry(fn, LLM_RETRY_CONFIG));
    }

    const durationMs = performance.now() - startTime;

    console.log(`[LLM] ✓ ${operation} completed in ${durationMs.toFixed(0)}ms (circuit: ${getCircuitBreaker().state})`);

    addBreadcrumb(`Completed ${operation}`, 'http', {
      requestId,
      durationMs,
      circuitState: getCircuitBreaker().state,
    });

    return result;
  } catch (error) {
    const durationMs = performance.now() - startTime;
    const cb = getCircuitBreaker();

    console.error(`[LLM] ✗ ${operation} failed after ${durationMs.toFixed(0)}ms (circuit: ${cb.state}, failures: ${cb.failures})`);

    // Capture to Sentry with context
    if (error instanceof Error) {
      captureError(error, {
        requestId,
        tags: {
          operation,
          circuitState: cb.state,
          failures: String(cb.failures),
        },
        extra: {
          durationMs,
        },
      });
    }

    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function logStateTransition(metadata: OrchestratorMetadata): void {
  const { stateTransition, taskAnalysis, requestId, durationMs, circuitBreakerState } = metadata;

  const logData = {
    requestId,
    transition: `${stateTransition.from} → ${stateTransition.to}`,
    reason: stateTransition.reason,
    complexity: taskAnalysis.complexity,
    confidence: `${(taskAnalysis.confidence * 100).toFixed(0)}%`,
    circuit: circuitBreakerState,
    duration: `${durationMs.toFixed(1)}ms`,
  };

  console.log(`[Orchestrator] State: ${logData.transition} | ${logData.reason} | conf=${logData.confidence} | ${logData.duration}`);

  addBreadcrumb('State transition', 'navigation', logData);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT PERSISTENCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializes orchestrator context for database storage.
 */
export function serializeContext(context: OrchestratorContext): string {
  return JSON.stringify(context);
}

/**
 * Deserializes orchestrator context from database.
 */
export function deserializeContext(json: string | null): OrchestratorContext | null {
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);

    // Validate required fields
    if (!parsed.state || !parsed.mode) {
      return null;
    }

    return parsed as OrchestratorContext;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrchestratorHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
  };
  version: string;
}

export function getOrchestratorHealth(): OrchestratorHealth {
  const cb = getCircuitBreaker();

  let status: OrchestratorHealth['status'] = 'healthy';

  if (cb.state === 'open') {
    status = 'unhealthy';
  } else if (cb.state === 'half-open' || cb.failures > 0) {
    status = 'degraded';
  }

  return {
    status,
    circuitBreaker: {
      state: cb.state,
      failures: cb.failures,
    },
    version: '2.0.0',
  };
}
