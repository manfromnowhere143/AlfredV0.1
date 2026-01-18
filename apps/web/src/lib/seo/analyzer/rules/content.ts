/**
 * SEO Analyzer - Content Rules (12 checks)
 *
 * Validates content quality, meta tags, and heading structure.
 */

import type { SEORule, SEOAnalysisContext, SEORuleResult } from '../../types';
import { RULE_IDS, THRESHOLDS, LEARN_MORE_URLS } from '../../constants';

/**
 * Check if title exists
 */
const titleExistsRule: SEORule = {
  id: RULE_IDS.CONTENT_TITLE_EXISTS,
  name: 'Title Tag Exists',
  category: 'content',
  description: 'Ensures a title tag is present',
  weight: 0.12,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    if (titleMatch && titleMatch[1].trim()) {
      return {
        passed: true,
        severity: 'success',
        message: 'Title tag is present',
        currentValue: titleMatch[1].trim(),
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: 'Missing or empty title tag',
      description: 'The title tag is one of the most important SEO elements.',
      suggestion: 'Add a descriptive <title> tag in the <head> section',
      isAutoFixable: context.seoConfig?.siteTitle ? true : false,
      autoFix: context.seoConfig?.siteTitle ? {
        type: 'insert',
        filePath: context.indexHtml?.path || 'index.html',
        target: 'head',
        newValue: `<title>${context.seoConfig.siteTitle}</title>\n`,
        description: 'Add title tag',
      } : undefined,
    };
  },
};

/**
 * Check title length
 */
const titleLengthRule: SEORule = {
  id: RULE_IDS.CONTENT_TITLE_LENGTH,
  name: 'Title Length',
  category: 'content',
  description: 'Validates title tag length (50-60 characters optimal)',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    if (!titleMatch || !titleMatch[1].trim()) {
      return {
        passed: false,
        severity: 'info',
        message: 'Cannot check title length - no title found',
      };
    }

    const title = titleMatch[1].trim();
    const length = title.length;

    if (length >= THRESHOLDS.TITLE_OPTIMAL_MIN && length <= THRESHOLDS.TITLE_OPTIMAL_MAX) {
      return {
        passed: true,
        severity: 'success',
        message: `Title length is optimal (${length} characters)`,
        currentValue: `${length} characters`,
        expectedValue: `${THRESHOLDS.TITLE_OPTIMAL_MIN}-${THRESHOLDS.TITLE_OPTIMAL_MAX} characters`,
      };
    }

    if (length < THRESHOLDS.TITLE_MIN_LENGTH) {
      return {
        passed: false,
        severity: 'warning',
        message: `Title is too short (${length} characters)`,
        description: 'Short titles may not fully describe the page content.',
        suggestion: `Aim for ${THRESHOLDS.TITLE_OPTIMAL_MIN}-${THRESHOLDS.TITLE_OPTIMAL_MAX} characters`,
        currentValue: `${length} characters`,
        expectedValue: `${THRESHOLDS.TITLE_MIN_LENGTH}+ characters`,
      };
    }

    if (length > THRESHOLDS.TITLE_MAX_LENGTH) {
      return {
        passed: false,
        severity: 'warning',
        message: `Title is too long (${length} characters)`,
        description: 'Titles over 60 characters may be truncated in search results.',
        suggestion: `Shorten to ${THRESHOLDS.TITLE_MAX_LENGTH} characters or less`,
        currentValue: `${length} characters`,
        expectedValue: `≤${THRESHOLDS.TITLE_MAX_LENGTH} characters`,
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: `Title length is acceptable (${length} characters)`,
      currentValue: `${length} characters`,
    };
  },
};

/**
 * Check title uniqueness (basic check - ensures it's not generic)
 */
const titleUniqueRule: SEORule = {
  id: RULE_IDS.CONTENT_TITLE_UNIQUE,
  name: 'Title Uniqueness',
  category: 'content',
  description: 'Checks if title is unique and not generic',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    if (!titleMatch || !titleMatch[1].trim()) {
      return {
        passed: false,
        severity: 'info',
        message: 'Cannot check title uniqueness - no title found',
      };
    }

    const title = titleMatch[1].trim().toLowerCase();

    // Common generic titles to avoid
    const genericTitles = [
      'home', 'homepage', 'welcome', 'untitled', 'document',
      'page', 'website', 'index', 'new page', 'my website',
      'my site', 'react app', 'vite app', 'vite + react',
    ];

    const isGeneric = genericTitles.some(generic => title === generic || title.includes(generic));

    if (isGeneric) {
      return {
        passed: false,
        severity: 'warning',
        message: 'Title appears to be generic',
        description: 'Generic titles don\'t help users or search engines understand the page.',
        suggestion: 'Create a unique, descriptive title that reflects the page content',
        currentValue: titleMatch[1].trim(),
      };
    }

    return {
      passed: true,
      severity: 'success',
      message: 'Title appears to be unique',
      currentValue: titleMatch[1].trim(),
    };
  },
};

