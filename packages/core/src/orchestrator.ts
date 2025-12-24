/**
 * Orchestrator
 *
 * Alfred's state machine. Controls the flow from understanding to building.
 * The LLM is the voice. This is the brain stem.
 *
 * States:
 * - IDLE: Waiting for input
 * - UNDERSTANDING: Processing user intent, gathering requirements
 * - CONFIRMING: Validating understanding before building
 * - DESIGNING: Architecture phase (for complex tasks)
 * - BUILDING: Generating artifacts
 * - PREVIEWING: User reviewing output
 * - ITERATING: Refining based on feedback
 * - COMPLETE: Task finished
 */

import type { AlfredMode, SkillLevel } from './types';

// ============================================================================
// STATE DEFINITIONS
// ============================================================================

export type OrchestratorState =
  | 'IDLE'
  | 'UNDERSTANDING'
  | 'CONFIRMING'
  | 'DESIGNING'
  | 'BUILDING'
  | 'PREVIEWING'
  | 'ITERATING'
  | 'COMPLETE';

export interface OrchestratorContext {
  state: OrchestratorState;
  mode: AlfredMode;
  skillLevel: SkillLevel;
  confidence: number;
  taskComplexity: TaskComplexity;
  requirementsGathered: string[];
  pendingConfirmations: string[];
  artifacts: Artifact[];
  iterationCount: number;
  maxIterations: number;
}

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex';

export interface Artifact {
  id: string;
  type: 'code' | 'architecture' | 'config' | 'documentation';
  filename: string;
  content: string;
  language?: string;
  createdAt: Date;
  version: number;
}

// ============================================================================
// STATE MACHINE
// ============================================================================

export function createOrchestratorContext(
  mode: AlfredMode = 'builder',
  skillLevel: SkillLevel = 'inferred'
): OrchestratorContext {
  return {
    state: 'IDLE',
    mode,
    skillLevel,
    confidence: 0,
    taskComplexity: 'simple',
    requirementsGathered: [],
    pendingConfirmations: [],
    artifacts: [],
    iterationCount: 0,
    maxIterations: 5,
  };
}

// ============================================================================
// TRANSITION RULES
// ============================================================================

interface TransitionResult {
  newState: OrchestratorState;
  action?: OrchestratorAction;
  reason: string;
}

export type OrchestratorAction =
  | { type: 'ASK_CLARIFICATION'; question: string }
  | { type: 'CONFIRM_UNDERSTANDING'; summary: string }
  | { type: 'PROPOSE_ARCHITECTURE'; architecture: string }
  | { type: 'BUILD_ARTIFACT'; artifact: Partial<Artifact> }
  | { type: 'REQUEST_FEEDBACK' }
  | { type: 'COMPLETE'; summary: string };

/**
 * Determines the next state based on current context and user input.
 * This is the core state machine logic.
 */
