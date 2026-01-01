/**
 * Transformer Module
 *
 * Main entry point for artifact transformation.
 * Converts single-file artifacts into deployable project structures.
 */

import type { Artifact, GeneratedProject, ParsedArtifact } from '../types';
import { parseArtifact } from './parser';
import { generateProject } from './project-generator';

// ============================================================================
// MAIN TRANSFORM FUNCTION
// ============================================================================

export function transformArtifact(
  artifact: Artifact,
  projectName: string
): GeneratedProject {
  const parsed = parseArtifact(artifact);
  const project = generateProject(parsed, projectName);
  return project;
}

export function analyzeArtifact(artifact: Artifact): ParsedArtifact {
  return parseArtifact(artifact);
}

export function validateArtifact(artifact: Artifact): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!artifact.code || artifact.code.trim().length === 0) {
    errors.push('Artifact code is empty');
  }

  if (!artifact.language) {
    errors.push('Artifact language is not specified');
  }

  const validLanguages = ['jsx', 'tsx', 'html', 'vue', 'svelte'];
  if (artifact.language && !validLanguages.includes(artifact.language)) {
    warnings.push(`Unknown language: ${artifact.language}. Will attempt to parse as JSX.`);
  }

  try {
    const parsed = parseArtifact(artifact);

    if (!parsed.hasDefaultExport) {
      warnings.push('No default export found. Will wrap component automatically.');
    }

    if (!parsed.componentName || parsed.componentName === 'Component') {
      warnings.push('Could not detect component name. Using generic name.');
    }

    if (parsed.type === 'vue') {
      errors.push('Vue components are not yet supported for deployment.');
    }

    if (parsed.type === 'svelte') {
      errors.push('Svelte components are not yet supported for deployment.');
    }
  } catch (e) {
    errors.push(`Failed to parse artifact: ${(e as Error).message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { parseArtifact } from './parser';
export { generateProject, sanitizePackageName } from './project-generator';
export type { ParsedArtifact, GeneratedProject, ProjectFile } from '../types';
