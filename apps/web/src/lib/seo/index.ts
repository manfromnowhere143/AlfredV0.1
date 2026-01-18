/**
 * Alfred SEO Agent - Enterprise-Level SEO System
 *
 * Zero-knowledge SEO that works automatically:
 * - AI-powered meta generation
 * - Auto-detected Schema.org markup
 * - Real-time SEO scoring (50+ checks)
 * - One-click auto-fix
 * - Pre-deploy optimization
 */

// Types
export type {
  SEOSeverity,
  SEOCategory,
  SEOGrade,
  SEORule,
  SEORuleResult,
  SEOAutoFix,
  SEOAnalysisContext,
  SEOFile,
  SEOAnalysisResult,
  SEOIssue,
  SEOConfigInput,
  GeneratedMeta,
  GeneratedAltText,
  GeneratedSchema,
  GeneratedSitemap,
  GeneratedRobotsTxt,
  HTMLEnhancement,
  AnalyzeRequest,
  AnalyzeResponse,
  GenerateMetaRequest,
  GenerateMetaResponse,
  GenerateAltTextRequest,
  GenerateAltTextResponse,
  DetectSchemaRequest,
  DetectSchemaResponse,
  PreDeployAnalysis,
  AutoFixResult,
} from './types';

// Constants
export {
  CATEGORY_WEIGHTS,
  GRADE_THRESHOLDS,
  SEVERITY_WEIGHTS,
  THRESHOLDS,
  HTML_TEMPLATES,
  SCHEMA_ORG_TYPES,
  SCHEMA_TEMPLATES,
  ROBOTS_TXT_TEMPLATE,
  SITEMAP_XML_TEMPLATE,
  RULE_IDS,
  LEARN_MORE_URLS,
  AI_PROMPTS,
  SEO_VERSION,
} from './constants';

// Analyzer
export {
  analyzeSEO,
  quickAnalysis,
  allRules,
  calculateScores,
  getGrade,
  getGradeColor,
  getSeverityColor,
} from './analyzer';

// Generators
export { generateMetaTags, validateMeta } from './generator/meta-tags';
export { generateAltText, batchGenerateAltText, validateAltText } from './generator/alt-text';
export {
  detectAndGenerateSchema,
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  schemaToScript,
  validateSchema,
} from './generator/schema-org';
export { generateSitemap, generateSitemapFromFiles, validateSitemap } from './generator/sitemap';
export { generateRobotsTxt, robotsPresets, parseRobotsTxt, validateRobotsTxt } from './generator/robots';

// Transformer
export {
  enhanceHtml,
  applyAutoFixes,
  generateEnhancedIndexHtml,
} from './transformer/html-enhancer';

// Utility functions
import { getGrade, getGradeColor, getSeverityColor } from './analyzer';
import type { SEOAnalysisResult, SEOIssue } from './types';

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return `${score}%`;
}

/**
 * Get score description
 */
export function getScoreDescription(score: number): string {
  if (score >= 95) return 'Excellent SEO - Ready to deploy';
  if (score >= 90) return 'Great SEO - Minor improvements possible';
  if (score >= 75) return 'Good SEO - Some issues to address';
  if (score >= 60) return 'Fair SEO - Multiple issues found';
  if (score >= 50) return 'Poor SEO - Significant improvements needed';
  return 'Critical SEO issues - Not recommended to deploy';
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    technical: 'Technical',
    content: 'Content',
    on_page: 'On-Page',
    ux: 'UX & Accessibility',
    schema: 'Structured Data',
  };
  return names[category] || category;
}

/**
 * Get severity display name
 */
export function getSeverityDisplayName(severity: string): string {
  const names: Record<string, string> = {
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    success: 'Passed',
  };
  return names[severity] || severity;
}

/**
 * Get top issues by score impact
 */
export function getTopIssues(result: SEOAnalysisResult, limit = 5): SEOIssue[] {
  return result.issues
    .sort((a, b) => b.scoreImpact - a.scoreImpact)
    .slice(0, limit);
}

/**
 * Get auto-fixable issues
 */
export function getAutoFixableIssues(result: SEOAnalysisResult): SEOIssue[] {
  return result.issues.filter(i => i.isAutoFixable);
}

/**
 * Calculate potential score after auto-fix
 */
export function calculatePotentialScore(result: SEOAnalysisResult): number {
  const autoFixableImpact = getAutoFixableIssues(result)
    .reduce((sum, issue) => sum + issue.scoreImpact, 0);

  return Math.min(100, result.score + autoFixableImpact);
}

/**
 * Generate SEO summary for display
 */
export function generateSEOSummary(result: SEOAnalysisResult): {
  score: number;
  grade: string;
  gradeColor: string;
  description: string;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passedCount: number;
  autoFixCount: number;
  topIssues: string[];
} {
  return {
    score: result.score,
    grade: result.grade,
    gradeColor: getGradeColor(result.grade),
    description: getScoreDescription(result.score),
    criticalCount: result.criticalCount,
    warningCount: result.warningCount,
    infoCount: result.infoCount,
    passedCount: result.passedChecks,
    autoFixCount: result.autoFixableCount,
    topIssues: getTopIssues(result, 3).map(i => i.message),
  };
}
