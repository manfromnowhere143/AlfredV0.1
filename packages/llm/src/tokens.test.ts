/**
 * Token Utility Tests
 *
 * Verifies token counting, cost estimation, and context management.
 */

import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateMessageTokens,
  estimateConversationTokens,
  estimateCost,
  estimateCostBeforeRequest,
  getContextWindow,
  getMaxOutput,
  fitsInContext,
  availableOutputTokens,
  truncateConversation,
  createUsageAccumulator,
  accumulateUsage,
  averageTokensPerRequest,
} from './tokens';
import type { Message, Usage, CostEstimate } from './types';

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens for plain text', () => {
    const text = 'Hello, this is a test message.';
    const tokens = estimateTokens(text);
    // ~30 chars / 4 = ~8 tokens
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(15);
  });

  it('estimates more tokens for code blocks', () => {
    const text = '```typescript\nconst x = 1;\n```';
    const tokens = estimateTokens(text);
    // Code uses ~3 chars per token
    expect(tokens).toBeGreaterThan(5);
  });

  it('handles mixed content', () => {
    const text = 'Here is some code:\n```js\nlet x = 1;\n```\nAnd some text.';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(10);
  });
});

describe('estimateMessageTokens', () => {
  it('estimates tokens for text message', () => {
    const message: Message = {
      role: 'user',
      content: 'Hello, how are you?',
    };
    const tokens = estimateMessageTokens(message);
    expect(tokens).toBeGreaterThan(4); // Base + content
  });

  it('estimates tokens for message with content blocks', () => {
    const message: Message = {
      role: 'user',
      content: [
        { type: 'text', text: 'Here is an image' },
      ],
    };
    const tokens = estimateMessageTokens(message);
    expect(tokens).toBeGreaterThan(4);
  });

  it('adds tokens for images', () => {
    const message: Message = {
      role: 'user',
      content: [
        { type: 'text', text: 'What is this?' },
        {
          type: 'image',
          source: { type: 'base64', mediaType: 'image/png', data: 'abc123' },
        },
      ],
    };
    const tokens = estimateMessageTokens(message);
    expect(tokens).toBeGreaterThan(1000); // Images add ~1000 tokens
  });
});

describe('estimateConversationTokens', () => {
  it('sums system prompt and messages', () => {
    const systemPrompt = 'You are a helpful assistant.';
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    const tokens = estimateConversationTokens(systemPrompt, messages);
    expect(tokens).toBeGreaterThan(10);
  });

  it('handles empty messages', () => {
    const tokens = estimateConversationTokens('System prompt', []);
    expect(tokens).toBeGreaterThan(0);
  });
});

// ============================================================================
// COST ESTIMATION
// ============================================================================

describe('estimateCost', () => {
  it('calculates cost for claude-sonnet-4-20250514', () => {
    const usage: Usage = {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    };

    const cost = estimateCost('claude-sonnet-4-20250514', usage);

    // Input: 1000 / 1M * $3 = $0.003
    // Output: 500 / 1M * $15 = $0.0075
    expect(cost.inputCost).toBeCloseTo(0.003, 4);
    expect(cost.outputCost).toBeCloseTo(0.0075, 4);
    expect(cost.totalCost).toBeCloseTo(0.0105, 4);
    expect(cost.currency).toBe('USD');
  });

  it('calculates cost for claude-3-5-haiku-20241022', () => {
    const usage: Usage = {
      inputTokens: 10000,
      outputTokens: 2000,
      totalTokens: 12000,
    };

    const cost = estimateCost('claude-3-5-haiku-20241022', usage);

    // Input: 10000 / 1M * $0.80 = $0.008
    // Output: 2000 / 1M * $4 = $0.008
    expect(cost.inputCost).toBeCloseTo(0.008, 4);
    expect(cost.outputCost).toBeCloseTo(0.008, 4);
  });
});

describe('estimateCostBeforeRequest', () => {
  it('estimates cost before request', () => {
    const cost = estimateCostBeforeRequest(
      'claude-sonnet-4-20250514',
      1000,
      500
    );

    expect(cost.totalCost).toBeGreaterThan(0);
  });
});

