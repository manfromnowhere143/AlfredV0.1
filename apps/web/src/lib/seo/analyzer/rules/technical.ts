/**
 * SEO Analyzer - Technical Rules (12 checks)
 *
 * Validates fundamental HTML structure and technical SEO requirements.
 */

import type { SEORule, SEOAnalysisContext, SEORuleResult } from '../../types';
import { RULE_IDS, LEARN_MORE_URLS } from '../../constants';

/**
 * Check for valid DOCTYPE declaration
 */
const doctypeRule: SEORule = {
  id: RULE_IDS.TECH_DOCTYPE,
  name: 'DOCTYPE Declaration',
  category: 'technical',
  description: 'Ensures HTML5 DOCTYPE is present',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const hasDoctype = /<!DOCTYPE\s+html\s*>/i.test(html);

    if (hasDoctype) {
      return {
        passed: true,
        severity: 'success',
        message: 'Valid HTML5 DOCTYPE found',
        currentValue: '<!DOCTYPE html>',
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: 'Missing or invalid DOCTYPE declaration',
      description: 'DOCTYPE tells browsers how to render the page correctly.',
      suggestion: 'Add <!DOCTYPE html> as the first line of your HTML file',
      expectedValue: '<!DOCTYPE html>',
      isAutoFixable: true,
      autoFix: {
        type: 'insert',
        filePath: context.indexHtml?.path || 'index.html',
        newValue: '<!DOCTYPE html>\n',
        description: 'Add HTML5 DOCTYPE declaration',
      },
      learnMoreUrl: LEARN_MORE_URLS.DOCTYPE,
    };
  },
};

/**
 * Check for lang attribute on html element
 */
const langRule: SEORule = {
  id: RULE_IDS.TECH_LANG,
  name: 'HTML Lang Attribute',
  category: 'technical',
  description: 'Ensures lang attribute is present on html element',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const langMatch = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);

    if (langMatch) {
      const lang = langMatch[1];
      // Validate lang code format (basic check)
      const isValidFormat = /^[a-z]{2}(-[A-Z]{2})?$/i.test(lang);

      if (isValidFormat) {
        return {
          passed: true,
          severity: 'success',
          message: `Valid lang attribute found: ${lang}`,
          currentValue: lang,
        };
      }

      return {
        passed: false,
        severity: 'warning',
        message: `Invalid lang attribute format: ${lang}`,
        description: 'Lang attribute should use valid BCP 47 language tags.',
        suggestion: 'Use format like "en", "en-US", or "es"',
        currentValue: lang,
        expectedValue: 'en',
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: 'Missing lang attribute on html element',
      description: 'The lang attribute helps screen readers and search engines understand the page language.',
      suggestion: 'Add lang="en" (or appropriate language) to your <html> element',
      expectedValue: '<html lang="en">',
      isAutoFixable: true,
      autoFix: {
        type: 'attribute',
        filePath: context.indexHtml?.path || 'index.html',
        target: 'html',
        newValue: 'lang="en"',
        description: 'Add lang attribute to html element',
      },
      learnMoreUrl: LEARN_MORE_URLS.LANG,
    };
  },
};

/**
 * Check for charset meta tag
 */
