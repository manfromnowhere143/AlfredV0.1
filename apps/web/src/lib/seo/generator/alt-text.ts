/**
 * SEO Generator - Alt Text
 *
 * AI-powered alt text generation using Claude.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedAltText } from '../types';
import { THRESHOLDS } from '../constants';

const anthropic = new Anthropic();

interface GenerateAltTextOptions {
  imageContext: string; // Description of where the image appears
  surroundingText?: string; // Text near the image
  keywords?: string[]; // SEO keywords to potentially include
  imageSrc: string; // Image source for reference
  isDecorative?: boolean; // If true, returns empty alt
}

/**
 * Generate optimized alt text using Claude
 */
export async function generateAltText(options: GenerateAltTextOptions): Promise<GeneratedAltText> {
  const {
    imageContext,
    surroundingText = '',
    keywords = [],
    imageSrc,
    isDecorative = false,
  } = options;

  // Decorative images should have empty alt
  if (isDecorative) {
    return {
      altText: '',
      confidence: 1.0,
      imageSrc,
    };
  }

  const prompt = `You are an accessibility expert. Generate descriptive alt text for an image.

Context where image appears: ${imageContext}
${surroundingText ? `Surrounding text: ${surroundingText.slice(0, 500)}` : ''}
${keywords.length > 0 ? `Relevant keywords: ${keywords.join(', ')}` : ''}
Image source: ${imageSrc}

Requirements:
1. Length: ${THRESHOLDS.ALT_TEXT_OPTIMAL_MIN}-${THRESHOLDS.ALT_TEXT_OPTIMAL_MAX} characters
2. Be descriptive but concise
3. Don't start with "Image of", "Picture of", "Photo of"
4. Include relevant context from the page
5. Include keywords naturally if they fit the image context
6. Focus on what's important in the image
7. If it's a chart/graph, describe the data trend

Return ONLY valid JSON:
{"altText":"descriptive alt text here","confidence":0.95}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate length
    let altText = parsed.altText || '';
    if (altText.length > THRESHOLDS.ALT_TEXT_MAX_LENGTH) {
      altText = altText.slice(0, THRESHOLDS.ALT_TEXT_MAX_LENGTH);
    }

    return {
      altText,
      confidence: parsed.confidence || 0.85,
      imageSrc,
    };
  } catch (error) {
    console.error('[SEO] Alt text generation failed:', error);

    // Fallback to basic generation
    return generateBasicAltText(options);
  }
}

/**
 * Basic alt text generation without AI
 */
function generateBasicAltText(options: GenerateAltTextOptions): GeneratedAltText {
  const { imageSrc, imageContext, keywords = [] } = options;

  // Try to extract meaning from filename
  let altText = '';

  // Parse filename
  const filename = imageSrc.split('/').pop()?.split('?')[0] || '';
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Convert filename conventions to readable text
  altText = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();

  // If filename doesn't provide much info, use context
  if (altText.length < THRESHOLDS.ALT_TEXT_MIN_LENGTH && imageContext) {
    altText = `Image related to ${imageContext}`;
  }

  // Add keyword if it makes sense
  if (keywords.length > 0 && !altText.includes(keywords[0].toLowerCase())) {
    if (altText.length + keywords[0].length + 4 <= THRESHOLDS.ALT_TEXT_MAX_LENGTH) {
      altText = `${keywords[0]} - ${altText}`;
    }
  }

  // Ensure minimum length
  if (altText.length < THRESHOLDS.ALT_TEXT_MIN_LENGTH) {
    altText = `Illustration for ${imageContext || 'this section'}`;
  }

  // Truncate if too long
  if (altText.length > THRESHOLDS.ALT_TEXT_MAX_LENGTH) {
    altText = altText.slice(0, THRESHOLDS.ALT_TEXT_MAX_LENGTH - 3) + '...';
  }

  return {
    altText,
    confidence: 0.4, // Low confidence for basic generation
    imageSrc,
  };
}

/**
 * Batch generate alt text for multiple images
 */
export async function batchGenerateAltText(
  images: Array<{
    src: string;
    context: string;
    surroundingText?: string;
  }>,
  keywords: string[] = []
): Promise<GeneratedAltText[]> {
  const results = await Promise.all(
    images.map((img) =>
      generateAltText({
        imageSrc: img.src,
        imageContext: img.context,
        surroundingText: img.surroundingText,
        keywords,
      })
    )
  );

  return results;
}

/**
 * Validate existing alt text
 */
export function validateAltText(altText: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!altText || altText.trim() === '') {
    return { valid: false, issues: ['Alt text is empty'] };
  }

  const length = altText.length;

  if (length < THRESHOLDS.ALT_TEXT_MIN_LENGTH) {
    issues.push(`Alt text is too short (${length} chars)`);
  }

  if (length > THRESHOLDS.ALT_TEXT_MAX_LENGTH) {
    issues.push(`Alt text is too long (${length} chars)`);
  }

  // Check for bad patterns
  if (/^image of/i.test(altText)) {
    issues.push('Avoid starting with "Image of"');
  }

  if (/^picture of/i.test(altText)) {
    issues.push('Avoid starting with "Picture of"');
  }

  if (/^photo of/i.test(altText)) {
    issues.push('Avoid starting with "Photo of"');
  }

  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(altText)) {
    issues.push('Alt text appears to be a filename');
  }

  if (/^(image|photo|picture|\d+)$/i.test(altText)) {
    issues.push('Alt text is too generic');
  }

  return { valid: issues.length === 0, issues };
}
