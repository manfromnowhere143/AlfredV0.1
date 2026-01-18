/**
 * SEO Generator - Meta Tags
 *
 * AI-powered meta tag generation using Claude.
 * NOTE: This module is SERVER-ONLY. Do not import directly in client components.
 */

import type { GeneratedMeta } from '../types';
import { THRESHOLDS } from '../constants';

// Lazy initialization to avoid bundling issues with client-side code
let anthropicClient: any = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    // Dynamic import to prevent bundling in client-side code
    const Anthropic = require('@anthropic-ai/sdk').default;
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

interface GenerateMetaOptions {
  content: string;
  pageType?: string;
  focusKeywords?: string[];
  existingTitle?: string;
  existingDescription?: string;
  siteName?: string;
}

/**
 * Generate optimized meta tags using Claude
 */
export async function generateMetaTags(options: GenerateMetaOptions): Promise<GeneratedMeta> {
  const {
    content,
    pageType = 'webpage',
    focusKeywords = [],
    existingTitle,
    existingDescription,
    siteName,
  } = options;

  // Prepare content excerpt (limit to avoid token overflow)
  const contentExcerpt = content.slice(0, 4000);

  const prompt = `You are an SEO expert. Generate optimized meta tags for a ${pageType}.

${focusKeywords.length > 0 ? `Focus Keywords: ${focusKeywords.join(', ')}` : ''}
${siteName ? `Site Name: ${siteName}` : ''}
${existingTitle ? `Current Title: ${existingTitle}` : ''}
${existingDescription ? `Current Description: ${existingDescription}` : ''}

Content to analyze:
"""
${contentExcerpt}
"""

Requirements:
1. Title: ${THRESHOLDS.TITLE_OPTIMAL_MIN}-${THRESHOLDS.TITLE_OPTIMAL_MAX} characters
   - Include main keyword near the beginning
   - Make it compelling and click-worthy
   - Don't use generic words like "Home" or "Welcome"

2. Description: ${THRESHOLDS.DESCRIPTION_OPTIMAL_MIN}-${THRESHOLDS.DESCRIPTION_OPTIMAL_MAX} characters
   - Include the main keyword naturally
   - Clear value proposition
   - Include a subtle call-to-action

3. OG Title: Can be same as title or slightly modified for social
4. OG Description: Can be longer (up to 200 chars), optimized for social sharing

Return ONLY valid JSON (no markdown, no code blocks):
{"title":"...","description":"...","ogTitle":"...","ogDescription":"...","keywords":["..."],"confidence":0.95}`;

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate lengths and truncate if necessary
    const title = truncateToLength(parsed.title, THRESHOLDS.TITLE_MAX_LENGTH);
    const description = truncateToLength(parsed.description, THRESHOLDS.DESCRIPTION_MAX_LENGTH);

    return {
      title,
      description,
      ogTitle: parsed.ogTitle || title,
      ogDescription: parsed.ogDescription || description,
      keywords: parsed.keywords || focusKeywords,
      confidence: parsed.confidence || 0.85,
    };
  } catch (error) {
    console.error('[SEO] Meta generation failed:', error);

    // Fallback to basic generation
    return generateBasicMeta(options);
  }
}

/**
 * Basic meta generation without AI
 */
function generateBasicMeta(options: GenerateMetaOptions): GeneratedMeta {
  const { content, focusKeywords = [], existingTitle, existingDescription, siteName } = options;

  // Extract text content
  const textContent = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Generate title
  let title = existingTitle || '';
  if (!title || title.length < THRESHOLDS.TITLE_MIN_LENGTH) {
    // Try to extract from H1 or first heading
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    title = h1Match?.[1]?.trim() || siteName || 'Welcome';

    // Add site name if room
    if (siteName && !title.includes(siteName) && title.length + siteName.length + 3 <= THRESHOLDS.TITLE_MAX_LENGTH) {
      title = `${title} | ${siteName}`;
    }
  }

  // Generate description
  let description = existingDescription || '';
  if (!description || description.length < THRESHOLDS.DESCRIPTION_MIN_LENGTH) {
    // Use first 150 chars of content
    description = textContent.slice(0, THRESHOLDS.DESCRIPTION_OPTIMAL_MAX);
    // Try to end at a sentence boundary
    const lastPeriod = description.lastIndexOf('.');
    if (lastPeriod > THRESHOLDS.DESCRIPTION_MIN_LENGTH) {
      description = description.slice(0, lastPeriod + 1);
    }
  }

  return {
    title: truncateToLength(title, THRESHOLDS.TITLE_MAX_LENGTH),
    description: truncateToLength(description, THRESHOLDS.DESCRIPTION_MAX_LENGTH),
    ogTitle: title,
    ogDescription: description,
    keywords: focusKeywords,
    confidence: 0.5, // Lower confidence for basic generation
  };
}

/**
 * Truncate text to max length at word boundary
 */
function truncateToLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // Try to break at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace).trim();
  }

  return truncated.trim();
}

/**
 * Validate and suggest improvements for existing meta
 */
export function validateMeta(title: string, description: string): {
  titleValid: boolean;
  descriptionValid: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  // Title validation
  const titleLength = title.length;
  let titleValid = true;

  if (titleLength < THRESHOLDS.TITLE_MIN_LENGTH) {
    titleValid = false;
    suggestions.push(`Title is too short (${titleLength} chars). Aim for ${THRESHOLDS.TITLE_OPTIMAL_MIN}-${THRESHOLDS.TITLE_OPTIMAL_MAX} characters.`);
  } else if (titleLength > THRESHOLDS.TITLE_MAX_LENGTH) {
    titleValid = false;
    suggestions.push(`Title is too long (${titleLength} chars). Keep under ${THRESHOLDS.TITLE_MAX_LENGTH} characters.`);
  }

  // Description validation
  const descLength = description.length;
  let descriptionValid = true;

  if (descLength < THRESHOLDS.DESCRIPTION_MIN_LENGTH) {
    descriptionValid = false;
    suggestions.push(`Description is too short (${descLength} chars). Aim for ${THRESHOLDS.DESCRIPTION_OPTIMAL_MIN}-${THRESHOLDS.DESCRIPTION_OPTIMAL_MAX} characters.`);
  } else if (descLength > THRESHOLDS.DESCRIPTION_MAX_LENGTH) {
    descriptionValid = false;
    suggestions.push(`Description is too long (${descLength} chars). Keep under ${THRESHOLDS.DESCRIPTION_MAX_LENGTH} characters.`);
  }

  return { titleValid, descriptionValid, suggestions };
}