export function computeTransition(
  context: OrchestratorContext,
  input: TransitionInput
): TransitionResult {
  const { state, confidence, taskComplexity, iterationCount, maxIterations } = context;

  switch (state) {
    case 'IDLE':
      return {
        newState: 'UNDERSTANDING',
        reason: 'New input received, beginning analysis',
      };

    case 'UNDERSTANDING':
      // Confidence threshold depends on task complexity
      const confidenceThreshold = getConfidenceThreshold(taskComplexity);
      
      if (confidence >= confidenceThreshold) {
        // High confidence + complex task = confirm first
        if (taskComplexity === 'complex' || taskComplexity === 'moderate') {
          return {
            newState: 'CONFIRMING',
            action: { type: 'CONFIRM_UNDERSTANDING', summary: input.summary || '' },
            reason: `Confidence ${confidence} >= ${confidenceThreshold}, confirming understanding`,
          };
        }
        // High confidence + simple task = build directly
        return {
          newState: 'BUILDING',
          reason: `Confidence ${confidence} >= ${confidenceThreshold}, proceeding to build`,
        };
      }
      
      // Low confidence = ask clarification
      return {
        newState: 'UNDERSTANDING',
        action: { type: 'ASK_CLARIFICATION', question: input.clarificationNeeded || 'Could you clarify?' },
        reason: `Confidence ${confidence} < ${confidenceThreshold}, need clarification`,
      };

    case 'CONFIRMING':
      if (input.userConfirmed) {
        // User confirmed, proceed based on complexity
        if (taskComplexity === 'complex') {
          return {
            newState: 'DESIGNING',
            reason: 'User confirmed, complex task requires design phase',
          };
        }
        return {
          newState: 'BUILDING',
          reason: 'User confirmed, proceeding to build',
        };
      }
      // User rejected or requested changes
      return {
        newState: 'UNDERSTANDING',
        reason: 'User requested changes, returning to understanding',
      };

    case 'DESIGNING':
      if (input.designApproved) {
        return {
          newState: 'BUILDING',
          reason: 'Architecture approved, proceeding to build',
        };
      }
      return {
        newState: 'DESIGNING',
        action: { type: 'PROPOSE_ARCHITECTURE', architecture: input.revisedArchitecture || '' },
        reason: 'Revising architecture based on feedback',
      };

    case 'BUILDING':
      return {
        newState: 'PREVIEWING',
        action: { type: 'REQUEST_FEEDBACK' },
        reason: 'Build complete, awaiting user feedback',
      };

    case 'PREVIEWING':
      if (input.userApproved) {
        return {
          newState: 'COMPLETE',
          action: { type: 'COMPLETE', summary: 'Task completed successfully' },
          reason: 'User approved output',
        };
      }
      if (iterationCount >= maxIterations) {
        return {
          newState: 'COMPLETE',
          action: { type: 'COMPLETE', summary: 'Maximum iterations reached' },
          reason: 'Iteration limit reached',
        };
      }
      return {
        newState: 'ITERATING',
        reason: 'User requested changes',
      };

    case 'ITERATING':
      return {
        newState: 'BUILDING',
        reason: 'Applying requested changes',
      };

    case 'COMPLETE':
      return {
        newState: 'IDLE',
        reason: 'Resetting for next task',
      };

    default:
      return {
        newState: 'IDLE',
        reason: 'Unknown state, resetting',
      };
  }
}

interface TransitionInput {
  userMessage?: string;
  userConfirmed?: boolean;
  userApproved?: boolean;
  designApproved?: boolean;
  summary?: string;
  clarificationNeeded?: string;
  revisedArchitecture?: string;
}

function getConfidenceThreshold(complexity: TaskComplexity): number {
  switch (complexity) {
    case 'trivial': return 0.5;
    case 'simple': return 0.7;
    case 'moderate': return 0.8;
    case 'complex': return 0.9;
  }
}

// ============================================================================
// TASK ANALYSIS
// ============================================================================

/**
 * Analyzes user message to determine task complexity and initial confidence.
 */
export function analyzeTask(message: string): {
  complexity: TaskComplexity;
  initialConfidence: number;
  requiresDesign: boolean;
  suggestedMode: AlfredMode | null;
} {
  const lower = message.toLowerCase();
  const wordCount = message.split(/\s+/).length;
  
  // Complexity signals
  const complexSignals = [
    'architecture', 'system', 'full stack', 'database', 'authentication',
    'deployment', 'ci/cd', 'microservices', 'scale', 'multiple',
  ];
  const moderateSignals = [
    'component', 'page', 'form', 'api', 'integration', 'refactor',
  ];
  const simpleSignals = [
    'fix', 'update', 'change', 'add', 'remove', 'button', 'style',
  ];
  
  const complexScore = complexSignals.filter(s => lower.includes(s)).length;
  const moderateScore = moderateSignals.filter(s => lower.includes(s)).length;
  const simpleScore = simpleSignals.filter(s => lower.includes(s)).length;

  let complexity: TaskComplexity = 'simple';
  let requiresDesign = false;

  if (complexScore >= 2 || wordCount > 100) {
    complexity = 'complex';
    requiresDesign = true;
  } else if (moderateScore >= 2 || wordCount > 50) {
    complexity = 'moderate';
    requiresDesign = complexScore > 0;
  } else if (simpleScore >= 1 && wordCount < 20) {
    complexity = 'trivial';
  }

  // Initial confidence based on clarity of request
  const hasCodeBlock = message.includes('```');
  const hasSpecificRequest = /\b(create|build|make|fix|add|implement|write)\b/i.test(message);
  const hasContext = wordCount > 15;

  let initialConfidence = 0.5;
  if (hasSpecificRequest) initialConfidence += 0.2;
  if (hasContext) initialConfidence += 0.15;
  if (hasCodeBlock) initialConfidence += 0.15;
  if (complexity === 'trivial') initialConfidence += 0.1;

  // Mode inference
  let suggestedMode: AlfredMode | null = null;
  if (hasCodeBlock || /review|check|feedback/i.test(lower)) {
    suggestedMode = 'reviewer';
  } else if (/explain|why|how does|what is/i.test(lower)) {
    suggestedMode = 'mentor';
  } else if (/build|create|implement|write|make/i.test(lower)) {
    suggestedMode = 'builder';
  }

  return {
    complexity,
    initialConfidence: Math.min(initialConfidence, 0.95),
    requiresDesign,
    suggestedMode,
  };
}