// ============================================================================
// CONTEXT WINDOW
// ============================================================================

describe('getContextWindow', () => {
  it('returns correct window for models', () => {
    expect(getContextWindow('claude-sonnet-4-20250514')).toBe(200000);
    expect(getContextWindow('claude-3-opus-20240229')).toBe(200000);
  });
});

describe('getMaxOutput', () => {
  it('returns correct max output', () => {
    expect(getMaxOutput('claude-sonnet-4-20250514')).toBe(8192);
    expect(getMaxOutput('claude-3-opus-20240229')).toBe(4096);
  });
});

describe('fitsInContext', () => {
  it('returns true for small conversation', () => {
    const fits = fitsInContext(
      'claude-sonnet-4-20250514',
      'Short system prompt',
      [{ role: 'user', content: 'Hello' }]
    );

    expect(fits).toBe(true);
  });

  it('returns false for very large content', () => {
    const hugeContent = 'x'.repeat(1_000_000); // 1M chars
    const fits = fitsInContext(
      'claude-sonnet-4-20250514',
      hugeContent,
      []
    );

    expect(fits).toBe(false);
  });
});

describe('availableOutputTokens', () => {
  it('calculates available output tokens', () => {
    const available = availableOutputTokens(
      'claude-sonnet-4-20250514',
      'Short prompt',
      [{ role: 'user', content: 'Hi' }]
    );

    expect(available).toBeGreaterThan(0);
    expect(available).toBeLessThanOrEqual(8192);
  });
});

// ============================================================================
// TRUNCATION
// ============================================================================

describe('truncateConversation', () => {
  it('returns all messages if they fit', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ];

    const result = truncateConversation(
      'claude-sonnet-4-20250514',
      'System',
      messages
    );

    expect(result.messages).toHaveLength(2);
    expect(result.removedCount).toBe(0);
  });

  it('keeps recent messages when truncating', () => {
    const messages: Message[] = [];
    for (let i = 0; i < 100; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'x'.repeat(5000), // ~1250 tokens each
      });
    }

    const result = truncateConversation(
      'claude-sonnet-4-20250514',
      'System',
      messages,
      4096
    );

    // Should have removed some messages
    expect(result.removedCount).toBeGreaterThanOrEqual(0);
    // Should keep at least 2
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    // Last message should be preserved
    expect(result.messages[result.messages.length - 1]).toBe(messages[messages.length - 1]);
  });
});

// ============================================================================
// USAGE ACCUMULATOR
// ============================================================================

describe('UsageAccumulator', () => {
  it('starts at zero', () => {
    const acc = createUsageAccumulator();

    expect(acc.totalInputTokens).toBe(0);
    expect(acc.totalOutputTokens).toBe(0);
    expect(acc.totalCost).toBe(0);
    expect(acc.requestCount).toBe(0);
  });

  it('accumulates usage', () => {
    let acc = createUsageAccumulator();

    const usage: Usage = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    };
    const cost: CostEstimate = {
      inputCost: 0.001,
      outputCost: 0.002,
      totalCost: 0.003,
      currency: 'USD',
    };

    acc = accumulateUsage(acc, usage, cost);

    expect(acc.totalInputTokens).toBe(100);
    expect(acc.totalOutputTokens).toBe(50);
    expect(acc.totalCost).toBe(0.003);
    expect(acc.requestCount).toBe(1);

    // Add more
    acc = accumulateUsage(acc, usage, cost);

    expect(acc.totalInputTokens).toBe(200);
    expect(acc.requestCount).toBe(2);
  });

  it('calculates average tokens', () => {
    let acc = createUsageAccumulator();

    const usage: Usage = {
      inputTokens: 100,
      outputTokens: 100,
      totalTokens: 200,
    };
    const cost: CostEstimate = {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: 'USD',
    };

    acc = accumulateUsage(acc, usage, cost);
    acc = accumulateUsage(acc, usage, cost);

    expect(averageTokensPerRequest(acc)).toBe(200);
  });

  it('returns 0 average for no requests', () => {
    const acc = createUsageAccumulator();
    expect(averageTokensPerRequest(acc)).toBe(0);
  });
});