/**
 * Check if meta description exists
 */
const descriptionExistsRule: SEORule = {
  id: RULE_IDS.CONTENT_DESCRIPTION_EXISTS,
  name: 'Meta Description Exists',
  category: 'content',
  description: 'Ensures meta description is present',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);

    if (descMatch && descMatch[1].trim()) {
      return {
        passed: true,
        severity: 'success',
        message: 'Meta description is present',
        currentValue: descMatch[1].trim().slice(0, 60) + '...',
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: 'Missing meta description',
      description: 'Meta descriptions appear in search results and influence click-through rates.',
      suggestion: 'Add a compelling meta description (145-155 characters)',
      isAutoFixable: context.seoConfig?.siteDescription ? true : false,
      autoFix: context.seoConfig?.siteDescription ? {
        type: 'insert',
        filePath: context.indexHtml?.path || 'index.html',
        target: 'head',
        newValue: `<meta name="description" content="${context.seoConfig.siteDescription}">\n`,
        description: 'Add meta description',
      } : undefined,
      learnMoreUrl: LEARN_MORE_URLS.META_DESCRIPTION,
    };
  },
};

/**
 * Check meta description length
 */
const descriptionLengthRule: SEORule = {
  id: RULE_IDS.CONTENT_DESCRIPTION_LENGTH,
  name: 'Meta Description Length',
  category: 'content',
  description: 'Validates meta description length (145-155 characters optimal)',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);

    if (!descMatch || !descMatch[1].trim()) {
      return {
        passed: false,
        severity: 'info',
        message: 'Cannot check description length - no description found',
      };
    }

    const description = descMatch[1].trim();
    const length = description.length;

    if (length >= THRESHOLDS.DESCRIPTION_OPTIMAL_MIN && length <= THRESHOLDS.DESCRIPTION_OPTIMAL_MAX) {
      return {
        passed: true,
        severity: 'success',
        message: `Description length is optimal (${length} characters)`,
        currentValue: `${length} characters`,
      };
    }

    if (length < THRESHOLDS.DESCRIPTION_MIN_LENGTH) {
      return {
        passed: false,
        severity: 'warning',
        message: `Description is too short (${length} characters)`,
        description: 'Short descriptions may not fully convey the page value.',
        suggestion: `Aim for ${THRESHOLDS.DESCRIPTION_OPTIMAL_MIN}-${THRESHOLDS.DESCRIPTION_OPTIMAL_MAX} characters`,
        currentValue: `${length} characters`,
        expectedValue: `${THRESHOLDS.DESCRIPTION_MIN_LENGTH}+ characters`,
      };
    }

    if (length > THRESHOLDS.DESCRIPTION_MAX_LENGTH) {
      return {
        passed: false,
        severity: 'warning',
        message: `Description is too long (${length} characters)`,
        description: 'Descriptions over 160 characters may be truncated in search results.',
        suggestion: `Shorten to ${THRESHOLDS.DESCRIPTION_MAX_LENGTH} characters or less`,
        currentValue: `${length} characters`,
        expectedValue: `≤${THRESHOLDS.DESCRIPTION_MAX_LENGTH} characters`,
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: `Description length is acceptable (${length} characters)`,
      currentValue: `${length} characters`,
    };
  },
};

/**
 * Check if H1 exists
 */
const h1ExistsRule: SEORule = {
  id: RULE_IDS.CONTENT_H1_EXISTS,
  name: 'H1 Tag Exists',
  category: 'content',
  description: 'Ensures an H1 heading is present',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    // Check all HTML files, not just index
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const h1Matches = allHtml.match(/<h1[^>]*>([^<]*)<\/h1>/gi);

    if (h1Matches && h1Matches.length > 0) {
      const firstH1 = h1Matches[0].replace(/<[^>]*>/g, '').trim();
      return {
        passed: true,
        severity: 'success',
        message: 'H1 tag is present',
        currentValue: firstH1.slice(0, 50) + (firstH1.length > 50 ? '...' : ''),
      };
    }

    // Check for JSX h1 (common in React)
    const jsxH1 = context.files.some(f =>
      f.type === 'js' && /<h1[^>]*>/.test(f.content)
    );

    if (jsxH1) {
      return {
        passed: true,
        severity: 'success',
        message: 'H1 tag found in React component',
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: 'No H1 tag found',
      description: 'H1 headings help define the main topic of the page.',
      suggestion: 'Add an H1 heading with your main keyword',
      learnMoreUrl: LEARN_MORE_URLS.HEADING_STRUCTURE,
    };
  },
};

