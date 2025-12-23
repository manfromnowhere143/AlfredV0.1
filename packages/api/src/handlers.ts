/**
 * Handlers
 *
 * API request handlers that orchestrate core, memory, and RAG.
 * Pure functions. No framework dependencies.
 */

import type {
  ApiRequest,
  ApiResponse,
  ResponseMeta,
  StartConversationRequest,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  SwitchModeRequest,
  SwitchModeResponse,
  HealthCheckResponse,
  ReviewCodeRequest,
  ReviewCodeResponse,
} from './types';

import {
  AlfredError,
  toAlfredError,
  ErrorCodes,
  notFoundError,
} from './errors';

import {
  validate,
  validateOrThrow,
  string,
  oneOf,
  array,
  Schema,
  ALFRED_MODES,
} from './validation';

import { createLogger, Logger, startMeasure, endMeasure } from './logger';

import { MODES, DEFAULT_MODE, inferMode, announceModeSwtich } from '@alfred/core';
import type { AlfredMode } from '@alfred/core';

// ============================================================================
// HANDLER CONTEXT
// ============================================================================

export interface HandlerContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  logger: Logger;
  startTime: number;
}

export function createHandlerContext(
  requestId: string,
  userId?: string,
  sessionId?: string
): HandlerContext {
  const logger = createLogger({ format: 'json' }).child({
    requestId,
    userId,
    sessionId,
  });

  return {
    requestId,
    userId,
    sessionId,
    logger,
    startTime: Date.now(),
  };
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

function buildMeta(ctx: HandlerContext, tokensUsed?: number): ResponseMeta {
  return {
    processingTimeMs: Date.now() - ctx.startTime,
    tokensUsed,
    cached: false,
    version: '0.1.0',
  };
}

function successResponse<T>(
  ctx: HandlerContext,
  data: T,
  tokensUsed?: number
): ApiResponse<T> {
  return {
    id: `res_${Date.now()}`,
    requestId: ctx.requestId,
    timestamp: new Date(),
    success: true,
    data,
    meta: buildMeta(ctx, tokensUsed),
  };
}

function errorResponse(
  ctx: HandlerContext,
  error: AlfredError
): ApiResponse<never> {
  return {
    id: `res_${Date.now()}`,
    requestId: ctx.requestId,
    timestamp: new Date(),
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      recoverable: error.recoverable,
    },
    meta: buildMeta(ctx),
  };
}

// ============================================================================
// HANDLER WRAPPER
// ============================================================================

export type Handler<TReq, TRes> = (
  ctx: HandlerContext,
  request: TReq
) => Promise<TRes>;

/**
 * Wraps a handler with error handling and logging.
 */
export function withErrorHandling<TReq, TRes>(
  handler: Handler<TReq, ApiResponse<TRes>>
): Handler<TReq, ApiResponse<TRes>> {
  return async (ctx, request) => {
    try {
      ctx.logger.info('Handler started');
      const response = await handler(ctx, request);
      ctx.logger.info('Handler completed', {
        success: response.success,
        duration: Date.now() - ctx.startTime,
      });
      return response;
    } catch (error) {
      const alfredError = toAlfredError(error);
      ctx.logger.error('Handler failed', alfredError, {
        code: alfredError.code,
      });
      return errorResponse(ctx, alfredError);
    }
  };
}

// ============================================================================
// CONVERSATION HANDLERS
// ============================================================================

// In-memory storage (replace with real storage in production)
const conversations = new Map<string, ConversationState>();

interface ConversationState {
  id: string;
  userId?: string;
  mode: AlfredMode;
  messages: Array<{ role: 'user' | 'alfred'; content: string }>;
  createdAt: Date;
}

const startConversationSchema: Schema<StartConversationRequest> = {
  userId: string({ optional: true }),
  mode: oneOf(ALFRED_MODES, { optional: true }),
  projectContext: () => ({ success: true, errors: [] }), // TODO: nested validation
} as Schema<StartConversationRequest>;

export const handleStartConversation: Handler
  StartConversationRequest,
  ApiResponse<StartConversationResponse>
> = async (ctx, request) => {
  const validated = validateOrThrow(request, startConversationSchema);
  
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const mode = validated.mode || DEFAULT_MODE;

  const state: ConversationState = {
    id: conversationId,
    userId: validated.userId,
    mode,
    messages: [],
    createdAt: new Date(),
  };

  conversations.set(conversationId, state);

  ctx.logger.info('Conversation started', { conversationId, mode });

  const greeting = generateGreeting(mode);

  return successResponse(ctx, {
    conversationId,
    sessionId,
    mode,
    greeting,
  });
};

function generateGreeting(mode: AlfredMode): string {
  const greetings: Record<AlfredMode, string> = {
    builder: 'Alfred. What are we building?',
    mentor: 'Alfred here. What would you like to learn?',
    reviewer: 'Alfred. Show me what you want reviewed.',
  };
  return greetings[mode];
}

const sendMessageSchema: Schema<SendMessageRequest> = {
  conversationId: string({ minLength: 1 }),
  content: string({ minLength: 1, maxLength: 100000 }),
  attachments: array(() => ({ success: true, errors: [] }), { optional: true }),
} as Schema<SendMessageRequest>;

export const handleSendMessage: Handler
  SendMessageRequest,
  ApiResponse<SendMessageResponse>
