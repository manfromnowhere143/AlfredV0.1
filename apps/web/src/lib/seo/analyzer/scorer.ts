/**
 * SEO Analyzer - Scorer
 *
 * Calculates SEO scores based on rule results.
 */

import type { SEOAnalysisResult, SEOIssue, SEOCategory, SEOGrade, SEORuleResult } from '../types';
import { CATEGORY_WEIGHTS, GRADE_THRESHOLDS, SEVERITY_WEIGHTS } from '../constants';

interface RuleResultWithMeta extends SEORuleResult {
  ruleId: string;
  ruleName: string;
  category: SEOCategory;
  weight: number;
}

/**
 * Calculate scores from rule results
 */
export function calculateScores(results: RuleResultWithMeta[]): SEOAnalysisResult {
  const startTime = Date.now();

  // Group results by category
  const byCategory = new Map<SEOCategory, RuleResultWithMeta[]>();
  for (const category of ['technical', 'content', 'on_page', 'ux', 'schema'] as SEOCategory[]) {
    byCategory.set(category, []);
  }

  for (const result of results) {
    const categoryResults = byCategory.get(result.category)!;
    categoryResults.push(result);
  }

  // Calculate category scores
  const categoryScores: Record<SEOCategory, number> = {
    technical: 0,
    content: 0,
    on_page: 0,
    ux: 0,
    schema: 0,
  };

  for (const [category, categoryResults] of byCategory.entries()) {
    if (categoryResults.length === 0) {
      categoryScores[category] = 100; // No rules = full score
      continue;
    }

    const totalWeight = categoryResults.reduce((sum, r) => sum + r.weight, 0);
    let weightedScore = 0;

    for (const result of categoryResults) {
      if (result.passed) {
        // Full weight contribution for passed rules
        weightedScore += result.weight;
      } else {
        // Partial score based on severity
        const severityPenalty = SEVERITY_WEIGHTS[result.severity] || 0;
        // Failed rules contribute (1 - penalty) of their weight
        weightedScore += result.weight * (1 - severityPenalty);
      }
    }

    // Normalize to 0-100
    categoryScores[category] = Math.round((weightedScore / totalWeight) * 100);
  }

  // Calculate overall score using category weights
  let overallScore = 0;
  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    overallScore += categoryScores[category as SEOCategory] * weight;
  }
  overallScore = Math.round(overallScore);

  // Determine grade
  const grade = getGrade(overallScore);

  // Collect issues (failed rules)
  const issues: SEOIssue[] = [];
  const issuesByCategory: Record<SEOCategory, SEOIssue[]> = {
    technical: [],
    content: [],
    on_page: [],
    ux: [],
    schema: [],
  };
  const issueBySeverity: Record<string, SEOIssue[]> = {
    critical: [],
    warning: [],
    info: [],
    success: [],
  };

  for (const result of results) {
    if (!result.passed) {
      const issue: SEOIssue = {
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        category: result.category,
        severity: result.severity,
        message: result.message,
        description: result.description,
        suggestion: result.suggestion,
        currentValue: result.currentValue,
        expectedValue: result.expectedValue,
        filePath: result.filePath,
        lineNumber: result.lineNumber,
        selector: result.selector,
        element: result.element,
        isAutoFixable: result.isAutoFixable || false,
        autoFix: result.autoFix,
        learnMoreUrl: result.learnMoreUrl,
        scoreImpact: Math.round(result.weight * SEVERITY_WEIGHTS[result.severity] * 100),
        metadata: result.metadata,
      };

      issues.push(issue);
      issuesByCategory[result.category].push(issue);
      issueBySeverity[result.severity].push(issue);
    }
  }

  // Sort issues by score impact (highest first)
  issues.sort((a, b) => b.scoreImpact - a.scoreImpact);

  // Count stats
  const passedChecks = results.filter(r => r.passed).length;
  const failedChecks = results.length - passedChecks;
  const autoFixableCount = issues.filter(i => i.isAutoFixable).length;

  return {
    score: overallScore,
    grade,
    categoryScores,
    issues,
    issuesByCategory,
    issueBySeverity: issueBySeverity as Record<'critical' | 'warning' | 'info' | 'success', SEOIssue[]>,
    totalChecks: results.length,
    passedChecks,
    failedChecks,
    criticalCount: issueBySeverity.critical.length,
    warningCount: issueBySeverity.warning.length,
    infoCount: issueBySeverity.info.length,
    autoFixableCount,
    autoFixes: issues.filter(i => i.autoFix).map(i => i.autoFix!),
    analyzedAt: new Date(),
    analysisTime: Date.now() - startTime,
    version: '1.0.0',
  };
}

/**
 * Get letter grade from score
 */
export function getGrade(score: number): SEOGrade {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.min) {
      return threshold.grade;
    }
  }
  return 'F';
}

/**
 * Get color for grade
 */
export function getGradeColor(grade: SEOGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22c55e'; // green-500
    case 'B':
      return '#84cc16'; // lime-500
    case 'C':
      return '#eab308'; // yellow-500
    case 'D':
      return '#f97316'; // orange-500
    case 'F':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get color for severity
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#ef4444'; // red-500
    case 'warning':
      return '#f97316'; // orange-500
    case 'info':
      return '#3b82f6'; // blue-500
    case 'success':
      return '#22c55e'; // green-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Format score as percentage string
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