/**
 * Check for single H1
 */
const h1SingleRule: SEORule = {
  id: RULE_IDS.CONTENT_H1_SINGLE,
  name: 'Single H1 Tag',
  category: 'content',
  description: 'Ensures only one H1 heading exists per page',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const h1Matches = allHtml.match(/<h1[^>]*>/gi);
    const count = h1Matches?.length || 0;

    if (count === 0) {
      return {
        passed: false,
        severity: 'info',
        message: 'No H1 found to check for singularity',
      };
    }

    if (count === 1) {
      return {
        passed: true,
        severity: 'success',
        message: 'Page has exactly one H1 tag',
        currentValue: `${count} H1 tag`,
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `Multiple H1 tags found (${count})`,
      description: 'Having multiple H1 tags can confuse search engines about the main topic.',
      suggestion: 'Use only one H1 for the main heading, use H2-H6 for subheadings',
      currentValue: `${count} H1 tags`,
      expectedValue: '1 H1 tag',
    };
  },
};

/**
 * Check H1 length
 */
const h1LengthRule: SEORule = {
  id: RULE_IDS.CONTENT_H1_LENGTH,
  name: 'H1 Length',
  category: 'content',
  description: 'Validates H1 heading length',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const h1Match = allHtml.match(/<h1[^>]*>([^<]*)<\/h1>/i);

    if (!h1Match) {
      return {
        passed: false,
        severity: 'info',
        message: 'Cannot check H1 length - no H1 found',
      };
    }

    const h1Text = h1Match[1].trim();
    const length = h1Text.length;

    if (length >= THRESHOLDS.H1_MIN_LENGTH && length <= THRESHOLDS.H1_MAX_LENGTH) {
      return {
        passed: true,
        severity: 'success',
        message: `H1 length is good (${length} characters)`,
        currentValue: `${length} characters`,
      };
    }

    if (length < THRESHOLDS.H1_MIN_LENGTH) {
      return {
        passed: false,
        severity: 'warning',
        message: `H1 is too short (${length} characters)`,
        suggestion: 'Make H1 more descriptive',
        currentValue: `${length} characters`,
        expectedValue: `${THRESHOLDS.H1_MIN_LENGTH}+ characters`,
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `H1 is too long (${length} characters)`,
      suggestion: `Keep H1 under ${THRESHOLDS.H1_MAX_LENGTH} characters`,
      currentValue: `${length} characters`,
      expectedValue: `≤${THRESHOLDS.H1_MAX_LENGTH} characters`,
    };
  },
};

/**
 * Check heading hierarchy
 */
const headingHierarchyRule: SEORule = {
  id: RULE_IDS.CONTENT_HEADING_HIERARCHY,
  name: 'Heading Hierarchy',
  category: 'content',
  description: 'Validates proper heading structure (H1 > H2 > H3...)',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const headingMatches = allHtml.matchAll(/<h([1-6])[^>]*>/gi);
    const levels: number[] = [];

    for (const match of headingMatches) {
      levels.push(parseInt(match[1], 10));
    }

    if (levels.length === 0) {
      return {
        passed: false,
        severity: 'info',
        message: 'No headings found to check hierarchy',
      };
    }

    // Check for skipped levels
    const issues: string[] = [];

    // Check if starts with H1
    if (levels[0] !== 1) {
      issues.push(`First heading is H${levels[0]}, should start with H1`);
    }

    // Check for skipped levels
    for (let i = 1; i < levels.length; i++) {
      const diff = levels[i] - levels[i - 1];
      if (diff > 1) {
        issues.push(`Heading jumps from H${levels[i - 1]} to H${levels[i]}`);
      }
    }

    if (issues.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'Heading hierarchy is correct',
        currentValue: `H levels used: ${[...new Set(levels)].sort().join(', ')}`,
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `Heading hierarchy issues: ${issues[0]}`,
      description: 'Proper heading hierarchy helps screen readers and SEO.',
      suggestion: 'Use headings in order: H1 > H2 > H3, don\'t skip levels',
      currentValue: issues.join('; '),
      learnMoreUrl: LEARN_MORE_URLS.HEADING_STRUCTURE,
    };
  },
};

