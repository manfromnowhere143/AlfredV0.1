/**
 * SEO Agent - Constants
 *
 * Thresholds, weights, scoring parameters, and templates
 * for Alfred's enterprise-level SEO system.
 */

import type { SEOGrade, SEOCategory } from './types';

// ============================================================================
// SCORING
// ============================================================================

/**
 * Category weights for overall score calculation
 * Total must equal 1.0
 */
export const CATEGORY_WEIGHTS: Record<SEOCategory, number> = {
  technical: 0.20, // 20%
  content: 0.25,   // 25%
  on_page: 0.25,   // 25%
  ux: 0.15,        // 15%
  schema: 0.15,    // 15%
};

/**
 * Grade thresholds
 */
export const GRADE_THRESHOLDS: Array<{ min: number; grade: SEOGrade }> = [
  { min: 95, grade: 'A+' },
  { min: 90, grade: 'A' },
  { min: 75, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 50, grade: 'D' },
  { min: 0, grade: 'F' },
];

/**
 * Severity weights for score calculation
 */
export const SEVERITY_WEIGHTS = {
  critical: 1.0,  // Full impact
  warning: 0.6,   // 60% impact
  info: 0.2,      // 20% impact
  success: 0,     // No negative impact
};

// ============================================================================
// THRESHOLDS
// ============================================================================

export const THRESHOLDS = {
  // Title
  TITLE_MIN_LENGTH: 30,
  TITLE_MAX_LENGTH: 60,
  TITLE_OPTIMAL_MIN: 50,
  TITLE_OPTIMAL_MAX: 60,

  // Description
  DESCRIPTION_MIN_LENGTH: 120,
  DESCRIPTION_MAX_LENGTH: 160,
  DESCRIPTION_OPTIMAL_MIN: 145,
  DESCRIPTION_OPTIMAL_MAX: 155,

  // Alt text
  ALT_TEXT_MIN_LENGTH: 5,
  ALT_TEXT_MAX_LENGTH: 125,
  ALT_TEXT_OPTIMAL_MIN: 20,
  ALT_TEXT_OPTIMAL_MAX: 100,

  // Headings
  H1_MAX_COUNT: 1,
  H1_MIN_LENGTH: 20,
  H1_MAX_LENGTH: 70,

  // Content
  MIN_WORD_COUNT: 300,
  OPTIMAL_WORD_COUNT: 1000,
  MIN_PARAGRAPH_COUNT: 3,

  // Keywords
  KEYWORD_DENSITY_MIN: 0.5, // %
  KEYWORD_DENSITY_MAX: 2.5, // %
  KEYWORD_DENSITY_OPTIMAL: 1.5, // %

  // Links
  MIN_INTERNAL_LINKS: 2,
  MAX_LINKS_PER_PAGE: 100,

  // Images
  MAX_IMAGE_WITHOUT_DIMENSIONS: 0,

  // Performance
  MAX_INLINE_SCRIPT_SIZE: 10000, // bytes
  MAX_INLINE_STYLE_SIZE: 10000, // bytes

  // URL
  URL_MAX_LENGTH: 100,
  URL_SLUG_MAX_LENGTH: 60,
};

// ============================================================================
// HTML TEMPLATES
// ============================================================================

export const HTML_TEMPLATES = {
  DOCTYPE: '<!DOCTYPE html>',

  CHARSET: '<meta charset="UTF-8">',

  VIEWPORT: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',

  TITLE: (title: string) => `<title>${escapeHtml(title)}</title>`,

  DESCRIPTION: (desc: string) =>
    `<meta name="description" content="${escapeHtml(desc)}">`,

  CANONICAL: (url: string) =>
    `<link rel="canonical" href="${escapeHtml(url)}">`,

  ROBOTS: (content: string) =>
    `<meta name="robots" content="${escapeHtml(content)}">`,

  OG_TAGS: (og: Record<string, string>) => {
    return Object.entries(og)
      .map(([prop, content]) =>
        `<meta property="og:${prop}" content="${escapeHtml(content)}">`
      )
      .join('\n    ');
  },

  TWITTER_TAGS: (twitter: Record<string, string>) => {
    return Object.entries(twitter)
      .map(([name, content]) =>
        `<meta name="twitter:${name}" content="${escapeHtml(content)}">`
      )
      .join('\n    ');
  },

  SCHEMA_SCRIPT: (data: Record<string, unknown>) =>
    `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`,

  FAVICON: (url: string) =>
    `<link rel="icon" type="image/svg+xml" href="${escapeHtml(url)}">`,

  APPLE_TOUCH_ICON: (url: string) =>
    `<link rel="apple-touch-icon" href="${escapeHtml(url)}">`,

  PRECONNECT: (origin: string) =>
    `<link rel="preconnect" href="${escapeHtml(origin)}">`,

  DNS_PREFETCH: (origin: string) =>
    `<link rel="dns-prefetch" href="${escapeHtml(origin)}">`,
};

