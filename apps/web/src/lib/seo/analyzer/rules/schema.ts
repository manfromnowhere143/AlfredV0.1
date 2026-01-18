/**
 * SEO Analyzer - Schema Rules (8 checks)
 *
 * Validates Schema.org structured data markup.
 */

import type { SEORule, SEOAnalysisContext, SEORuleResult } from '../../types';
import { RULE_IDS, LEARN_MORE_URLS } from '../../constants';

// Schema.org type requirements
const SCHEMA_REQUIRED_PROPERTIES: Record<string, string[]> = {
  WebSite: ['name', 'url'],
  WebPage: ['name'],
  Organization: ['name', 'url'],
  Person: ['name'],
  Article: ['headline', 'author', 'datePublished'],
  BlogPosting: ['headline', 'author', 'datePublished'],
  Product: ['name', 'offers'],
  LocalBusiness: ['name', 'address'],
  Event: ['name', 'startDate', 'location'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  BreadcrumbList: ['itemListElement'],
  SoftwareApplication: ['name', 'applicationCategory'],
};

const SCHEMA_RECOMMENDED_PROPERTIES: Record<string, string[]> = {
  WebSite: ['description', 'potentialAction'],
  WebPage: ['description', 'url', 'breadcrumb'],
  Organization: ['logo', 'contactPoint', 'sameAs'],
  Person: ['image', 'url', 'jobTitle'],
  Article: ['image', 'dateModified', 'publisher'],
  BlogPosting: ['image', 'dateModified', 'publisher', 'mainEntityOfPage'],
  Product: ['image', 'description', 'brand', 'review'],
  LocalBusiness: ['telephone', 'openingHours', 'priceRange'],
  Event: ['description', 'image', 'offers', 'performer'],
  FAQPage: [],
  HowTo: ['description', 'image', 'estimatedCost', 'totalTime'],
  BreadcrumbList: [],
  SoftwareApplication: ['operatingSystem', 'offers', 'aggregateRating'],
};

/**
 * Parse JSON-LD from HTML
 */
function parseJsonLd(html: string): Array<{ type: string; data: Record<string, unknown>; raw: string }> {
  const results: Array<{ type: string; data: Record<string, unknown>; raw: string }> = [];
  const matches = html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of matches) {
    const content = match[1].trim();
    try {
      const data = JSON.parse(content);
      const type = data['@type'] || 'Unknown';
      results.push({ type, data, raw: content });
    } catch {
      results.push({ type: 'Invalid', data: {}, raw: content });
    }
  }

  return results;
}

/**
 * Check if JSON-LD structured data is present
 */