// ============================================================================
// CONTEXT UPDATES
// ============================================================================

export function updateConfidence(
  context: OrchestratorContext,
  delta: number
): OrchestratorContext {
  return {
    ...context,
    confidence: Math.max(0, Math.min(1, context.confidence + delta)),
  };
}

export function addRequirement(
  context: OrchestratorContext,
  requirement: string
): OrchestratorContext {
  return {
    ...context,
    requirementsGathered: [...context.requirementsGathered, requirement],
    confidence: Math.min(context.confidence + 0.1, 0.95),
  };
}

export function addArtifact(
  context: OrchestratorContext,
  artifact: Omit<Artifact, 'id' | 'createdAt' | 'version'>
): OrchestratorContext {
  const newArtifact: Artifact = {
    ...artifact,
    id: `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date(),
    version: 1,
  };
  
  return {
    ...context,
    artifacts: [...context.artifacts, newArtifact],
  };
}

export function incrementIteration(context: OrchestratorContext): OrchestratorContext {
  return {
    ...context,
    iterationCount: context.iterationCount + 1,
  };
}

export function transitionTo(
  context: OrchestratorContext,
  newState: OrchestratorState
): OrchestratorContext {
  return {
    ...context,
    state: newState,
  };
}

// ============================================================================
// BUILDER GATE
// ============================================================================

/**
 * Determines if Builder mode should generate artifacts.
 * This is the critical gate that prevents premature building.
 */
export function shouldBuild(context: OrchestratorContext, userMessage: string): {
  allowed: boolean;
  reason: string;
} {
  const { state, confidence, taskComplexity, mode } = context;

  // Explicit build commands always allow
  const explicitBuildCommands = ['build it', 'go ahead', 'proceed', 'start building', 'do it'];
  if (explicitBuildCommands.some(cmd => userMessage.toLowerCase().includes(cmd))) {
    return { allowed: true, reason: 'Explicit build command received' };
  }

  // Must be in BUILDING state
  if (state !== 'BUILDING' && state !== 'ITERATING') {
    return { allowed: false, reason: `Not in build state (current: ${state})` };
  }

  // Confidence check for complex tasks
  const threshold = getConfidenceThreshold(taskComplexity);
  if (confidence < threshold) {
    return { 
      allowed: false, 
      reason: `Confidence ${confidence.toFixed(2)} below threshold ${threshold} for ${taskComplexity} task` 
    };
  }

  // Mode-specific rules
  if (mode === 'reviewer') {
    return { allowed: false, reason: 'Reviewer mode does not initiate builds' };
  }

  if (mode === 'mentor') {
    // Mentor can build small examples only
    const isSmallExample = userMessage.length < 200;
    if (!isSmallExample) {
      return { allowed: false, reason: 'Mentor mode builds only small examples' };
    }
  }

  return { allowed: true, reason: 'All conditions met' };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ORCHESTRATOR_VERSION = '1.0.0';