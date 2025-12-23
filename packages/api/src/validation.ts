/**
 * Validation
 *
 * Request validation with detailed error messages.
 * Type-safe. Composable. No external dependencies.
 */

import { AlfredError, ErrorCodes, missingFieldError, invalidTypeError } from './errors';
import type { AlfredMode } from '@alfred/core';

// ============================================================================
// VALIDATION RESULT
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// VALIDATORS
// ============================================================================

export type Validator<T> = (value: unknown, field: string) => ValidationResult<T>;

/**
 * String validator with optional constraints.
 */
export function string(options: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  optional?: boolean;
} = {}): Validator<string> {
  return (value, field) => {
    if (value === undefined || value === null) {
      if (options.optional) {
        return { success: true, data: undefined as unknown as string, errors: [] };
      }
      return {
        success: false,
        errors: [{ field, message: `${field} is required`, code: ErrorCodes.MISSING_REQUIRED_FIELD }],
      };
    }

    if (typeof value !== 'string') {
      return {
        success: false,
        errors: [{ field, message: `${field} must be a string`, code: ErrorCodes.INVALID_FIELD_TYPE }],
      };
    }

    const errors: ValidationError[] = [];

    if (options.minLength !== undefined && value.length < options.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${options.minLength} characters`,
        code: ErrorCodes.FIELD_OUT_OF_RANGE,
      });
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      errors.push({
        field,
        message: `${field} must be at most ${options.maxLength} characters`,
        code: ErrorCodes.FIELD_OUT_OF_RANGE,
      });
    }

    if (options.pattern && !options.pattern.test(value)) {
      errors.push({
        field,
        message: `${field} has invalid format`,
        code: ErrorCodes.VALIDATION_FAILED,
      });
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? value : undefined,
      errors,
    };
  };
}

/**
 * Number validator with optional constraints.
 */
export function number(options: {
  min?: number;
  max?: number;
  integer?: boolean;
  optional?: boolean;
} = {}): Validator<number> {
  return (value, field) => {
    if (value === undefined || value === null) {
      if (options.optional) {
        return { success: true, data: undefined as unknown as number, errors: [] };
      }
      return {
        success: false,
        errors: [{ field, message: `${field} is required`, code: ErrorCodes.MISSING_REQUIRED_FIELD }],
      };
    }

    if (typeof value !== 'number' || isNaN(value)) {
      return {
        success: false,
        errors: [{ field, message: `${field} must be a number`, code: ErrorCodes.INVALID_FIELD_TYPE }],
      };
    }

    const errors: ValidationError[] = [];

    if (options.integer && !Number.isInteger(value)) {
      errors.push({
        field,
        message: `${field} must be an integer`,
        code: ErrorCodes.INVALID_FIELD_TYPE,
      });
    }

    if (options.min !== undefined && value < options.min) {
      errors.push({
        field,
        message: `${field} must be at least ${options.min}`,
        code: ErrorCodes.FIELD_OUT_OF_RANGE,
      });
    }

    if (options.max !== undefined && value > options.max) {
      errors.push({
        field,
        message: `${field} must be at most ${options.max}`,
        code: ErrorCodes.FIELD_OUT_OF_RANGE,
      });
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? value : undefined,
      errors,
    };
  };
}

/**
 * Boolean validator.
 */
export function boolean(options: { optional?: boolean } = {}): Validator<boolean> {
  return (value, field) => {
    if (value === undefined || value === null) {
      if (options.optional) {
        return { success: true, data: undefined as unknown as boolean, errors: [] };
      }
      return {
        success: false,
        errors: [{ field, message: `${field} is required`, code: ErrorCodes.MISSING_REQUIRED_FIELD }],
      };
    }

    if (typeof value !== 'boolean') {
      return {
        success: false,
        errors: [{ field, message: `${field} must be a boolean`, code: ErrorCodes.INVALID_FIELD_TYPE }],
      };
    }

    return { success: true, data: value, errors: [] };
  };
}

/**
 * Enum validator.
 */
export function oneOf<T extends string>(
  allowed: readonly T[],
  options: { optional?: boolean } = {}
): Validator<T> {
  return (value, field) => {
    if (value === undefined || value === null) {
      if (options.optional) {
        return { success: true, data: undefined as unknown as T, errors: [] };
      }
      return {
        success: false,
        errors: [{ field, message: `${field} is required`, code: ErrorCodes.MISSING_REQUIRED_FIELD }],
      };
    }

    if (!allowed.includes(value as T)) {
      return {
        success: false,
        errors: [{
          field,
          message: `${field} must be one of: ${allowed.join(', ')}`,
          code: ErrorCodes.INVALID_ENUM_VALUE,
        }],
      };
    }

    return { success: true, data: value as T, errors: [] };
  };
}

/**
 * Array validator.
 */
export function array<T>(
  itemValidator: Validator<T>,
  options: { minLength?: number; maxLength?: number; optional?: boolean } = {}
): Validator<T[]> {
  return (value, field) => {
    if (value === undefined || value === null) {
      if (options.optional) {
        return { success: true, data: undefined as unknown as T[], errors: [] };
      }
      return {
        success: false,
        errors: [{ field, message: `${field} is required`, code: ErrorCodes.MISSING_REQUIRED_FIELD }],
      };
    }

    if (!Array.isArray(value)) {
      return {
        success: false,
        errors: [{ field, message: `${field} must be an array`, code: ErrorCodes.INVALID_FIELD_TYPE }],
      };
    }

    const errors: ValidationError[] = [];
    const validatedItems: T[] = [];

    if (options.minLength !== undefined && value.length < options.minLength) {
      errors.push({
        field,
        message: `${field} must have at least ${options.minLength} items`,
        code: ErrorCodes.FIELD_OUT_OF_RANGE,
      });
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      errors.push({
        field,
        message: `${field} must have at most ${options.maxLength} items`,
        code: ErrorCodes.FIELD_OUT_OF_RANGE,
      });
    }

    for (let i = 0; i < value.length; i++) {
      const result = itemValidator(value[i], `${field}[${i}]`);
      if (!result.success) {
        errors.push(...result.errors);
      } else if (result.data !== undefined) {
        validatedItems.push(result.data);
      }
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? validatedItems : undefined,
      errors,
    };
  };
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

export type Schema<T> = {
  [K in keyof T]: Validator<T[K]>;
};

/**
 * Validates an object against a schema.
 */
export function validate<T extends Record<string, unknown>>(
  data: unknown,
  schema: Schema<T>
): ValidationResult<T> {
  if (typeof data !== 'object' || data === null) {
    return {
      success: false,
      errors: [{ field: 'root', message: 'Request body must be an object', code: ErrorCodes.INVALID_REQUEST_FORMAT }],
    };
  }

  const errors: ValidationError[] = [];
  const validated: Partial<T> = {};
  const obj = data as Record<string, unknown>;

  for (const [field, validator] of Object.entries(schema)) {
    const result = (validator as Validator<unknown>)(obj[field], field);
    if (!result.success) {
      errors.push(...result.errors);
    } else if (result.data !== undefined) {
      validated[field as keyof T] = result.data as T[keyof T];
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? (validated as T) : undefined,
    errors,
  };
}

/**
 * Validates and throws on failure.
 */
export function validateOrThrow<T extends Record<string, unknown>>(
  data: unknown,
  schema: Schema<T>
): T {
  const result = validate(data, schema);

  if (!result.success) {
    throw new AlfredError({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Validation failed',
      details: { errors: result.errors },
      recoverable: true,
    });
  }

  return result.data!;
}

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const ALFRED_MODES = ['builder', 'mentor', 'reviewer'] as const;
export const QUALITY_TIERS = ['gold', 'silver', 'bronze'] as const;
export const PROJECT_TYPES = ['web_app', 'dashboard', 'api', 'library', 'other'] as const;

export const modeValidator = oneOf(ALFRED_MODES);
export const optionalModeValidator = oneOf(ALFRED_MODES, { optional: true });
export const qualityTierValidator = oneOf(QUALITY_TIERS);
export const projectTypeValidator = oneOf(PROJECT_TYPES);

export const conversationIdValidator = string({ minLength: 1, maxLength: 100 });
export const userIdValidator = string({ minLength: 1, maxLength: 100, optional: true });
export const contentValidator = string({ minLength: 1, maxLength: 100000 });
