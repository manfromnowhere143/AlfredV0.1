/**
 * Token Utilities
 *
 * Token counting, cost estimation, context management.
 * Approximations for fast, offline calculations.
 */

import type { ModelId, Usage, CostEstimate, Message } from './types';

// ============================================================================
// MODEL PRICING (as of 2024)
// ============================================================================

const PRICING: Record<ModelId, { inputPer1M: number; outputPer1M: number }> = {
  'claude-sonnet-4-20250514': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-3-5-haiku-20241022': { inputPer1M: 0.80, outputPer1M: 4.00 },
  'claude-3-opus-20240229': { inputPer1M: 15.00, outputPer1M: 75.00 },
};

// ============================================================================
// COST ESTIMATION
// ============================================================================

/**
 * Estimates cost based on token usage.
 */
export function estimateCost(model: ModelId, usage: Usage): CostEstimate {
  const pricing = PRICING[model];

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M;

  return {
    inputCost: roundTo6Decimals(inputCost),
    outputCost: roundTo6Decimals(outputCost),
    totalCost: roundTo6Decimals(inputCost + outputCost),
    currency: 'USD',
  };
}

/**
 * Estimates cost before making a request.
 */
export function estimateCostBeforeRequest(
  model: ModelId,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): CostEstimate {
  return estimateCost(model, {
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    totalTokens: estimatedInputTokens + estimatedOutputTokens,
  });
}

function roundTo6Decimals(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

// ============================================================================
// TOKEN COUNTING (APPROXIMATION)
// ============================================================================

/**
 * Approximates token count for text.
 * Claude uses ~4 characters per token on average for English.
 * This is an approximation — actual count may vary.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // More accurate estimation considering different content types
  let count = 0;

  // Count code blocks separately (more tokens per character)
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = text.match(codeBlockRegex) || [];

  for (const block of codeBlocks) {
    // Code is typically ~3 chars per token
    count += Math.ceil(block.length / 3);
  }

  // Remove code blocks for remaining text calculation
  const textWithoutCode = text.replace(codeBlockRegex, '');

  // Regular text is ~4 chars per token
  count += Math.ceil(textWithoutCode.length / 4);

  return count;
}

/**
 * Estimates tokens for a message.
 */
export function estimateMessageTokens(message: Message): number {
  // Base tokens for message structure
  let tokens = 4;

  if (typeof message.content === 'string') {
    tokens += estimateTokens(message.content);
  } else {
    for (const block of message.content) {
      if (block.type === 'text') {
        tokens += estimateTokens(block.text);
      } else if (block.type === 'image') {
        // Images use a fixed number of tokens based on size
        // Approximation: ~1000 tokens for a typical image
        tokens += 1000;
      } else if (block.type === 'tool_use' || block.type === 'tool_result') {
        tokens += estimateTokens(JSON.stringify(block));
      }
    }
  }

  return tokens;
}

/**
 * Estimates total tokens for a conversation.
 */
export function estimateConversationTokens(
  systemPrompt: string,
  messages: Message[]
): number {
  let tokens = 0;

  // System prompt
  tokens += estimateTokens(systemPrompt);

  // Messages
  for (const message of messages) {
    tokens += estimateMessageTokens(message);
  }

  // Add overhead for message formatting
  tokens += messages.length * 4;

  return tokens;
}

// ============================================================================
// CONTEXT WINDOW MANAGEMENT
// ============================================================================

const CONTEXT_WINDOWS: Record<ModelId, number> = {
  'claude-sonnet-4-20250514': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
};

const MAX_OUTPUT: Record<ModelId, number> = {
  'claude-sonnet-4-20250514': 8192,
  'claude-3-5-sonnet-20241022': 8192,
  'claude-3-5-haiku-20241022': 8192,
  'claude-3-opus-20240229': 4096,
};

/**
 * Gets the context window size for a model.
 */
export function getContextWindow(model: ModelId): number {
  return CONTEXT_WINDOWS[model];
}

/**
 * Gets the maximum output tokens for a model.
 */
export function getMaxOutput(model: ModelId): number {
  return MAX_OUTPUT[model];
}

/**
 * Checks if content fits within context window.
 */
export function fitsInContext(
  model: ModelId,
  systemPrompt: string,
  messages: Message[],
  reserveForOutput: number = 4096
): boolean {
  const totalTokens = estimateConversationTokens(systemPrompt, messages);
  const availableTokens = CONTEXT_WINDOWS[model] - reserveForOutput;

  return totalTokens <= availableTokens;
}

/**
 * Calculates available tokens for output.
 */
export function availableOutputTokens(
  model: ModelId,
  systemPrompt: string,
  messages: Message[]
): number {
  const inputTokens = estimateConversationTokens(systemPrompt, messages);
  const contextWindow = CONTEXT_WINDOWS[model];
  const maxOutput = MAX_OUTPUT[model];

  const available = contextWindow - inputTokens;

  return Math.min(available, maxOutput);
}

// ============================================================================
// CONVERSATION TRUNCATION
// ============================================================================

export interface TruncationResult {
  messages: Message[];
  removedCount: number;
  removedTokens: number;
}

/**
 * Truncates conversation to fit within context window.
 * Keeps system prompt and recent messages.
 */
export function truncateConversation(
  model: ModelId,
  systemPrompt: string,
  messages: Message[],
  reserveForOutput: number = 4096
): TruncationResult {
  const maxTokens = CONTEXT_WINDOWS[model] - reserveForOutput;
  const systemTokens = estimateTokens(systemPrompt);

  let availableForMessages = maxTokens - systemTokens;
  let removedCount = 0;
  let removedTokens = 0;

  // Calculate tokens for each message
  const messageTokens = messages.map(m => estimateMessageTokens(m));
  const totalMessageTokens = messageTokens.reduce((a, b) => a + b, 0);

  // If everything fits, return as-is
  if (totalMessageTokens <= availableForMessages) {
    return { messages, removedCount: 0, removedTokens: 0 };
  }

  // Remove oldest messages until it fits
  // Keep at least the last 2 messages (user + assistant)
  const minKeep = Math.min(2, messages.length);
  const truncated: Message[] = [];
  let currentTokens = 0;

  // Start from the end (most recent)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = messageTokens[i] ?? 0;

    if (currentTokens + msgTokens <= availableForMessages || truncated.length < minKeep) {
      const msg = messages[i]; if (msg) truncated.unshift(msg);
      currentTokens += msgTokens;
    } else {
      removedCount++;
      removedTokens += msgTokens;
    }
  }

  return {
    messages: truncated,
    removedCount,
    removedTokens,
  };
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface UsageAccumulator {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

/**
 * Creates a new usage accumulator.
 */
export function createUsageAccumulator(): UsageAccumulator {
  return {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    requestCount: 0,
  };
}

/**
 * Adds usage to accumulator.
 */
export function accumulateUsage(
  accumulator: UsageAccumulator,
  usage: Usage,
  cost: CostEstimate
): UsageAccumulator {
  return {
    totalInputTokens: accumulator.totalInputTokens + usage.inputTokens,
    totalOutputTokens: accumulator.totalOutputTokens + usage.outputTokens,
    totalCost: roundTo6Decimals(accumulator.totalCost + cost.totalCost),
    requestCount: accumulator.requestCount + 1,
  };
}

/**
 * Gets average tokens per request.
 */
export function averageTokensPerRequest(accumulator: UsageAccumulator): number {
  if (accumulator.requestCount === 0) return 0;

  const totalTokens = accumulator.totalInputTokens + accumulator.totalOutputTokens;
  return Math.round(totalTokens / accumulator.requestCount);
}
