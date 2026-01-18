/**
 * SEO Generator - Schema.org
 *
 * AI-powered Schema.org detection and generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedSchema } from '../types';
import { SCHEMA_TEMPLATES, SCHEMA_ORG_TYPES } from '../constants';

const anthropic = new Anthropic();

interface DetectSchemaOptions {
  htmlContent: string;
  pageType?: string;
  pageTitle?: string;
  pageDescription?: string;
  url?: string;
  images?: string[];
}

/**
 * Detect appropriate Schema.org type and generate markup
 */
export async function detectAndGenerateSchema(options: DetectSchemaOptions): Promise<GeneratedSchema> {
  const {
    htmlContent,
    pageType,
    pageTitle,
    pageDescription,
    url,
    images = [],
  } = options;

  // Extract text content for analysis
  const textContent = htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);

  const prompt = `You are a structured data expert. Analyze this webpage content and suggest appropriate Schema.org markup.

Page Title: ${pageTitle || 'Unknown'}
Page Description: ${pageDescription || 'Unknown'}
URL: ${url || 'Unknown'}
${pageType ? `Suggested Type: ${pageType}` : ''}
Has Images: ${images.length > 0 ? 'Yes' : 'No'}

Content:
"""
${textContent}
"""

Determine the most appropriate Schema.org type from:
- WebSite (for homepage/main site)
- WebPage (for general pages)
- Article/BlogPosting (for blog posts)
- Product (for product pages)
- Organization (for about/company pages)
- SoftwareApplication (for app landing pages)
- FAQPage (for FAQ pages)
- HowTo (for tutorials)
- LocalBusiness (for local business pages)

Return ONLY valid JSON with the complete Schema.org object:
{
  "type": "SchemaType",
  "data": {
    "@context": "https://schema.org",
    "@type": "...",
    "...": "..."
  },
  "confidence": 0.9
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the schema structure
    if (!parsed.data || !parsed.data['@type']) {
      throw new Error('Invalid schema structure');
    }

    // Ensure @context is present
    if (!parsed.data['@context']) {
      parsed.data['@context'] = 'https://schema.org';
    }

    return {
      type: parsed.type || parsed.data['@type'],
      data: parsed.data,
      confidence: parsed.confidence || 0.85,
    };
  } catch (error) {
    console.error('[SEO] Schema detection failed:', error);

    // Fallback to basic schema
    return generateBasicSchema(options);
  }
}

/**
 * Generate basic schema without AI
 */
function generateBasicSchema(options: DetectSchemaOptions): GeneratedSchema {
  const { htmlContent, pageTitle, pageDescription, url } = options;

  // Detect page type from content
  const contentLower = htmlContent.toLowerCase();
  let type = 'WebPage';

  // Check for specific page types
  if (contentLower.includes('frequently asked') || contentLower.includes('faq')) {
    type = 'FAQPage';
  } else if (contentLower.includes('<article') || /blog|post|article/i.test(contentLower)) {
    type = 'Article';
  } else if (contentLower.includes('product') && (contentLower.includes('price') || contentLower.includes('buy'))) {
    type = 'Product';
  } else if (contentLower.includes('about us') || contentLower.includes('our team')) {
    type = 'Organization';
  } else if (contentLower.includes('step 1') || contentLower.includes('how to')) {
    type = 'HowTo';
  } else if (url && (url.endsWith('/') || url.endsWith('/index.html'))) {
    type = 'WebSite';
  }

  // Generate schema using template
  let data: Record<string, unknown>;

  switch (type) {
    case 'WebSite':
      data = SCHEMA_TEMPLATES.WebSite({
        name: pageTitle || 'Website',
        url: url || '',
        description: pageDescription,
      });
      break;
    case 'Organization':
      data = SCHEMA_TEMPLATES.Organization({
        name: pageTitle || 'Organization',
        url: url || '',
      });
      break;
    case 'SoftwareApplication':
      data = SCHEMA_TEMPLATES.SoftwareApplication({
        name: pageTitle || 'Application',
        description: pageDescription,
      });
      break;
    default:
      data = SCHEMA_TEMPLATES.WebPage({
        name: pageTitle || 'Page',
        url: url || '',
        description: pageDescription,
      });
  }

  return {
    type,
    data,
    confidence: 0.5, // Lower confidence for basic generation
  };
}

/**
 * Generate WebSite schema
 */
export function generateWebSiteSchema(config: {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name,
    url: config.url,
  };

  if (config.description) {
    schema.description = config.description;
  }

  // Add search action if search URL is provided
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
    schema.logo = config.logo;
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
export function schemaToScript(schema: Record<string, unknown>): string {
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

  // Check required fields
  if (!schema['@context']) {
    errors.push('Missing @context property');
  } else if (!String(schema['@context']).includes('schema.org')) {
    errors.push('@context should reference schema.org');
  }

  if (!schema['@type']) {
    errors.push('Missing @type property');
  }

  // Type-specific validation
  const type = String(schema['@type']);
  const required = getRequiredProperties(type);

  for (const prop of required) {
    if (!schema[prop]) {
      errors.push(`Missing required property: ${prop}`);
    }
  }

  // Check for empty values
  for (const [key, value] of Object.entries(schema)) {
    if (value === '' || value === null) {
      warnings.push(`Empty value for ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function getRequiredProperties(type: string): string[] {
  const required: Record<string, string[]> = {
    WebSite: ['name', 'url'],
    WebPage: ['name'],
    Organization: ['name', 'url'],
    Article: ['headline', 'author', 'datePublished'],
    Product: ['name'],
    FAQPage: ['mainEntity'],
    HowTo: ['name', 'step'],
  };

  return required[type] || [];
}

export { SCHEMA_ORG_TYPES };