> = async (ctx, request) => {
  const validated = validateOrThrow(request, sendMessageSchema);
  
  const conversation = conversations.get(validated.conversationId);
  if (!conversation) {
    throw notFoundError('conversation', validated.conversationId);
  }

  // Check for mode switch
  const inferredMode = inferMode(validated.content);
  let modeChanged = false;
  let currentMode = conversation.mode;

  if (inferredMode && inferredMode.mode !== conversation.mode && inferredMode.confidence >= 0.8) {
    modeChanged = true;
    currentMode = inferredMode.mode;
    conversation.mode = currentMode;
  }

  // Store user message
  conversation.messages.push({
    role: 'user',
    content: validated.content,
  });

  // Generate response (placeholder - would call LLM)
  const responseContent = generateResponse(validated.content, currentMode, modeChanged);

  // Store alfred message
  conversation.messages.push({
    role: 'alfred',
    content: responseContent,
  });

  const messageId = `msg_${Date.now()}`;

  return successResponse(ctx, {
    messageId,
    content: responseContent,
    mode: currentMode,
    modeChanged,
    suggestions: generateSuggestions(currentMode),
  });
};

function generateResponse(
  userMessage: string,
  mode: AlfredMode,
  modeChanged: boolean
): string {
  // Placeholder response generation
  // In production, this would call the LLM with appropriate context
  
  let response = '';
  
  if (modeChanged) {
    response = announceModeSwtich(mode) + '\n\n';
  }

  switch (mode) {
    case 'builder':
      response += 'Understood. Let me work on that.';
      break;
    case 'mentor':
      response += "Let me explain the approach and reasoning.";
      break;
    case 'reviewer':
      response += "I'll analyze this against best practices.";
      break;
  }

  return response;
}

function generateSuggestions(mode: AlfredMode): string[] {
  const suggestions: Record<AlfredMode, string[]> = {
    builder: ['Add more detail', 'Show me the code', 'What about tests?'],
    mentor: ['Explain more', 'Show an example', 'What are alternatives?'],
    reviewer: ['Check security', 'Review performance', 'Suggest improvements'],
  };
  return suggestions[mode];
}

// ============================================================================
// MODE HANDLERS
// ============================================================================

const switchModeSchema: Schema<SwitchModeRequest> = {
  conversationId: string({ minLength: 1 }),
  mode: oneOf(ALFRED_MODES),
  reason: string({ optional: true }),
} as Schema<SwitchModeRequest>;

export const handleSwitchMode: Handler
  SwitchModeRequest,
  ApiResponse<SwitchModeResponse>
> = async (ctx, request) => {
  const validated = validateOrThrow(request, switchModeSchema);
  
  const conversation = conversations.get(validated.conversationId);
  if (!conversation) {
    throw notFoundError('conversation', validated.conversationId);
  }

  const previousMode = conversation.mode;
  conversation.mode = validated.mode;

  const announcement = announceModeSwtich(validated.mode, validated.reason);

  ctx.logger.info('Mode switched', {
    conversationId: validated.conversationId,
    previousMode,
    newMode: validated.mode,
  });

  return successResponse(ctx, {
    previousMode,
    currentMode: validated.mode,
    announcement,
  });
};

// ============================================================================
// REVIEW HANDLERS
// ============================================================================

const reviewCodeSchema: Schema<ReviewCodeRequest> = {
  conversationId: string({ minLength: 1 }),
  code: string({ minLength: 1, maxLength: 100000 }),
  language: string({ minLength: 1 }),
  context: string({ optional: true }),
  focusAreas: array(string(), { optional: true }),
} as Schema<ReviewCodeRequest>;

export const handleReviewCode: Handler
  ReviewCodeRequest,
  ApiResponse<ReviewCodeResponse>
> = async (ctx, request) => {
  const validated = validateOrThrow(request, reviewCodeSchema);
  
  const conversation = conversations.get(validated.conversationId);
  if (!conversation) {
    throw notFoundError('conversation', validated.conversationId);
  }

  // Placeholder review (would use LLM + RAG in production)
  const reviewId = `review_${Date.now()}`;
  
  const issues = analyzeCode(validated.code, validated.language);

  return successResponse(ctx, {
    reviewId,
    summary: `Found ${issues.length} issues in the code.`,
    issues,
    suggestions: ['Consider adding types', 'Add error handling'],
    overallQuality: issues.length === 0 ? 'excellent' : 
                    issues.length < 3 ? 'good' : 
                    issues.length < 6 ? 'needs_work' : 'poor',
  });
};

function analyzeCode(
  code: string,
  language: string
): ReviewCodeResponse['issues'] {
  // Placeholder analysis
  const issues: ReviewCodeResponse['issues'] = [];

  // Check for common issues
  if (!code.includes('try') && !code.includes('catch')) {
    issues.push({
      severity: 'important',
      description: 'No error handling detected',
      suggestion: 'Add try-catch blocks for error handling',
      category: 'error-handling',
    });
  }

  if (code.includes('any')) {
    issues.push({
      severity: 'optional',
      description: 'Usage of "any" type detected',
      suggestion: 'Replace "any" with specific types',
      category: 'type-safety',
    });
  }

  if (code.includes('console.log')) {
    issues.push({
      severity: 'optional',
      description: 'Console.log statements found',
      suggestion: 'Remove or replace with proper logging',
      category: 'code-quality',
    });
  }

  return issues;
}

// ============================================================================
// HEALTH HANDLERS
// ============================================================================

export const handleHealthCheck: Handler
  void,
  ApiResponse<HealthCheckResponse>
> = async (ctx) => {
  const uptime = process.uptime();

  return successResponse(ctx, {
    status: 'healthy',
    version: '0.1.0',
    uptime,
    components: [
      { name: 'core', status: 'healthy' },
      { name: 'memory', status: 'healthy' },
      { name: 'rag', status: 'healthy' },
    ],
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export const handlers = {
  startConversation: withErrorHandling(handleStartConversation),
  sendMessage: withErrorHandling(handleSendMessage),
  switchMode: withErrorHandling(handleSwitchMode),
  reviewCode: withErrorHandling(handleReviewCode),
  healthCheck: withErrorHandling(handleHealthCheck),
};
