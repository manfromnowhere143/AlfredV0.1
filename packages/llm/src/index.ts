/**
 * @alfred/llm
 *
 * LLM client for Alfred.
 * Anthropic SDK integration with streaming, prompts, cost tracking.
 *
 * This package provides:
 * - Typed client with retry logic
 * - Streaming with backpressure
 * - Versioned prompt templates
 * - Token counting and cost estimation
 * - Mode-specific system prompts
 */

export const VERSION = '0.1.0';

export * from './types';
export * from './client';
export * from './prompts';
export * from './tokens';
export * from './retry';
export * from './env';
