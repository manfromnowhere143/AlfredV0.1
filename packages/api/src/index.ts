/**
 * @alfred/api
 *
 * API layer for Alfred.
 * Typed contracts. Structured errors. Rate limiting.
 *
 * This package provides:
 * - Request/response type contracts
 * - Error taxonomy with codes
 * - Rate limiting (token bucket)
 * - Request validation
 * - Structured logging
 */

export const VERSION = '0.1.0';

export * from './types';
export * from './errors';
export * from './validation';
export * from './rate-limit';
export * from './handlers';
export * from './logger';