/**
 * Check word count
 */
const wordCountRule: SEORule = {
  id: RULE_IDS.CONTENT_WORD_COUNT,
  name: 'Content Word Count',
  category: 'content',
  description: 'Validates content has sufficient word count',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    // Extract text content from HTML
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');

    // Remove tags, scripts, styles
    const textContent = allHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // For single-page apps, content is often in JS
    // So be lenient if word count is low in HTML
    if (wordCount === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'Content appears to be rendered via JavaScript',
        description: 'Word count check not applicable for JS-rendered content.',
      };
    }

    if (wordCount >= THRESHOLDS.OPTIMAL_WORD_COUNT) {
      return {
        passed: true,
        severity: 'success',
        message: `Good content length (${wordCount} words)`,
        currentValue: `${wordCount} words`,
      };
    }

    if (wordCount >= THRESHOLDS.MIN_WORD_COUNT) {
      return {
        passed: true,
        severity: 'info',
        message: `Acceptable content length (${wordCount} words)`,
        currentValue: `${wordCount} words`,
        suggestion: 'Consider adding more content for better rankings',
      };
    }

    // Low word count might be fine for apps
    return {
      passed: true,
      severity: 'info',
      message: `Low word count (${wordCount} words) - may be a web app`,
      currentValue: `${wordCount} words`,
    };
  },
};

/**
 * Check if focus keyword is in title
 */
const keywordInTitleRule: SEORule = {
  id: RULE_IDS.CONTENT_KEYWORD_IN_TITLE,
  name: 'Keyword in Title',
  category: 'content',
  description: 'Checks if focus keyword appears in title',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    if (!context.focusKeywords || context.focusKeywords.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No focus keywords specified',
      };
    }

    const html = context.indexHtml?.content || '';
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    if (!titleMatch) {
      return {
        passed: false,
        severity: 'info',
        message: 'Cannot check keyword in title - no title found',
      };
    }

    const title = titleMatch[1].toLowerCase();
    const foundKeywords = context.focusKeywords.filter(kw =>
      title.includes(kw.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      return {
        passed: true,
        severity: 'success',
        message: `Focus keyword found in title: "${foundKeywords[0]}"`,
        currentValue: foundKeywords.join(', '),
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: 'Focus keyword not found in title',
      description: 'Including your focus keyword in the title helps with rankings.',
      suggestion: `Add "${context.focusKeywords[0]}" to your title`,
      currentValue: titleMatch[1],
      expectedValue: `Title containing "${context.focusKeywords[0]}"`,
    };
  },
};

/**
 * Check if focus keyword is in H1
 */
const keywordInH1Rule: SEORule = {
  id: RULE_IDS.CONTENT_KEYWORD_IN_H1,
  name: 'Keyword in H1',
  category: 'content',
  description: 'Checks if focus keyword appears in H1',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    if (!context.focusKeywords || context.focusKeywords.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No focus keywords specified',
      };
    }

    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const h1Match = allHtml.match(/<h1[^>]*>([^<]*)<\/h1>/i);

    if (!h1Match) {
      return {
        passed: false,
        severity: 'info',
        message: 'Cannot check keyword in H1 - no H1 found',
      };
    }

    const h1Text = h1Match[1].toLowerCase();
    const foundKeywords = context.focusKeywords.filter(kw =>
      h1Text.includes(kw.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      return {
        passed: true,
        severity: 'success',
        message: `Focus keyword found in H1: "${foundKeywords[0]}"`,
        currentValue: foundKeywords.join(', '),
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: 'Focus keyword not found in H1',
      description: 'Including your focus keyword in H1 helps with relevance.',
      suggestion: `Consider adding "${context.focusKeywords[0]}" to your H1`,
      currentValue: h1Match[1],
    };
  },
};

export const contentRules: SEORule[] = [
  titleExistsRule,
  titleLengthRule,
  titleUniqueRule,
  descriptionExistsRule,
  descriptionLengthRule,
  h1ExistsRule,
  h1SingleRule,
  h1LengthRule,
  headingHierarchyRule,
  wordCountRule,
  keywordInTitleRule,
  keywordInH1Rule,
];