const jsonLdPresentRule: SEORule = {
  id: RULE_IDS.SCHEMA_JSONLD_PRESENT,
  name: 'JSON-LD Present',
  category: 'schema',
  description: 'Checks for JSON-LD structured data',
  weight: 0.20,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const schemas = parseJsonLd(html);

    if (schemas.length === 0) {
      return {
        passed: false,
        severity: 'info',
        message: 'No JSON-LD structured data found',
        description: 'Structured data helps search engines understand your content.',
        suggestion: 'Add Schema.org JSON-LD markup for rich search results',
        learnMoreUrl: LEARN_MORE_URLS.STRUCTURED_DATA,
        isAutoFixable: true,
        autoFix: context.deployUrl ? {
          type: 'insert',
          filePath: context.indexHtml?.path || 'index.html',
          target: 'head',
          newValue: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "${context.projectName}",
  "url": "${context.deployUrl}"
}
</script>\n`,
          description: 'Add basic WebSite schema',
        } : undefined,
      };
    }

    const types = schemas.map(s => s.type);
    return {
      passed: true,
      severity: 'success',
      message: `Found ${schemas.length} JSON-LD block(s)`,
      currentValue: `Types: ${types.join(', ')}`,
    };
  },
};

/**
 * Check if JSON-LD is valid JSON
 */
const jsonLdValidRule: SEORule = {
  id: RULE_IDS.SCHEMA_JSONLD_VALID,
  name: 'JSON-LD Valid',
  category: 'schema',
  description: 'Validates JSON-LD syntax',
  weight: 0.20,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const matches = Array.from(html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));

    if (matches.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No JSON-LD to validate',
      };
    }

    const errors: string[] = [];
    let validCount = 0;

    for (const match of matches) {
      const content = match[1].trim();
      try {
        const data = JSON.parse(content);

        // Check for @context
        if (!data['@context']) {
          errors.push('Missing @context property');
        } else if (!data['@context'].includes('schema.org')) {
          errors.push('Invalid @context - should reference schema.org');
        }

        // Check for @type
        if (!data['@type']) {
          errors.push('Missing @type property');
        }

        validCount++;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        errors.push(`JSON parse error: ${errorMsg.slice(0, 50)}`);
      }
    }

    if (errors.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: `All ${validCount} JSON-LD blocks are valid`,
      };
    }

    return {
      passed: false,
      severity: 'critical',
      message: `JSON-LD validation errors: ${errors[0]}`,
      description: 'Invalid JSON-LD will not be recognized by search engines.',
      suggestion: 'Fix JSON syntax and ensure @context and @type are present',
      currentValue: `${errors.length} error(s)`,
      metadata: { errors: errors.slice(0, 5) },
    };
  },
};

/**
 * Check if schema type is appropriate for the page
 */
const schemaTypeAppropriateRule: SEORule = {
  id: RULE_IDS.SCHEMA_TYPE_APPROPRIATE,
  name: 'Schema Type',
  category: 'schema',
  description: 'Checks if schema type is appropriate',
  weight: 0.12,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const schemas = parseJsonLd(html);

    if (schemas.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No schema to check type',
      };
    }

    const validTypes = Object.keys(SCHEMA_REQUIRED_PROPERTIES);
    const unknownTypes = schemas.filter(s =>
      s.type !== 'Invalid' && !validTypes.includes(s.type)
    );

    if (unknownTypes.length > 0) {
      return {
        passed: true,
        severity: 'info',
        message: `Custom schema type(s) used: ${unknownTypes.map(s => s.type).join(', ')}`,
        description: 'Custom types are valid but may have limited rich result support.',
      };
    }

    const recognizedTypes = schemas.filter(s => validTypes.includes(s.type));

    if (recognizedTypes.length > 0) {
      return {
        passed: true,
        severity: 'success',
        message: `Recognized schema types: ${recognizedTypes.map(s => s.type).join(', ')}`,
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: 'Invalid schema types detected',
      suggestion: 'Use recognized Schema.org types like WebSite, Organization, Article, etc.',
    };
  },
};

/**
 * Check for required properties
 */
const requiredPropsRule: SEORule = {
  id: RULE_IDS.SCHEMA_REQUIRED_PROPS,
  name: 'Required Properties',
  category: 'schema',
  description: 'Checks if required schema properties are present',
  weight: 0.16,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const schemas = parseJsonLd(html);

    if (schemas.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No schema to check properties',
      };
    }

    const issues: string[] = [];
    let checkedCount = 0;

    for (const schema of schemas) {
      const { type, data } = schema;
      const required = SCHEMA_REQUIRED_PROPERTIES[type];

      if (!required) continue;

      checkedCount++;
      const missing = required.filter(prop => !data[prop]);

      if (missing.length > 0) {
        issues.push(`${type}: missing ${missing.join(', ')}`);
      }
    }

    if (checkedCount === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No recognized schema types to check',
      };
    }

    if (issues.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'All required schema properties present',
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `Missing required properties: ${issues[0]}`,
      description: 'Required properties are needed for search engines to use the structured data.',
      suggestion: 'Add the missing required properties',
      currentValue: issues.join('; '),
    };
  },
};

/**
 * Check for recommended properties
 */
const recommendedPropsRule: SEORule = {
  id: RULE_IDS.SCHEMA_RECOMMENDED_PROPS,
  name: 'Recommended Properties',
  category: 'schema',
  description: 'Checks for recommended schema properties',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const schemas = parseJsonLd(html);

    if (schemas.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No schema to check',
      };
    }

    const suggestions: string[] = [];
    let checkedCount = 0;

    for (const schema of schemas) {
      const { type, data } = schema;
      const recommended = SCHEMA_RECOMMENDED_PROPERTIES[type];

      if (!recommended || recommended.length === 0) continue;

      checkedCount++;
      const missing = recommended.filter(prop => !data[prop]);

      if (missing.length > 0) {
        suggestions.push(`${type}: consider adding ${missing.slice(0, 3).join(', ')}`);
      }
    }

    if (checkedCount === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No recognized schema types to check',
      };
    }

    if (suggestions.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'Schema has excellent property coverage',
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: `Enhancement suggestions: ${suggestions[0]}`,
      description: 'Additional properties can improve rich result appearance.',
      suggestion: suggestions.slice(0, 2).join('; '),
    };
  },
};

/**
 * Check for schema warnings/best practices
 */
const schemaNoWarningsRule: SEORule = {
  id: RULE_IDS.SCHEMA_NO_WARNINGS,
  name: 'Schema Best Practices',
  category: 'schema',
  description: 'Checks for schema.org best practices',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const schemas = parseJsonLd(html);

    if (schemas.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No schema to check',
      };
    }

    const warnings: string[] = [];

    for (const schema of schemas) {
      const { type, data } = schema;

      // Check for empty string values
      for (const [key, value] of Object.entries(data)) {
        if (value === '') {
          warnings.push(`${type}.${key} is empty`);
        }
      }

      // Check for placeholder URLs
      if (typeof data.url === 'string' && (
        data.url.includes('example.com') ||
        data.url.includes('placeholder') ||
        data.url === '#'
      )) {
        warnings.push(`${type}.url appears to be a placeholder`);
      }

      // Check for placeholder images
      if (typeof data.image === 'string' && (
        data.image.includes('placeholder') ||
        data.image.includes('via.placeholder') ||
        data.image === ''
      )) {
        warnings.push(`${type}.image appears to be a placeholder`);
      }

      // Check for missing @context
      if (!data['@context']) {
        warnings.push(`${type} missing @context`);
      }

      // Check for http instead of https
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.startsWith('http://')) {
          warnings.push(`${type}.${key} uses HTTP instead of HTTPS`);
        }
      }
    }

    if (warnings.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'Schema follows best practices',
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `Schema best practice issues: ${warnings[0]}`,
      description: 'Following best practices improves structured data quality.',
      suggestion: 'Fix placeholder values and use HTTPS URLs',
      currentValue: `${warnings.length} warning(s)`,
      metadata: { warnings: warnings.slice(0, 5) },
    };
  },
};

/**
 * Check for Organization schema
 */
const organizationSchemaRule: SEORule = {
  id: RULE_IDS.SCHEMA_ORGANIZATION,
  name: 'Organization Schema',
  category: 'schema',
  description: 'Checks for Organization structured data',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const schemas = parseJsonLd(html);

    const orgSchema = schemas.find(s =>
      s.type === 'Organization' ||
      s.type === 'Corporation' ||
      s.type === 'LocalBusiness'
    );

    if (orgSchema) {
      const { data } = orgSchema;
      const hasLogo = !!data.logo;
      const hasContact = !!data.contactPoint;
      const hasSocialLinks = !!data.sameAs;

      const extras = [
        hasLogo && 'logo',
        hasContact && 'contact',
        hasSocialLinks && 'social links',
      ].filter(Boolean);

      return {
        passed: true,
        severity: 'success',
        message: `Organization schema present${extras.length ? ` with ${extras.join(', ')}` : ''}`,
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: 'No Organization schema - recommended for businesses',
      description: 'Organization schema helps establish brand presence in search.',
      suggestion: 'Add Organization schema with name, url, and logo',
    };
  },
};

/**
 * Check for Breadcrumb schema
 */
const breadcrumbSchemaRule: SEORule = {
  id: RULE_IDS.SCHEMA_BREADCRUMBS,
  name: 'Breadcrumb Schema',
  category: 'schema',
  description: 'Checks for BreadcrumbList structured data',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const schemas = parseJsonLd(html);

    const breadcrumbSchema = schemas.find(s => s.type === 'BreadcrumbList');

    if (breadcrumbSchema) {
      const { data } = breadcrumbSchema;
      const items = Array.isArray(data.itemListElement) ? data.itemListElement.length : 0;

      return {
        passed: true,
        severity: 'success',
        message: `Breadcrumb schema present with ${items} items`,
      };
    }

    // Check if page seems to have navigation
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const hasBreadcrumbHtml = /breadcrumb/i.test(allHtml) ||
                              /aria-label=["']breadcrumb["']/i.test(allHtml);

    if (hasBreadcrumbHtml) {
      return {
        passed: false,
        severity: 'info',
        message: 'Breadcrumb navigation found but no BreadcrumbList schema',
        description: 'Adding BreadcrumbList schema enables breadcrumb rich results.',
        suggestion: 'Add BreadcrumbList JSON-LD for your breadcrumb navigation',
      };
    }

    // For single-page apps, breadcrumbs might not be needed
    return {
      passed: true,
      severity: 'info',
      message: 'No breadcrumb schema - may not be needed for this page type',
    };
  },
};

export const schemaRules: SEORule[] = [
  jsonLdPresentRule,
  jsonLdValidRule,
  schemaTypeAppropriateRule,
  requiredPropsRule,
  recommendedPropsRule,
  schemaNoWarningsRule,
  organizationSchemaRule,
  breadcrumbSchemaRule,
];
