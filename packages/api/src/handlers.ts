/**
 * Handlers
 *
 * API request handlers that orchestrate core, memory, and RAG.
 * Pure functions. No framework dependencies.
 * 
 * Architecture: Unified Mind with Facets
 * Alfred doesn't "switch modes" — he perceives and adapts fluidly.
 */

import type {
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
  notFoundError,
} from './errors';

import { createLogger, Logger } from './logger';

import {
  detectFacet,
  type Facet,
} from '@alfred/core';

// ═══════════════════════════════════════════════════════════════════════════════
// FACET → LEGACY MODE MAPPING
// For API compatibility while using unified mind internally
// ═══════════════════════════════════════════════════════════════════════════════

type LegacyMode = 'builder' | 'mentor' | 'reviewer';

const FACET_TO_MODE: Record<Facet, LegacyMode> = {
  build: 'builder',
  teach: 'mentor',
  review: 'reviewer',
};

const MODE_TO_FACET: Record<LegacyMode, Facet> = {
  builder: 'build',
  mentor: 'teach',
  reviewer: 'review',
};

const DEFAULT_FACET: Facet = 'teach';

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION STATE
// ═══════════════════════════════════════════════════════════════════════════════

const conversations = new Map<string, ConversationState>();

interface ConversationState {
  id: string;
  userId?: string;
  facet: Facet;
  messages: Array<{ role: 'user' | 'alfred'; content: string }>;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export const handleStartConversation: Handler<
  StartConversationRequest,
  ApiResponse<StartConversationResponse>
> = async (ctx, request) => {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Convert legacy mode to facet, or use default
  const requestedMode = request.mode as LegacyMode | undefined;
  const facet: Facet = requestedMode ? MODE_TO_FACET[requestedMode] : DEFAULT_FACET;
  const userId = request.userId as string | undefined;

  const state: ConversationState = {
    id: conversationId,
    userId,
    facet,
    messages: [],
    createdAt: new Date(),
  };

  conversations.set(conversationId, state);

  ctx.logger.info('Conversation started', { conversationId, facet });

  // Alfred's greeting based on facet
  const greetings: Record<Facet, string> = {
    build: 'Alfred. What are we building?',
    teach: 'Alfred here. What would you like to learn?',
    review: 'Alfred. Show me what you want reviewed.',
  };
  const greeting = greetings[facet];

  return successResponse(ctx, {
    conversationId,
    sessionId,
    mode: FACET_TO_MODE[facet], // Return legacy mode for API compatibility
    greeting,
  });
};

export const handleSendMessage: Handler<
  SendMessageRequest,
  ApiResponse<SendMessageResponse>
> = async (ctx, request) => {
  const conversationId = request.conversationId as string;
  const content = request.content as string;

  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw notFoundError('conversation', conversationId);
  }

  // Unified mind: detect facet from content, adapt fluidly
  const detectedFacet = detectFacet(content);
  const previousFacet = conversation.facet;
  
  // Alfred adapts without announcing — just update internal state
  conversation.facet = detectedFacet;

  // Store user message
  conversation.messages.push({
    role: 'user',
    content,
  });

  // Generate response (placeholder — would call LLM with facet context)
  // Future: use getFacetAdjustments(detectedFacet) to tune LLM parameters
  const responseContent = generateResponse(detectedFacet);

  // Store alfred message
  conversation.messages.push({
    role: 'alfred',
    content: responseContent,
  });

  const messageId = `msg_${Date.now()}`;

  return successResponse(ctx, {
    messageId,
    content: responseContent,
    mode: FACET_TO_MODE[detectedFacet], // Legacy API compatibility
    modeChanged: detectedFacet !== previousFacet,
    suggestions: generateSuggestions(detectedFacet),
  });
};

function generateResponse(facet: Facet): string {
  // Alfred doesn't announce mode switches — he just responds appropriately
  const responses: Record<Facet, string> = {
    build: 'Understood. Let me work on that.',
    teach: 'Let me explain the approach and reasoning.',
    review: "I'll analyze this against best practices.",
  };

  return responses[facet];
}

function generateSuggestions(facet: Facet): string[] {
  const suggestions: Record<Facet, string[]> = {
    build: ['Add more detail', 'Show me the code', 'What about tests?'],
    teach: ['Explain more', 'Show an example', 'What are alternatives?'],
    review: ['Check security', 'Review performance', 'Suggest improvements'],
  };
  return suggestions[facet];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE HANDLERS (Legacy API — internally uses facets)
// ═══════════════════════════════════════════════════════════════════════════════

export const handleSwitchMode: Handler<
  SwitchModeRequest,
  ApiResponse<SwitchModeResponse>
> = async (ctx, request) => {
  const conversationId = request.conversationId as string;
  const newMode = request.mode as LegacyMode;
  const reason = request.reason as string | undefined;

  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw notFoundError('conversation', conversationId);
  }

  const previousFacet = conversation.facet;
  const newFacet = MODE_TO_FACET[newMode];
  conversation.facet = newFacet;

  // Unified mind: no announcements, just acknowledgment if reason given
  const announcement = reason ? `Understood. ${reason}` : '';

  ctx.logger.info('Facet adjusted', {
    conversationId,
    previousFacet,
    newFacet,
  });

  return successResponse(ctx, {
    previousMode: FACET_TO_MODE[previousFacet],
    currentMode: newMode,
    announcement,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export const handleReviewCode: Handler<
  ReviewCodeRequest,
  ApiResponse<ReviewCodeResponse>
> = async (ctx, request) => {
  const conversationId = request.conversationId as string;
  const code = request.code as string;

  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw notFoundError('conversation', conversationId);
  }

  // Automatically engage review facet
  conversation.facet = 'review';

  const reviewId = `review_${Date.now()}`;
  const issues = analyzeCode(code);

  return successResponse(ctx, {
    reviewId,
    summary: `Found ${issues.length} issues in the code.`,
    issues,
    suggestions: ['Consider adding types', 'Add error handling'],
    overallQuality:
      issues.length === 0
        ? 'excellent'
        : issues.length < 3
          ? 'good'
          : issues.length < 6
            ? 'needs_work'
            : 'poor',
  });
};

function analyzeCode(code: string): ReviewCodeResponse['issues'] {
  const issues: ReviewCodeResponse['issues'] = [];

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

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export const handleHealthCheck: Handler<
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

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const handlers = {
  startConversation: withErrorHandling(handleStartConversation),
  sendMessage: withErrorHandling(handleSendMessage),
  switchMode: withErrorHandling(handleSwitchMode),
  reviewCode: withErrorHandling(handleReviewCode),
  healthCheck: withErrorHandling(handleHealthCheck),
};