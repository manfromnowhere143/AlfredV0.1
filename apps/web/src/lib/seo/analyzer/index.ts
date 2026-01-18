/**
 * SEO Analyzer - Main Orchestrator
 *
 * Runs all SEO rules and calculates scores.
 */

import type { SEORule, SEOAnalysisContext, SEOAnalysisResult, SEOFile, SEOConfigInput } from '../types';
import { technicalRules } from './rules/technical';
import { contentRules } from './rules/content';
import { onPageRules } from './rules/on-page';
import { uxRules } from './rules/ux';
import { schemaRules } from './rules/schema';
import { calculateScores } from './scorer';

// Combine all rules
export const allRules: SEORule[] = [
  ...technicalRules,
  ...contentRules,
  ...onPageRules,
  ...uxRules,
  ...schemaRules,
];

/**
 * Convert raw files to SEO files with type detection
 */
function prepareFiles(files: Array<{ path: string; content: string }>): SEOFile[] {
  return files.map(file => {
    const path = file.path.toLowerCase();
    let type: SEOFile['type'] = 'other';

    if (path.endsWith('.html') || path.endsWith('.htm')) {
      type = 'html';
    } else if (path.endsWith('.css')) {
      type = 'css';
    } else if (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.tsx')) {
      type = 'js';
    } else if (path.endsWith('.json')) {
      type = 'json';
    } else if (path.endsWith('.xml')) {
      type = 'xml';
    } else if (path.endsWith('.txt')) {
      type = 'txt';
    }

    return {
      path: file.path,
      content: file.content,
      type,
      size: new TextEncoder().encode(file.content).length,
    };
  });
}

/**
 * Extract HTML metadata from content
 */
function extractHtmlMetadata(html: string) {
  const getMatch = (regex: RegExp) => html.match(regex)?.[1];

  // DOCTYPE
  const doctype = html.match(/<!DOCTYPE[^>]*>/i)?.[0];

  // HTML lang
  const lang = getMatch(/<html[^>]*\slang=["']([^"']+)["']/i);

  // Meta charset
  const charset = getMatch(/<meta\s+charset=["']([^"']+)["']/i) ||
    getMatch(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*charset=([^"'\s;]+)/i);

  // Viewport
  const viewport = getMatch(/<meta\s+name=["']viewport["'][^>]*content=["']([^"']+)["']/i);

  // Title
  const title = getMatch(/<title[^>]*>([^<]*)<\/title>/i)?.trim();

  // Description
  const description = getMatch(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);

  // Canonical
  const canonical = getMatch(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);

  // Robots
  const robots = getMatch(/<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["']/i);

  // Open Graph
  const ogTags: Record<string, string> = {};
  const ogMatches = html.matchAll(/<meta\s+property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["']/gi);
  for (const match of ogMatches) {
    ogTags[match[1]] = match[2];
  }

  // Twitter
  const twitterTags: Record<string, string> = {};
  const twitterMatches = html.matchAll(/<meta\s+name=["']twitter:([^"']+)["'][^>]*content=["']([^"']*)["']/gi);
  for (const match of twitterMatches) {
    twitterTags[match[1]] = match[2];
  }

  // Headings
  const headings: Array<{ level: number; text: string }> = [];
  const headingMatches = html.matchAll(/<h([1-6])[^>]*>([^<]*)<\/h\1>/gi);
  for (const match of headingMatches) {
    headings.push({
      level: parseInt(match[1], 10),
      text: match[2].trim(),
    });
  }

  // Images
  const images: Array<{ src: string; alt?: string; width?: number; height?: number }> = [];
  const imgMatches = html.matchAll(/<img[^>]*>/gi);
  for (const match of imgMatches) {
    const imgTag = match[0];
    const src = getMatch(new RegExp(imgTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/src=["'][^"']+["']/, 'src=["\'](.*?)["\']')));
    const alt = imgTag.match(/alt=["']([^"']*)["']/i)?.[1];
    const width = imgTag.match(/width=["']?(\d+)/i)?.[1];
    const height = imgTag.match(/height=["']?(\d+)/i)?.[1];

    images.push({
      src: src || imgTag.match(/src=["']([^"']+)["']/i)?.[1] || '',
      alt,
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
    });
  }

  // Links
  const links: Array<{ href: string; text: string; rel?: string; isExternal: boolean }> = [];
  const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi);
  for (const match of linkMatches) {
    const href = match[1];
    const text = match[2].trim();
    const fullTag = match[0];
    const rel = fullTag.match(/rel=["']([^"']+)["']/i)?.[1];

    links.push({
      href,
      text,
      rel,
      isExternal: /^https?:\/\//i.test(href),
    });
  }

  return {
    doctype,
    lang,
    charset,
    viewport,
    title,
    titleLength: title?.length,
    description,
    descriptionLength: description?.length,
    canonical,
    robots,
    ogTags: Object.keys(ogTags).length > 0 ? ogTags : undefined,
    twitterTags: Object.keys(twitterTags).length > 0 ? twitterTags : undefined,
    headings: headings.length > 0 ? headings : undefined,
    images: images.length > 0 ? images : undefined,
    links: links.length > 0 ? links : undefined,
  };
}

/**
 * Analyze files for SEO issues
 */
export async function analyzeSEO(
  files: Array<{ path: string; content: string }>,
  options: {
    projectName: string;
    deployUrl?: string;
    seoConfig?: SEOConfigInput;
    focusKeywords?: string[];
  }
): Promise<SEOAnalysisResult> {
  const seoFiles = prepareFiles(files);
  const htmlFiles = seoFiles.filter(f => f.type === 'html');

  // Find index.html
  const indexHtml = htmlFiles.find(f =>
    f.path === 'index.html' ||
    f.path === '/index.html' ||
    f.path.endsWith('/index.html')
  ) || htmlFiles[0];

  // Extract HTML metadata
  const htmlMetadata = indexHtml ? extractHtmlMetadata(indexHtml.content) : undefined;

  // Build context
  const context: SEOAnalysisContext = {
    files: seoFiles,
    htmlFiles,
    indexHtml,
    html: htmlMetadata,
    projectName: options.projectName,
    deployUrl: options.deployUrl,
    seoConfig: options.seoConfig,
    focusKeywords: options.focusKeywords || options.seoConfig?.focusKeywords,
    secondaryKeywords: options.seoConfig?.secondaryKeywords,
  };

  // Run all rules
  const results = await Promise.all(
    allRules.map(async (rule) => {
      try {
        const result = await rule.check(context);
        return {
          ...result,
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          weight: rule.weight,
        };
      } catch (error) {
        console.error(`[SEO] Rule ${rule.id} failed:`, error);
        return {
          passed: true,
          severity: 'info' as const,
          message: `Rule check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          weight: rule.weight,
        };
      }
    })
  );

  // Calculate scores
  return calculateScores(results);
}

/**
 * Quick analysis for pre-deploy check
 */
export async function quickAnalysis(
  files: Array<{ path: string; content: string }>,
  projectName: string,
  deployUrl?: string
): Promise<{ score: number; grade: string; criticalIssues: number; autoFixable: number }> {
  const result = await analyzeSEO(files, { projectName, deployUrl });

  return {
    score: result.score,
    grade: result.grade,
    criticalIssues: result.criticalCount,
    autoFixable: result.autoFixableCount,
  };
}

export { calculateScores, getGrade, getGradeColor, getSeverityColor } from './scorer';