// ============================================================================
// SCHEMA.ORG TYPES
// ============================================================================

export const SCHEMA_ORG_TYPES = {
  // Common types
  WEBSITE: 'WebSite',
  WEBPAGE: 'WebPage',
  ARTICLE: 'Article',
  BLOG_POSTING: 'BlogPosting',
  NEWS_ARTICLE: 'NewsArticle',

  // Business types
  ORGANIZATION: 'Organization',
  LOCAL_BUSINESS: 'LocalBusiness',
  CORPORATION: 'Corporation',

  // Product types
  PRODUCT: 'Product',
  OFFER: 'Offer',
  AGGREGATE_OFFER: 'AggregateOffer',

  // Creative types
  CREATIVE_WORK: 'CreativeWork',
  SOFTWARE_APPLICATION: 'SoftwareApplication',
  MOBILE_APPLICATION: 'MobileApplication',

  // Person
  PERSON: 'Person',

  // Event
  EVENT: 'Event',

  // FAQ
  FAQ_PAGE: 'FAQPage',
  QUESTION: 'Question',
  ANSWER: 'Answer',

  // How-to
  HOW_TO: 'HowTo',
  HOW_TO_STEP: 'HowToStep',

  // Breadcrumb
  BREADCRUMB_LIST: 'BreadcrumbList',
  LIST_ITEM: 'ListItem',
};

/**
 * Default schema templates
 */
export const SCHEMA_TEMPLATES = {
  WebSite: (config: { name: string; url: string; description?: string }) => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name,
    url: config.url,
    ...(config.description && { description: config.description }),
  }),

  WebPage: (config: { name: string; url: string; description?: string }) => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: config.name,
    url: config.url,
    ...(config.description && { description: config.description }),
  }),

  Organization: (config: { name: string; url: string; logo?: string }) => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    url: config.url,
    ...(config.logo && { logo: config.logo }),
  }),

  SoftwareApplication: (config: {
    name: string;
    description?: string;
    applicationCategory?: string;
    operatingSystem?: string;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: config.name,
    ...(config.description && { description: config.description }),
    applicationCategory: config.applicationCategory || 'WebApplication',
    operatingSystem: config.operatingSystem || 'Web',
  }),
};

// ============================================================================
// ROBOTS.TXT TEMPLATES
// ============================================================================

export const ROBOTS_TXT_TEMPLATE = (config: {
  sitemapUrl?: string;
  allowAll?: boolean;
  disallowPaths?: string[];
}) => {
  const lines: string[] = [
    '# Generated by Alfred SEO Agent',
    '',
    'User-agent: *',
  ];

  if (config.allowAll !== false) {
    lines.push('Allow: /');
  }

  if (config.disallowPaths && config.disallowPaths.length > 0) {
    config.disallowPaths.forEach(path => {
      lines.push(`Disallow: ${path}`);
    });
  }

  if (config.sitemapUrl) {
    lines.push('');
    lines.push(`Sitemap: ${config.sitemapUrl}`);
  }

  return lines.join('\n');
};

// ============================================================================
// SITEMAP TEMPLATES
// ============================================================================

export const SITEMAP_XML_TEMPLATE = (urls: Array<{
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}>) => {
  const urlEntries = urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ''}
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
};

// ============================================================================
// RULE IDS
// ============================================================================

