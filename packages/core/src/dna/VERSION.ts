/**
 * ALFRED DNA VERSION MANIFEST
 * 
 * This file is the source of truth for Alfred's cognitive versioning.
 * Every change to Alfred's personality, behavior, or capabilities
 * must be reflected here.
 * 
 * Versioning follows: MAJOR.MINOR.PATCH
 * - MAJOR: Fundamental identity changes
 * - MINOR: New capabilities or mode changes
 * - PATCH: Refinements and fixes
 */

export const DNA_VERSION = '2.0.0' as const;

export const DNA_CODENAME = 'Architect' as const;

export const DNA_CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: '2.0.0',
    date: '2024-12-26',
    codename: 'Architect',
    changes: [
      'Complete DNA restructure into modular architecture',
      'Explicit mode system with deterministic switching',
      'Constitutional output contracts',
      'Skill-based adaptation layer',
      'Memory injection protocol',
    ],
    breaking: [
      'DNA is no longer a single file',
      'Prompt building is now declarative',
    ],
  },
  {
    version: '1.0.0',
    date: '2024-12-25',
    codename: 'Genesis',
    changes: [
      'Initial DNA definition',
      'Core identity established',
      'Basic mode support',
    ],
    breaking: [],
  },
] as const;

export interface ChangelogEntry {
  readonly version: string;
  readonly date: string;
  readonly codename: string;
  readonly changes: readonly string[];
  readonly breaking: readonly string[];
}

/**
 * Compatibility check for DNA versions
 */
export function isCompatible(requiredVersion: string): boolean {
  const [reqMajor] = requiredVersion.split('.').map(Number);
  const [curMajor] = DNA_VERSION.split('.').map(Number);
  return (curMajor ?? 0) >= (reqMajor ?? 0);
}

/**
 * Get DNA fingerprint for cache invalidation
 */
export function getDNAFingerprint(): string {
  return `alfred-dna-${DNA_VERSION}-${DNA_CODENAME.toLowerCase()}`;
}