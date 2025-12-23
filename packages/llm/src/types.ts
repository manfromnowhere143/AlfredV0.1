/**
 * LLM Types
 *
 * Type definitions for LLM operations.
 * Covers requests, responses, streaming, and cost tracking.
 */

import type { AlfredMode, SkillLevel } from '@alfred/core';

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

export interface LLMConfig {
  apiKey: string;
  model?: ModelId;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
  baseUrl?: string;
}

export type ModelId =
  | 'claude-sonnet-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-opus-20240229';

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-20250514';

export const MODEL_INFO: Record<ModelId, ModelInfo> = {
  'claude-sonnet-4-20250514': {
    name: 'Claude Sonnet 4',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
  },
  'claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
  },
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutput: 4096,
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
  },
};

export interface ModelInfo {
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageBlock {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
}

// ============================================================================
// COMPLETION REQUEST
// ============================================================================

export interface CompletionRequest {
  messages: Message[];
  system?: string;
  model?: ModelId;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  metadata?: RequestMetadata;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolChoice =
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'tool'; name: string };

export interface RequestMetadata {
  conversationId?: string;
  userId?: string;
  mode?: AlfredMode;
  purpose?: string;
}

// ============================================================================
// COMPLETION RESPONSE
// ============================================================================

export interface CompletionResponse {
  id: string;
  content: ContentBlock[];
  model: ModelId;
  stopReason: StopReason;
  usage: Usage;
  cost: CostEstimate;
}

export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
}

// ============================================================================
// STREAMING
// ============================================================================

export interface StreamOptions {
  onToken?: (token: string) => void;
  onContentBlock?: (block: ContentBlock) => void;
  onUsage?: (usage: Usage) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export interface StreamEvent {
  type: StreamEventType;
  data: unknown;
}

export type StreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'error';

export interface StreamDelta {
  type: 'text_delta';
  text: string;
}

// ============================================================================
// ALFRED-SPECIFIC TYPES
// ============================================================================

export interface AlfredContext {
  mode: AlfredMode;
  skillLevel: SkillLevel;
  projectContext?: ProjectContext;
  memoryContext?: MemoryContext;
  ragContext?: RAGContext;
}

export interface ProjectContext {
  name: string;
  type: string;
  stack: Record<string, string[]>;
  recentDecisions?: string[];
}

export interface MemoryContext {
  preferences: string[];
  skillSignals: string[];
  recentInteractions: string[];
}

export interface RAGContext {
  relevantChunks: Array<{
    content: string;
    source: string;
    score: number;
  }>;
}

export interface AlfredRequest {
  userMessage: string;
  context: AlfredContext;
  conversationHistory?: Message[];
  attachments?: ContentBlock[];
}

export interface AlfredResponse {
  content: string;
  artifacts?: Artifact[];
  modeSwitch?: {
    newMode: AlfredMode;
    reason: string;
  };
  suggestions?: string[];
  usage: Usage;
  cost: CostEstimate;
}

export interface Artifact {
  id: string;
  type: 'code' | 'architecture' | 'document';
  title: string;
  content: string;
  language?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface LLMError {
  type: LLMErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number;
}

export type LLMErrorType =
  | 'authentication_error'
  | 'rate_limit_error'
  | 'invalid_request_error'
  | 'overloaded_error'
  | 'api_error'
  | 'timeout_error'
  | 'network_error';