export const RULE_IDS = {
  // Technical (12)
  TECH_DOCTYPE: 'tech-doctype',
  TECH_LANG: 'tech-lang',
  TECH_CHARSET: 'tech-charset',
  TECH_VIEWPORT: 'tech-viewport',
  TECH_ROBOTS_META: 'tech-robots-meta',
  TECH_CANONICAL: 'tech-canonical',
  TECH_ROBOTS_TXT: 'tech-robots-txt',
  TECH_SITEMAP: 'tech-sitemap',
  TECH_HTTPS: 'tech-https',
  TECH_URL_STRUCTURE: 'tech-url-structure',
  TECH_HREFLANG: 'tech-hreflang',
  TECH_NO_INDEX_NOFOLLOW: 'tech-no-index-nofollow',

  // Content (12)
  CONTENT_TITLE_EXISTS: 'content-title-exists',
  CONTENT_TITLE_LENGTH: 'content-title-length',
  CONTENT_TITLE_UNIQUE: 'content-title-unique',
  CONTENT_DESCRIPTION_EXISTS: 'content-description-exists',
  CONTENT_DESCRIPTION_LENGTH: 'content-description-length',
  CONTENT_H1_EXISTS: 'content-h1-exists',
  CONTENT_H1_SINGLE: 'content-h1-single',
  CONTENT_H1_LENGTH: 'content-h1-length',
  CONTENT_HEADING_HIERARCHY: 'content-heading-hierarchy',
  CONTENT_WORD_COUNT: 'content-word-count',
  CONTENT_KEYWORD_IN_TITLE: 'content-keyword-in-title',
  CONTENT_KEYWORD_IN_H1: 'content-keyword-in-h1',

  // On-Page (14)
  ONPAGE_IMG_ALT: 'onpage-img-alt',
  ONPAGE_IMG_ALT_QUALITY: 'onpage-img-alt-quality',
  ONPAGE_IMG_DIMENSIONS: 'onpage-img-dimensions',
  ONPAGE_IMG_LAZY_LOADING: 'onpage-img-lazy-loading',
  ONPAGE_INTERNAL_LINKS: 'onpage-internal-links',
  ONPAGE_EXTERNAL_LINKS_REL: 'onpage-external-links-rel',
  ONPAGE_BROKEN_LINKS: 'onpage-broken-links',
  ONPAGE_KEYWORD_DENSITY: 'onpage-keyword-density',
  ONPAGE_URL_LENGTH: 'onpage-url-length',
  ONPAGE_URL_KEYWORDS: 'onpage-url-keywords',
  ONPAGE_OG_TAGS: 'onpage-og-tags',
  ONPAGE_TWITTER_CARDS: 'onpage-twitter-cards',
  ONPAGE_STRUCTURED_DATA: 'onpage-structured-data',
  ONPAGE_FAVICON: 'onpage-favicon',

  // UX (8)
  UX_MOBILE_VIEWPORT: 'ux-mobile-viewport',
  UX_TOUCH_TARGETS: 'ux-touch-targets',
  UX_FONT_SIZE: 'ux-font-size',
  UX_CONTRAST: 'ux-contrast',
  UX_NO_HORIZONTAL_SCROLL: 'ux-no-horizontal-scroll',
  UX_ACCESSIBLE_NAMES: 'ux-accessible-names',
  UX_FOCUS_VISIBLE: 'ux-focus-visible',
  UX_SKIP_LINKS: 'ux-skip-links',

  // Schema (8)
  SCHEMA_JSONLD_PRESENT: 'schema-jsonld-present',
  SCHEMA_JSONLD_VALID: 'schema-jsonld-valid',
  SCHEMA_TYPE_APPROPRIATE: 'schema-type-appropriate',
  SCHEMA_REQUIRED_PROPS: 'schema-required-props',
  SCHEMA_RECOMMENDED_PROPS: 'schema-recommended-props',
  SCHEMA_NO_WARNINGS: 'schema-no-warnings',
  SCHEMA_ORGANIZATION: 'schema-organization',
  SCHEMA_BREADCRUMBS: 'schema-breadcrumbs',
};

// ============================================================================
// LEARN MORE URLS
// ============================================================================

export const LEARN_MORE_URLS = {
  DOCTYPE: 'https://web.dev/doctype/',
  LANG: 'https://web.dev/html-has-lang/',
  META_DESCRIPTION: 'https://web.dev/meta-description/',
  VIEWPORT: 'https://web.dev/viewport/',
  CANONICAL: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  ROBOTS_TXT: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
  SITEMAP: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview',
  STRUCTURED_DATA: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
  OG_TAGS: 'https://ogp.me/',
  TWITTER_CARDS: 'https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards',
  ALT_TEXT: 'https://web.dev/image-alt/',
  HEADING_STRUCTURE: 'https://web.dev/heading-order/',
  INTERNAL_LINKING: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
  MOBILE_FRIENDLY: 'https://developers.google.com/search/mobile-sites/',
};

// ============================================================================
// AI PROMPTS
// ============================================================================

export const AI_PROMPTS = {
  META_GENERATION: `You are an SEO expert. Generate optimized meta tags for a web page.

Requirements:
- Title: 50-60 characters, include main keyword near the beginning, compelling and click-worthy
- Description: 145-155 characters, include main keyword, clear value proposition, call-to-action

Return JSON format:
{
  "title": "Optimized title here",
  "description": "Optimized description here",
  "ogTitle": "Title for social sharing (can be same as title)",
  "ogDescription": "Description for social sharing (can be longer, up to 200 chars)"
}`,

  ALT_TEXT_GENERATION: `You are an accessibility expert. Generate descriptive alt text for an image.

Requirements:
- Length: 20-100 characters
- Be descriptive but concise
- Include relevant context
- Don't start with "Image of" or "Picture of"
- Include keywords naturally if provided

Return JSON format:
{
  "altText": "Descriptive alt text here",
  "confidence": 0.95
}`,

  SCHEMA_DETECTION: `You are a structured data expert. Analyze the HTML content and suggest appropriate Schema.org markup.

Requirements:
- Identify the page type (WebSite, Article, Product, Organization, etc.)
- Extract relevant properties
- Ensure validity against Schema.org specifications

Return JSON format:
{
  "type": "SchemaOrgType",
  "data": {
    "@context": "https://schema.org",
    "@type": "SchemaOrgType",
    "property1": "value1"
  },
  "confidence": 0.9
}`,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const SEO_VERSION = '1.0.0';