const charsetRule: SEORule = {
  id: RULE_IDS.TECH_CHARSET,
  name: 'Character Encoding',
  category: 'technical',
  description: 'Ensures UTF-8 charset is declared',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const charsetMatch = html.match(/<meta\s+charset=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*charset=([^"'\s;]+)/i);

    if (charsetMatch) {
      const charset = charsetMatch[1].toLowerCase();
      if (charset === 'utf-8') {
        return {
          passed: true,
          severity: 'success',
          message: 'UTF-8 charset declared correctly',
          currentValue: 'UTF-8',
        };
      }

      return {
        passed: false,
        severity: 'warning',
        message: `Non-standard charset detected: ${charset}`,
        suggestion: 'Use UTF-8 for maximum compatibility',
        currentValue: charset,
        expectedValue: 'UTF-8',
        isAutoFixable: true,
        autoFix: {
          type: 'replace',
          filePath: context.indexHtml?.path || 'index.html',
          oldValue: charsetMatch[0],
          newValue: '<meta charset="UTF-8">',
          description: 'Change charset to UTF-8',
        },
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: 'Missing charset declaration',
      description: 'Charset declaration prevents encoding issues with special characters.',
      suggestion: 'Add <meta charset="UTF-8"> as the first element in <head>',
      expectedValue: '<meta charset="UTF-8">',
      isAutoFixable: true,
      autoFix: {
        type: 'insert',
        filePath: context.indexHtml?.path || 'index.html',
        target: 'head',
        newValue: '<meta charset="UTF-8">\n',
        description: 'Add UTF-8 charset meta tag',
      },
    };
  },
};

/**
 * Check for viewport meta tag
 */
const viewportRule: SEORule = {
  id: RULE_IDS.TECH_VIEWPORT,
  name: 'Viewport Meta Tag',
  category: 'technical',
  description: 'Ensures mobile viewport is configured',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const viewportMatch = html.match(/<meta\s+name=["']viewport["'][^>]*content=["']([^"']+)["']/i);

    if (viewportMatch) {
      const content = viewportMatch[1];
      const hasWidth = /width=/i.test(content);
      const hasInitialScale = /initial-scale=/i.test(content);

      if (hasWidth && hasInitialScale) {
        return {
          passed: true,
          severity: 'success',
          message: 'Viewport meta tag configured correctly',
          currentValue: content,
        };
      }

      return {
        passed: false,
        severity: 'warning',
        message: 'Viewport meta tag is incomplete',
        description: 'A complete viewport declaration ensures proper mobile rendering.',
        suggestion: 'Use "width=device-width, initial-scale=1.0"',
        currentValue: content,
        expectedValue: 'width=device-width, initial-scale=1.0',
        isAutoFixable: true,
        autoFix: {
          type: 'replace',
          filePath: context.indexHtml?.path || 'index.html',
          oldValue: viewportMatch[0],
          newValue: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
          description: 'Fix viewport meta tag',
        },
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: 'Missing viewport meta tag',
      description: 'Without a viewport meta tag, mobile browsers will render the page at desktop width.',
      suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      expectedValue: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      isAutoFixable: true,
      autoFix: {
        type: 'insert',
        filePath: context.indexHtml?.path || 'index.html',
        target: 'head',
        newValue: '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n',
        description: 'Add viewport meta tag',
      },
      learnMoreUrl: LEARN_MORE_URLS.VIEWPORT,
    };
  },
};

/**
 * Check robots meta tag
 */
const robotsMetaRule: SEORule = {
  id: RULE_IDS.TECH_ROBOTS_META,
  name: 'Robots Meta Tag',
  category: 'technical',
  description: 'Checks robots meta tag configuration',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const robotsMatch = html.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["']/i);

    if (robotsMatch) {
      const content = robotsMatch[1].toLowerCase();
      const hasNoindex = content.includes('noindex');
      const hasNofollow = content.includes('nofollow');

      if (hasNoindex || hasNofollow) {
        return {
          passed: false,
          severity: 'warning',
          message: `Robots meta contains restrictive directives: ${content}`,
          description: 'This may prevent search engines from indexing or following links on this page.',
          suggestion: 'Remove noindex/nofollow if you want the page to be searchable',
          currentValue: content,
        };
      }

      return {
        passed: true,
        severity: 'success',
        message: 'Robots meta tag allows indexing',
        currentValue: content,
      };
    }

    // No robots meta is fine - defaults to index, follow
    return {
      passed: true,
      severity: 'info',
      message: 'No robots meta tag found (defaults to index, follow)',
      description: 'Without a robots meta tag, search engines will index and follow all links by default.',
    };
  },
};

/**
 * Check for canonical URL
 */
const canonicalRule: SEORule = {
  id: RULE_IDS.TECH_CANONICAL,
  name: 'Canonical URL',
  category: 'technical',
  description: 'Ensures canonical URL is specified',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);

    if (canonicalMatch) {
      const url = canonicalMatch[1];
      const isAbsolute = /^https?:\/\//i.test(url);

      if (isAbsolute) {
        return {
          passed: true,
          severity: 'success',
          message: 'Canonical URL is properly set',
          currentValue: url,
        };
      }

      return {
        passed: false,
        severity: 'warning',
        message: 'Canonical URL should be absolute',
        description: 'Canonical URLs must be fully qualified URLs including the protocol.',
        suggestion: 'Use an absolute URL starting with https://',
        currentValue: url,
        expectedValue: 'https://example.com/page',
      };
    }

    // Check if deploy URL is available to suggest canonical
    if (context.deployUrl) {
      return {
        passed: false,
        severity: 'warning',
        message: 'Missing canonical URL',
        description: 'A canonical URL helps prevent duplicate content issues.',
        suggestion: `Add <link rel="canonical" href="${context.deployUrl}">`,
        expectedValue: context.deployUrl,
        isAutoFixable: true,
        autoFix: {
          type: 'insert',
          filePath: context.indexHtml?.path || 'index.html',
          target: 'head',
          newValue: `<link rel="canonical" href="${context.deployUrl}">\n`,
          description: 'Add canonical URL',
        },
        learnMoreUrl: LEARN_MORE_URLS.CANONICAL,
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: 'No canonical URL specified',
      description: 'Consider adding a canonical URL to prevent duplicate content issues.',
      suggestion: 'Add <link rel="canonical" href="your-url">',
      learnMoreUrl: LEARN_MORE_URLS.CANONICAL,
    };
  },
};

/**
 * Check for robots.txt file
 */
const robotsTxtRule: SEORule = {
  id: RULE_IDS.TECH_ROBOTS_TXT,
  name: 'robots.txt File',
  category: 'technical',
  description: 'Checks if robots.txt file exists',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const robotsFile = context.files.find(f =>
      f.path === 'robots.txt' ||
      f.path === '/robots.txt' ||
      f.path === 'public/robots.txt'
    );

    if (robotsFile) {
      const content = robotsFile.content;
      const hasUserAgent = /User-agent:/i.test(content);

      if (hasUserAgent) {
        return {
          passed: true,
          severity: 'success',
          message: 'robots.txt file found and properly formatted',
          currentValue: 'robots.txt present',
        };
      }

      return {
        passed: false,
        severity: 'warning',
        message: 'robots.txt file exists but may be malformed',
        description: 'robots.txt should contain User-agent directives.',
        suggestion: 'Add at least "User-agent: *" directive',
        currentValue: content.slice(0, 100),
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: 'No robots.txt file found',
      description: 'A robots.txt file helps search engines understand which pages to crawl.',
      suggestion: 'Add a robots.txt file to your public directory',
      learnMoreUrl: LEARN_MORE_URLS.ROBOTS_TXT,
    };
  },
};

/**
 * Check for sitemap
 */
const sitemapRule: SEORule = {
  id: RULE_IDS.TECH_SITEMAP,
  name: 'XML Sitemap',
  category: 'technical',
  description: 'Checks if sitemap.xml exists',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const sitemapFile = context.files.find(f =>
      f.path === 'sitemap.xml' ||
      f.path === '/sitemap.xml' ||
      f.path === 'public/sitemap.xml'
    );

    if (sitemapFile) {
      const content = sitemapFile.content;
      const hasUrlset = /<urlset/i.test(content);
      const hasUrls = /<url>/i.test(content);

      if (hasUrlset && hasUrls) {
        return {
          passed: true,
          severity: 'success',
          message: 'Valid XML sitemap found',
          currentValue: 'sitemap.xml present',
        };
      }

      return {
        passed: false,
        severity: 'warning',
        message: 'sitemap.xml exists but may be malformed',
        description: 'Sitemap should follow XML sitemap protocol.',
        suggestion: 'Ensure sitemap follows XML sitemap schema',
        currentValue: content.slice(0, 100),
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: 'No sitemap.xml file found',
      description: 'A sitemap helps search engines discover all pages on your site.',
      suggestion: 'Generate a sitemap.xml file',
      learnMoreUrl: LEARN_MORE_URLS.SITEMAP,
    };
  },
};

/**
 * Check for HTTPS
 */
const httpsRule: SEORule = {
  id: RULE_IDS.TECH_HTTPS,
  name: 'HTTPS Protocol',
  category: 'technical',
  description: 'Verifies HTTPS is used',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    if (!context.deployUrl) {
      return {
        passed: true,
        severity: 'info',
        message: 'Deploy URL not available for HTTPS check',
      };
    }

    if (context.deployUrl.startsWith('https://')) {
      return {
        passed: true,
        severity: 'success',
        message: 'Site uses HTTPS',
        currentValue: 'HTTPS enabled',
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: 'Site does not use HTTPS',
      description: 'HTTPS is a ranking factor and required for security.',
      suggestion: 'Enable HTTPS for your domain',
      currentValue: context.deployUrl,
      expectedValue: context.deployUrl.replace('http://', 'https://'),
    };
  },
};

/**
 * Check URL structure
 */
const urlStructureRule: SEORule = {
  id: RULE_IDS.TECH_URL_STRUCTURE,
  name: 'URL Structure',
  category: 'technical',
  description: 'Validates URL structure for SEO',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    if (!context.deployUrl) {
      return {
        passed: true,
        severity: 'info',
        message: 'Deploy URL not available for structure check',
      };
    }

    const issues: string[] = [];
    const url = context.deployUrl;

    // Check for uppercase letters
    if (/[A-Z]/.test(url.replace(/^https?:\/\//i, ''))) {
      issues.push('URL contains uppercase letters');
    }

    // Check for underscores (hyphens are preferred)
    if (url.includes('_')) {
      issues.push('URL contains underscores (use hyphens instead)');
    }

    // Check for special characters
    if (/[^a-zA-Z0-9\-._~/:]/.test(url.replace(/^https?:\/\//, ''))) {
      issues.push('URL contains special characters');
    }

    // Check for multiple consecutive slashes
    if (/\/\/(?!$)/.test(url.replace(/^https?:\/\//, ''))) {
      issues.push('URL contains multiple consecutive slashes');
    }

    if (issues.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'URL structure is SEO-friendly',
        currentValue: url,
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `URL structure issues: ${issues.join(', ')}`,
      description: 'Clean URLs improve user experience and SEO.',
      suggestion: 'Use lowercase, hyphens, and avoid special characters',
      currentValue: url,
    };
  },
};

/**
 * Check hreflang tags (for multilingual sites)
 */
const hreflangRule: SEORule = {
  id: RULE_IDS.TECH_HREFLANG,
  name: 'Hreflang Tags',
  category: 'technical',
  description: 'Checks hreflang tags for multilingual sites',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const hreflangMatches = html.match(/<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["']/gi);

    if (hreflangMatches && hreflangMatches.length > 0) {
      const hasDefault = hreflangMatches.some(m => /hreflang=["']x-default["']/i.test(m));

      if (hasDefault) {
        return {
          passed: true,
          severity: 'success',
          message: `Found ${hreflangMatches.length} hreflang tags including x-default`,
          currentValue: `${hreflangMatches.length} hreflang tags`,
        };
      }

      return {
        passed: false,
        severity: 'warning',
        message: 'Hreflang tags found but missing x-default',
        description: 'x-default hreflang helps search engines choose the right language version.',
        suggestion: 'Add <link rel="alternate" hreflang="x-default" href="...">',
      };
    }

    // No hreflang is fine for single-language sites
    return {
      passed: true,
      severity: 'info',
      message: 'No hreflang tags found (not required for single-language sites)',
    };
  },
};

/**
 * Check for accidental noindex/nofollow
 */
const noIndexNoFollowRule: SEORule = {
  id: RULE_IDS.TECH_NO_INDEX_NOFOLLOW,
  name: 'Indexing Status',
  category: 'technical',
  description: 'Ensures page is not accidentally blocked from indexing',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';

    // Check robots meta
    const robotsMatch = html.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
    const googleMatch = html.match(/<meta\s+name=["']googlebot["'][^>]*content=["']([^"']+)["']/i);

    const checkContent = (content: string | undefined) => {
      if (!content) return { noindex: false, nofollow: false };
      const lower = content.toLowerCase();
      return {
        noindex: lower.includes('noindex'),
        nofollow: lower.includes('nofollow'),
      };
    };

    const robotsStatus = checkContent(robotsMatch?.[1]);
    const googleStatus = checkContent(googleMatch?.[1]);

    const hasNoindex = robotsStatus.noindex || googleStatus.noindex;
    const hasNofollow = robotsStatus.nofollow || googleStatus.nofollow;

    if (hasNoindex) {
      return {
        passed: false,
        severity: 'warning',
        message: 'Page is set to noindex - search engines will not index this page',
        description: 'If this is intentional, ignore this warning. Otherwise, remove the noindex directive.',
        suggestion: 'Remove noindex if you want this page to appear in search results',
        currentValue: robotsMatch?.[1] || googleMatch?.[1],
      };
    }

    if (hasNofollow) {
      return {
        passed: true,
        severity: 'warning',
        message: 'Page uses nofollow - links on this page will not pass PageRank',
        description: 'This may be intentional for pages with user-generated content.',
      };
    }

    return {
      passed: true,
      severity: 'success',
      message: 'Page allows indexing and following',
    };
  },
};

export const technicalRules: SEORule[] = [
  doctypeRule,
  langRule,
  charsetRule,
  viewportRule,
  robotsMetaRule,
  canonicalRule,
  robotsTxtRule,
  sitemapRule,
  httpsRule,
  urlStructureRule,
  hreflangRule,
  noIndexNoFollowRule,
];
