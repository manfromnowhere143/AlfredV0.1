/**
 * ALFRED DNA
 * 
 * Alfred's cognitive constitution.
 * 
 * This module defines WHO Alfred is, HOW Alfred behaves,
 * and WHAT Alfred produces.
 * 
 * Usage:
 * ```ts
 * import { buildSystemPrompt, FACETS, detectMode } from '@alfred/core/dna';
 * 
 * const prompt = buildSystemPrompt({
 *   mode: 'builder',
 *   skillLevel: 'experienced',
 *   context: { project: myProject }
 * });
 * ```
 */

// Version & Metadata
export {
    DNA_VERSION,
    DNA_CODENAME,
    DNA_CHANGELOG,
    isCompatible,
    getDNAFingerprint,
    type ChangelogEntry,
  } from './VERSION';
  
  // Identity
  export { IDENTITY, type Identity } from './identity';
  
  // Philosophy
  export { PHILOSOPHY, compilePhilosophy, type Philosophy } from './philosophy';
  
  // Voice
  export { VOICE, compileVoice, type Voice } from './voice';
  
  // Standards
  export { STANDARDS, compileStandards, type Standards } from './standards';
  
  // Facets (Unified Mind)
  export {
    FACETS,
    FACET_SIGNALS,
    detectFacet,
    getFacetAdjustments,
    compileFacets,
    analyzeConversationFacet,
    type Facet,
    type FacetDefinition,
  } from './facets';
  
  // Skills
  export {
    SKILL_PROFILES,
    SKILL_SIGNALS,
    inferSkillLevel,
    getSkillAdaptation,
    type SkillLevel,
    type SkillProfile,
  } from './skills';
  
  // Boundaries
  export {
    BOUNDARIES,
    UNCERTAINTY_PROTOCOL,
    ERROR_RECOVERY,
    compileBoundaries,
    type Boundary,
  } from './boundaries';
  
  // Output
  export {
    OUTPUT_CONTRACTS,
    STREAMING_RULES,
    validateCodeBlock,
    compileOutputContracts,
    type CodeValidation,
  } from './output';
  
  // Context
  export {
    DEFAULT_CONTEXT,
    CONTEXT_MARKERS,
    compileProjectContext,
    compileMemoryContext,
    compileUserPreferences,
    type SessionContext,
    type ProjectContext,
    type UserContext,
    type MemoryContext,
    type FullContext,
  } from './context';
  
  // Process (Professional Workflow)
  export {
    PROCESS_PHASES,
    DISCOVERY_QUESTIONS,
    PREFERENCE_QUESTIONS,
    SKIP_SIGNALS,
    SKIP_RESPONSE,
    PROCESS_RULES,
    compileProcess,
    detectProjectType,
    isSkipSignal,
    getDiscoveryQuestions,
    type ProcessPhase,
    type PhaseDefinition,
  } from './process';
  
  // Design System
  export {
    COLORS,
    TYPOGRAPHY,
    SPACING,
    BORDERS,
    SHADOWS,
    ANIMATIONS,
    COMPONENTS,
    ANTI_PATTERNS,
    INTERACTION_STATES,
    RESPONSIVE,
    ACCESSIBILITY,
    LAYOUT,
    MOTION,
    compileDesignSystem,
    type DesignSystem,
  } from './designSystem';
  
  // Prompt Builder
  export {
    buildSystemPrompt,
    buildMinimalPrompt,
    compactPrompt,
    estimateTokens,
    SPECIALIZED_PROMPTS,
    DEFAULT_CONFIG,
    type PromptConfig,
  } from './promptBuilder';
  
  // Local imports for helper functions
import { buildSystemPrompt as _buildSystemPrompt } from './promptBuilder';
import { IDENTITY as _IDENTITY } from './identity';
import { FACETS as _FACETS } from './facets';
import { VOICE as _VOICE } from './voice';

/**
 * Quick access to a complete system prompt with defaults
 */
export function getSystemPrompt(): string {
  return _buildSystemPrompt();
}

/**
 * DNA integrity check
 */
export function validateDNA(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check that all required exports exist
  if (!_IDENTITY.declaration) issues.push('Missing identity declaration');
  if (Object.keys(_FACETS).length !== 3) issues.push('Expected 3 facets');
  if (!_VOICE.forbidden.length) issues.push('Missing forbidden phrases');

  return {
    valid: issues.length === 0,
    issues,
  };
}