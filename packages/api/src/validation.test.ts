/**
 * Validation Tests
 *
 * Verifies request validation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  string,
  number,
  boolean,
  oneOf,
  array,
  validate,
  validateOrThrow,
  Schema,
} from './validation';
import { AlfredError } from './errors';

// ============================================================================
// STRING VALIDATOR
// ============================================================================

describe('string validator', () => {
  it('accepts valid string', () => {
    const validator = string();
    const result = validator('hello', 'field');

    expect(result.success).toBe(true);
    expect(result.data).toBe('hello');
  });

  it('rejects non-string', () => {
    const validator = string();
    const result = validator(123, 'field');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('string');
  });

  it('enforces minLength', () => {
    const validator = string({ minLength: 5 });

    expect(validator('hello', 'f').success).toBe(true);
    expect(validator('hi', 'f').success).toBe(false);
  });

  it('enforces maxLength', () => {
    const validator = string({ maxLength: 5 });

    expect(validator('hello', 'f').success).toBe(true);
    expect(validator('hello world', 'f').success).toBe(false);
  });

  it('enforces pattern', () => {
    const validator = string({ pattern: /^[a-z]+$/ });

    expect(validator('hello', 'f').success).toBe(true);
    expect(validator('Hello', 'f').success).toBe(false);
  });

  it('handles optional', () => {
    const required = string();
    const optional = string({ optional: true });

    expect(required(undefined, 'f').success).toBe(false);
    expect(optional(undefined, 'f').success).toBe(true);
  });
});

// ============================================================================
// NUMBER VALIDATOR
// ============================================================================

describe('number validator', () => {
  it('accepts valid number', () => {
    const validator = number();
    const result = validator(42, 'field');

    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
  });

  it('rejects non-number', () => {
    const validator = number();

    expect(validator('42', 'f').success).toBe(false);
    expect(validator(NaN, 'f').success).toBe(false);
  });

  it('enforces min', () => {
    const validator = number({ min: 0 });

    expect(validator(0, 'f').success).toBe(true);
    expect(validator(-1, 'f').success).toBe(false);
  });

  it('enforces max', () => {
    const validator = number({ max: 100 });

    expect(validator(100, 'f').success).toBe(true);
    expect(validator(101, 'f').success).toBe(false);
  });

  it('enforces integer', () => {
    const validator = number({ integer: true });

    expect(validator(42, 'f').success).toBe(true);
    expect(validator(42.5, 'f').success).toBe(false);
  });
});

// ============================================================================
// BOOLEAN VALIDATOR
// ============================================================================

describe('boolean validator', () => {
  it('accepts true', () => {
    const validator = boolean();
    expect(validator(true, 'f').success).toBe(true);
  });

  it('accepts false', () => {
    const validator = boolean();
    expect(validator(false, 'f').success).toBe(true);
  });

  it('rejects non-boolean', () => {
    const validator = boolean();

    expect(validator(1, 'f').success).toBe(false);
    expect(validator('true', 'f').success).toBe(false);
  });
});

// ============================================================================
// ONEOF VALIDATOR
// ============================================================================

describe('oneOf validator', () => {
  const modes = ['builder', 'mentor', 'reviewer'] as const;

  it('accepts allowed value', () => {
    const validator = oneOf(modes);

    expect(validator('builder', 'f').success).toBe(true);
    expect(validator('mentor', 'f').success).toBe(true);
  });

  it('rejects disallowed value', () => {
    const validator = oneOf(modes);
    const result = validator('invalid', 'f');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('builder');
  });
});

// ============================================================================
// ARRAY VALIDATOR
// ============================================================================

describe('array validator', () => {
  it('accepts valid array', () => {
    const validator = array(string());
    const result = validator(['a', 'b', 'c'], 'field');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(['a', 'b', 'c']);
  });

  it('rejects non-array', () => {
    const validator = array(string());

    expect(validator('not array', 'f').success).toBe(false);
  });

  it('validates each item', () => {
    const validator = array(number());
    const result = validator([1, 'two', 3], 'f');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'f[1]')).toBe(true);
  });

  it('enforces minLength', () => {
    const validator = array(string(), { minLength: 2 });

    expect(validator(['a', 'b'], 'f').success).toBe(true);
    expect(validator(['a'], 'f').success).toBe(false);
  });

  it('enforces maxLength', () => {
    const validator = array(string(), { maxLength: 2 });

    expect(validator(['a', 'b'], 'f').success).toBe(true);
    expect(validator(['a', 'b', 'c'], 'f').success).toBe(false);
  });
});

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

describe('validate', () => {
  interface TestData {
    name: string;
    age: number;
    active: boolean;
  }

  const schema: Schema<TestData> = {
    name: string({ minLength: 1 }),
    age: number({ min: 0 }),
    active: boolean(),
  };

  it('validates complete valid object', () => {
    const result = validate({ name: 'John', age: 30, active: true }, schema);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'John', age: 30, active: true });
  });

  it('collects all errors', () => {
    const result = validate({ name: '', age: -1, active: 'yes' }, schema);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects non-object', () => {
    const result = validate(null, schema);

    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('root');
  });
});

describe('validateOrThrow', () => {
  const schema = {
    name: string({ minLength: 1 }),
  };

  it('returns data on success', () => {
    const data = validateOrThrow({ name: 'John' }, schema);

    expect(data).toEqual({ name: 'John' });
  });

  it('throws AlfredError on failure', () => {
    expect(() => validateOrThrow({ name: '' }, schema)).toThrow(AlfredError);
  });

  it('includes errors in thrown exception', () => {
    try {
      validateOrThrow({ name: '' }, schema);
    } catch (error) {
      expect((error as AlfredError).details?.errors).toBeDefined();
    }
  });
});
