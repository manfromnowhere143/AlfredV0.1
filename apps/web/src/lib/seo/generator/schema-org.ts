/**
 * SEO Generator - Schema.org
 *
 * State-of-the-art Schema.org detection and generation.
 * Supports multiple interconnected schemas with auto-detection.
 */

import type { GeneratedSchema } from '../types';
import { SCHEMA_TEMPLATES, SCHEMA_ORG_TYPES } from '../constants';

// ============================================================================
// TYPES
// ============================================================================

interface DetectSchemaOptions {
  htmlContent: string;
  pageType?: string;
  pageTitle?: string;
  pageDescription?: string;
  url?: string;
  siteName?: string;
  images?: string[];
  logo?: string;
  socialLinks?: string[];
  author?: string;
  datePublished?: string;
  dateModified?: string;
}

interface SchemaGraph {
  '@context': 'https://schema.org';
  '@graph': Record<string, unknown>[];
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate comprehensive Schema.org graph with multiple interconnected schemas
 */
export function generateSchemaGraph(options: DetectSchemaOptions): {
  graph: SchemaGraph;
  types: string[];
  confidence: number;
} {
  const {
    htmlContent,
    pageTitle = 'Website',
    pageDescription,
    url = '',
    siteName,
    images = [],
    logo,
    socialLinks = [],
    author,
    datePublished,
    dateModified,
  } = options;

  const graph: Record<string, unknown>[] = [];
  const types: string[] = [];

  // Detect page type from content
  const detectedType = detectPageType(htmlContent, url);
  types.push(detectedType);

  // 1. ALWAYS include WebSite schema (foundational)
  const websiteSchema = generateWebSiteSchemaNode({
    name: siteName || pageTitle,
    url: getBaseUrl(url),
    description: pageDescription,
    searchUrl: url ? `${getBaseUrl(url)}/search?q={search_term_string}` : undefined,
  });
  graph.push(websiteSchema);
  if (!types.includes('WebSite')) types.push('WebSite');

  // 2. ALWAYS include Organization schema
  const orgSchema = generateOrganizationSchemaNode({
    name: siteName || pageTitle,
    url: getBaseUrl(url),
    logo: logo || (images.length > 0 ? images[0] : undefined),
    socialLinks,
  });
  graph.push(orgSchema);
  if (!types.includes('Organization')) types.push('Organization');

  // 3. Generate WebPage schema for the current page
  const webPageSchema = generateWebPageSchemaNode({
    name: pageTitle,
    description: pageDescription,
    url,
    primaryImage: images.length > 0 ? images[0] : undefined,
    datePublished,
    dateModified,
  });
  graph.push(webPageSchema);
  if (!types.includes('WebPage')) types.push('WebPage');

  // 4. Add type-specific schemas based on detected content
  const specificSchema = generateTypeSpecificSchema(detectedType, {
    htmlContent,
    pageTitle,
    pageDescription,
    url,
    images,
    author,
    datePublished,
    dateModified,
  });

  if (specificSchema && detectedType !== 'WebPage') {
    graph.push(specificSchema);
  }

  // 5. Generate BreadcrumbList if URL has path
  if (url && url.includes('/') && !url.endsWith('/')) {
    const breadcrumbSchema = generateBreadcrumbFromUrl(url, siteName || pageTitle);
    graph.push(breadcrumbSchema);
    if (!types.includes('BreadcrumbList')) types.push('BreadcrumbList');
  }

  // 6. Check for FAQ content
  const faqItems = extractFAQFromContent(htmlContent);
  if (faqItems.length > 0) {
    const faqSchema = generateFAQSchemaNode(faqItems);
    graph.push(faqSchema);
    if (!types.includes('FAQPage')) types.push('FAQPage');
  }

  return {
    graph: {
      '@context': 'https://schema.org',
      '@graph': graph,
    },
    types,
    confidence: calculateConfidence(types, htmlContent),
  };
}

// ============================================================================
// PAGE TYPE DETECTION
// ============================================================================

/**
 * Detect the most appropriate page type from content
 */
function detectPageType(htmlContent: string, url: string): string {
  const contentLower = htmlContent.toLowerCase();

  // Check URL patterns first
  if (url) {
    if (url.match(/\/(blog|posts?|articles?|news)\//i)) return 'Article';
    if (url.match(/\/(products?|shop|store)\//i)) return 'Product';
    if (url.match(/\/(about|team|company)\//i)) return 'Organization';
    if (url.match(/\/(faq|help|support)\//i)) return 'FAQPage';
    if (url.match(/\/(events?|calendar)\//i)) return 'Event';
    if (url.match(/\/(portfolio|projects?|works?)\//i)) return 'CreativeWork';
    if (url.match(/\/(contact)\//i)) return 'ContactPage';
    if (url.endsWith('/') || url.endsWith('/index.html')) return 'WebSite';
  }

  // Check content patterns
  if (contentLower.includes('frequently asked') || contentLower.includes('faq') ||
      (contentLower.match(/\?.*\?.*\?/g)?.length || 0) >= 3) {
    return 'FAQPage';
  }

  if (contentLower.includes('<article') || /blog|post|article/i.test(contentLower)) {
    if (contentLower.includes('how to') || contentLower.includes('step 1') || contentLower.includes('tutorial')) {
      return 'HowTo';
    }
    return 'Article';
  }

  if ((contentLower.includes('product') || contentLower.includes('item')) &&
      (contentLower.includes('price') || contentLower.includes('buy') || contentLower.includes('cart') || contentLower.includes('$'))) {
    return 'Product';
  }

  if (contentLower.includes('about us') || contentLower.includes('our team') ||
      contentLower.includes('our company') || contentLower.includes('who we are')) {
    return 'Organization';
  }

  if (contentLower.includes('event') && (contentLower.includes('date') || contentLower.includes('register'))) {
    return 'Event';
  }

  if (contentLower.includes('portfolio') || contentLower.includes('my work') ||
      contentLower.includes('projects') || contentLower.includes('case study')) {
    return 'CreativeWork';
  }

  if (contentLower.includes('app') && (contentLower.includes('download') || contentLower.includes('install'))) {
    return 'SoftwareApplication';
  }

  if (contentLower.includes('local') || contentLower.includes('location') ||
      contentLower.includes('address') || contentLower.includes('opening hours')) {
    return 'LocalBusiness';
  }

  if (contentLower.includes('recipe') && contentLower.includes('ingredients')) {
    return 'Recipe';
  }

  return 'WebPage';
}

// ============================================================================
// SCHEMA NODE GENERATORS
// ============================================================================

/**
 * Generate WebSite schema node with @id reference
 */
function generateWebSiteSchemaNode(config: {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': `${config.url}#website`,
    name: config.name,
    url: config.url,
    publisher: { '@id': `${config.url}#organization` },
  };

  if (config.description) {
    schema.description = config.description;
  }

  // Add SearchAction for site search
  if (config.searchUrl) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: config.searchUrl,
      },
      'query-input': 'required name=search_term_string',
    };
  }

  return schema;
}

/**
 * Generate Organization schema node with @id reference
 */
function generateOrganizationSchemaNode(config: {
  name: string;
  url: string;
  logo?: string;
  socialLinks?: string[];
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${config.url}#organization`,
    name: config.name,
    url: config.url,
  };

  if (config.logo) {
    schema.logo = {
      '@type': 'ImageObject',
      '@id': `${config.url}#logo`,
      url: config.logo,
      contentUrl: config.logo,
      caption: config.name,
    };
    schema.image = { '@id': `${config.url}#logo` };
  }

  if (config.socialLinks && config.socialLinks.length > 0) {
    schema.sameAs = config.socialLinks;
  }

  return schema;
}

/**
 * Generate WebPage schema node with @id reference
 */
function generateWebPageSchemaNode(config: {
  name: string;
  description?: string;
  url: string;
  primaryImage?: string;
  datePublished?: string;
  dateModified?: string;
}): Record<string, unknown> {
  const baseUrl = getBaseUrl(config.url);

  const schema: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${config.url}#webpage`,
    name: config.name,
    url: config.url,
    isPartOf: { '@id': `${baseUrl}#website` },
  };

  if (config.description) {
    schema.description = config.description;
  }

  if (config.primaryImage) {
    schema.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: config.primaryImage,
    };
  }

  if (config.datePublished) {
    schema.datePublished = config.datePublished;
  }

  if (config.dateModified) {
    schema.dateModified = config.dateModified;
  }

  return schema;
}

/**
 * Generate type-specific schema based on detected type
 */
function generateTypeSpecificSchema(
  type: string,
  options: {
    htmlContent: string;
    pageTitle?: string;
    pageDescription?: string;
    url?: string;
    images?: string[];
    author?: string;
    datePublished?: string;
    dateModified?: string;
  }
): Record<string, unknown> | null {
  const { pageTitle, pageDescription, url, images, author, datePublished, dateModified } = options;
  const baseUrl = getBaseUrl(url || '');

  switch (type) {
    case 'Article':
      return {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: pageTitle || 'Article',
        description: pageDescription,
        url,
        mainEntityOfPage: { '@id': `${url}#webpage` },
        author: author ? {
          '@type': 'Person',
          name: author,
        } : { '@id': `${baseUrl}#organization` },
        publisher: { '@id': `${baseUrl}#organization` },
        datePublished: datePublished || new Date().toISOString(),
        dateModified: dateModified || datePublished || new Date().toISOString(),
        image: images && images.length > 0 ? images[0] : undefined,
      };

    case 'Product':
      return {
        '@type': 'Product',
        '@id': `${url}#product`,
        name: pageTitle || 'Product',
        description: pageDescription,
        url,
        image: images && images.length > 0 ? images : undefined,
        brand: { '@id': `${baseUrl}#organization` },
        offers: {
          '@type': 'Offer',
          availability: 'https://schema.org/InStock',
          priceCurrency: 'USD',
          price: '0', // Would need to extract from content
        },
      };

    case 'SoftwareApplication':
      return {
        '@type': 'SoftwareApplication',
        '@id': `${url}#app`,
        name: pageTitle || 'Application',
        description: pageDescription,
        url,
        applicationCategory: 'WebApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      };

    case 'CreativeWork':
      return {
        '@type': 'CreativeWork',
        '@id': `${url}#work`,
        name: pageTitle || 'Portfolio',
        description: pageDescription,
        url,
        author: { '@id': `${baseUrl}#organization` },
        image: images && images.length > 0 ? images : undefined,
      };

    case 'Event':
      return {
        '@type': 'Event',
        '@id': `${url}#event`,
        name: pageTitle || 'Event',
        description: pageDescription,
        url,
        startDate: datePublished || new Date().toISOString(),
        organizer: { '@id': `${baseUrl}#organization` },
        location: {
          '@type': 'VirtualLocation',
          url,
        },
      };

    case 'LocalBusiness':
      return {
        '@type': 'LocalBusiness',
        '@id': `${url}#business`,
        name: pageTitle || 'Business',
        description: pageDescription,
        url,
        image: images && images.length > 0 ? images[0] : undefined,
      };

    case 'HowTo':
      return {
        '@type': 'HowTo',
        '@id': `${url}#howto`,
        name: pageTitle || 'How To Guide',
        description: pageDescription,
        url,
        step: extractStepsFromContent(options.htmlContent),
      };

    case 'Recipe':
      return {
        '@type': 'Recipe',
        '@id': `${url}#recipe`,
        name: pageTitle || 'Recipe',
        description: pageDescription,
        url,
        image: images && images.length > 0 ? images[0] : undefined,
        author: { '@id': `${baseUrl}#organization` },
      };

    default:
      return null;
  }
}

/**
 * Generate BreadcrumbList from URL path
 */
function generateBreadcrumbFromUrl(url: string, siteName: string): Record<string, unknown> {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  const items: Array<{ name: string; url: string }> = [
    { name: siteName || 'Home', url: baseUrl },
  ];

  let currentPath = '';
  for (const part of pathParts) {
    currentPath += `/${part}`;
    const name = part
      .replace(/[-_]/g, ' ')
      .replace(/\.html?$/i, '')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    items.push({ name, url: `${baseUrl}${currentPath}` });
  }

  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate FAQPage schema node
 */
function generateFAQSchemaNode(
  questions: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

// ============================================================================
// CONTENT EXTRACTION HELPERS
// ============================================================================

/**
 * Extract FAQ items from HTML content
 */
function extractFAQFromContent(htmlContent: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  // Look for common FAQ patterns
  // Pattern 1: Question marks in headings
  const questionRegex = /<h[2-4][^>]*>([^<]*\?[^<]*)<\/h[2-4]>/gi;
  const matches = htmlContent.matchAll(questionRegex);

  for (const match of matches) {
    const question = match[1].trim();
    // Try to find the answer in the following paragraph
    const afterQuestion = htmlContent.slice(match.index! + match[0].length);
    const answerMatch = afterQuestion.match(/<p[^>]*>([^<]+)<\/p>/i);
    if (answerMatch && answerMatch[1].length > 20) {
      faqs.push({
        question,
        answer: answerMatch[1].trim(),
      });
    }
  }

  return faqs.slice(0, 10); // Limit to 10 FAQs
}

/**
 * Extract steps from HowTo content
 */
function extractStepsFromContent(htmlContent: string): Array<Record<string, unknown>> {
  const steps: Array<Record<string, unknown>> = [];

  // Look for numbered lists or "step" mentions
  const stepRegex = /(?:step\s*(\d+)|(\d+)\.\s*)[:\s]*([^<\n]+)/gi;
  const matches = htmlContent.matchAll(stepRegex);

  let position = 1;
  for (const match of matches) {
    const text = match[3]?.trim();
    if (text && text.length > 10) {
      steps.push({
        '@type': 'HowToStep',
        position,
        name: `Step ${position}`,
        text,
      });
      position++;
    }
  }

  // If no steps found, create a placeholder
  if (steps.length === 0) {
    steps.push({
      '@type': 'HowToStep',
      position: 1,
      name: 'Step 1',
      text: 'Follow the instructions on this page.',
    });
  }

  return steps;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get base URL from full URL
 */
function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return url.split('/').slice(0, 3).join('/') || url;
  }
}

/**
 * Calculate confidence score based on detected types
 */
function calculateConfidence(types: string[], htmlContent: string): number {
  let confidence = 0.5; // Base confidence

  // More types detected = higher confidence
  confidence += Math.min(types.length * 0.1, 0.3);

  // Longer content = higher confidence
  if (htmlContent.length > 1000) confidence += 0.1;
  if (htmlContent.length > 5000) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

// ============================================================================
// INDIVIDUAL SCHEMA GENERATORS (for manual use)
// ============================================================================

/**
 * Generate WebSite schema
 */
export function generateWebSiteSchema(config: {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    ...generateWebSiteSchemaNode(config),
  };
}

/**
 * Generate Organization schema
 */
export function generateOrganizationSchema(config: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  socialLinks?: string[];
  contactEmail?: string;
  contactPhone?: string;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    url: config.url,
  };

  if (config.logo) {
    schema.logo = {
      '@type': 'ImageObject',
      url: config.logo,
    };
  }

  if (config.description) {
    schema.description = config.description;
  }

  if (config.socialLinks && config.socialLinks.length > 0) {
    schema.sameAs = config.socialLinks;
  }

  if (config.contactEmail || config.contactPhone) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      ...(config.contactEmail && { email: config.contactEmail }),
      ...(config.contactPhone && { telephone: config.contactPhone }),
    };
  }

  return schema;
}

/**
 * Generate Article schema
 */
export function generateArticleSchema(config: {
  headline: string;
  description?: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url?: string;
  publisher?: {
    name: string;
    logo?: string;
  };
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.headline,
    author: {
      '@type': 'Person',
      name: config.author,
    },
    datePublished: config.datePublished,
  };

  if (config.description) {
    schema.description = config.description;
  }

  if (config.dateModified) {
    schema.dateModified = config.dateModified;
  }

  if (config.image) {
    schema.image = config.image;
  }

  if (config.url) {
    schema.url = config.url;
    schema.mainEntityOfPage = {
      '@type': 'WebPage',
      '@id': config.url,
    };
  }

  if (config.publisher) {
    schema.publisher = {
      '@type': 'Organization',
      name: config.publisher.name,
      ...(config.publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: config.publisher.logo,
        },
      }),
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQSchema(
  questions: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

/**
 * Convert schema to JSON-LD script tag
 */
export function schemaToScript(schema: Record<string, unknown> | SchemaGraph): string {
  return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}

/**
 * Validate schema structure
 */
export function validateSchema(schema: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for @graph (new format)
  if (schema['@graph']) {
    const graph = schema['@graph'] as Record<string, unknown>[];
    for (const item of graph) {
      const itemValidation = validateSchemaItem(item);
      errors.push(...itemValidation.errors);
      warnings.push(...itemValidation.warnings);
    }
  } else {
    // Single schema validation
    const validation = validateSchemaItem(schema);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateSchemaItem(schema: Record<string, unknown>): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check @type
  if (!schema['@type']) {
    errors.push('Missing @type property');
  }

  // Check for empty values
  for (const [key, value] of Object.entries(schema)) {
    if (value === '' || value === null) {
      warnings.push(`Empty value for ${key}`);
    }
  }

  return { errors, warnings };
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Detect and generate schema (legacy function)
 */
export async function detectAndGenerateSchema(options: DetectSchemaOptions): Promise<GeneratedSchema> {
  const result = generateSchemaGraph(options);

  return {
    type: result.types[0] || 'WebPage',
    data: result.graph as unknown as Record<string, unknown>,
    confidence: result.confidence,
  };
}

export { SCHEMA_ORG_TYPES };
