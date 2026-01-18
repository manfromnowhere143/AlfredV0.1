/**
 * SEO Analyzer - On-Page Rules (14 checks)
 *
 * Validates images, links, structured data, and on-page optimization.
 */

import type { SEORule, SEOAnalysisContext, SEORuleResult } from '../../types';
import { RULE_IDS, THRESHOLDS, LEARN_MORE_URLS } from '../../constants';

/**
 * Check if all images have alt text
 */
const imgAltRule: SEORule = {
  id: RULE_IDS.ONPAGE_IMG_ALT,
  name: 'Image Alt Text',
  category: 'on_page',
  description: 'Ensures all images have alt attributes',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const imgMatches = Array.from(allHtml.matchAll(/<img[^>]*>/gi));

    if (imgMatches.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No images found in HTML',
      };
    }

    const missingAlt: string[] = [];
    const emptyAlt: string[] = [];

    for (const match of imgMatches) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const src = srcMatch?.[1] || 'unknown';

      const hasAlt = /\salt=/i.test(imgTag);
      const altMatch = imgTag.match(/\salt=["']([^"']*)["']/i);

      if (!hasAlt) {
        missingAlt.push(src);
      } else if (altMatch && altMatch[1].trim() === '') {
        emptyAlt.push(src);
      }
    }

    const total = imgMatches.length;
    const withIssues = missingAlt.length + emptyAlt.length;

    if (withIssues === 0) {
      return {
        passed: true,
        severity: 'success',
        message: `All ${total} images have alt text`,
        currentValue: `${total}/${total} images with alt`,
      };
    }

    const issues: string[] = [];
    if (missingAlt.length > 0) {
      issues.push(`${missingAlt.length} missing alt`);
    }
    if (emptyAlt.length > 0) {
      issues.push(`${emptyAlt.length} empty alt`);
    }

    return {
      passed: false,
      severity: 'warning',
      message: `${withIssues} images need alt text (${issues.join(', ')})`,
      description: 'Alt text is crucial for accessibility and SEO.',
      suggestion: 'Add descriptive alt text to all images',
      currentValue: `${total - withIssues}/${total} images with alt`,
      expectedValue: `${total}/${total} images with alt`,
      learnMoreUrl: LEARN_MORE_URLS.ALT_TEXT,
      metadata: { missingAlt, emptyAlt },
    };
  },
};

/**
 * Check alt text quality
 */
const imgAltQualityRule: SEORule = {
  id: RULE_IDS.ONPAGE_IMG_ALT_QUALITY,
  name: 'Alt Text Quality',
  category: 'on_page',
  description: 'Validates alt text quality and length',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const imgMatches = Array.from(allHtml.matchAll(/<img[^>]*\salt=["']([^"']+)["'][^>]*>/gi));

    if (imgMatches.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No images with alt text to check quality',
      };
    }

    const issues: string[] = [];
    let goodCount = 0;

    for (const match of imgMatches) {
      const alt = match[1].trim();
      const length = alt.length;

      // Check for common bad patterns
      const badPatterns = [
        /^image$/i,
        /^photo$/i,
        /^picture$/i,
        /^img\d*/i,
        /^screenshot$/i,
        /^\d+$/,
        /^untitled$/i,
        /\.(?:jpg|jpeg|png|gif|webp|svg)$/i, // Filename as alt
      ];

      const isBad = badPatterns.some(p => p.test(alt));

      if (isBad) {
        issues.push(`Generic alt text: "${alt}"`);
      } else if (length < THRESHOLDS.ALT_TEXT_MIN_LENGTH) {
        issues.push(`Alt too short: "${alt}"`);
      } else if (length > THRESHOLDS.ALT_TEXT_MAX_LENGTH) {
        issues.push(`Alt too long: "${alt.slice(0, 30)}..."`);
      } else {
        goodCount++;
      }
    }

    const total = imgMatches.length;

    if (goodCount === total) {
      return {
        passed: true,
        severity: 'success',
        message: `All ${total} alt texts are well-written`,
        currentValue: `${total}/${total} quality alt texts`,
      };
    }

    return {
      passed: issues.length === 0,
      severity: issues.length > total / 2 ? 'warning' : 'info',
      message: `${issues.length} images have quality issues with alt text`,
      description: 'Good alt text should be descriptive but concise.',
      suggestion: 'Write descriptive alt text (20-100 characters) that describes the image content',
      currentValue: `${goodCount}/${total} quality alt texts`,
      metadata: { issues: issues.slice(0, 5) },
    };
  },
};

/**
 * Check if images have dimensions
 */
const imgDimensionsRule: SEORule = {
  id: RULE_IDS.ONPAGE_IMG_DIMENSIONS,
  name: 'Image Dimensions',
  category: 'on_page',
  description: 'Checks if images have width and height attributes',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const imgMatches = Array.from(allHtml.matchAll(/<img[^>]*>/gi));

    if (imgMatches.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No images found to check dimensions',
      };
    }

    let withDimensions = 0;

    for (const match of imgMatches) {
      const imgTag = match[0];
      const hasWidth = /\swidth=/i.test(imgTag);
      const hasHeight = /\sheight=/i.test(imgTag);

      if (hasWidth && hasHeight) {
        withDimensions++;
      }
    }

    const total = imgMatches.length;
    const withoutDimensions = total - withDimensions;

    if (withoutDimensions === 0) {
      return {
        passed: true,
        severity: 'success',
        message: `All ${total} images have dimensions specified`,
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: `${withoutDimensions} images missing width/height attributes`,
      description: 'Specifying dimensions prevents layout shift (CLS).',
      suggestion: 'Add width and height attributes to prevent layout shift',
      currentValue: `${withDimensions}/${total} with dimensions`,
      expectedValue: `${total}/${total} with dimensions`,
    };
  },
};

/**
 * Check for lazy loading on images
 */
const imgLazyLoadingRule: SEORule = {
  id: RULE_IDS.ONPAGE_IMG_LAZY_LOADING,
  name: 'Image Lazy Loading',
  category: 'on_page',
  description: 'Checks if images use lazy loading',
  weight: 0.04,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const imgMatches = Array.from(allHtml.matchAll(/<img[^>]*>/gi));

    if (imgMatches.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No images found to check lazy loading',
      };
    }

    let withLazy = 0;

    for (const match of imgMatches) {
      const imgTag = match[0];
      const hasLazy = /\sloading=["']lazy["']/i.test(imgTag);
      if (hasLazy) withLazy++;
    }

    const total = imgMatches.length;

    // First image shouldn't be lazy (above the fold)
    if (withLazy === 0 && total === 1) {
      return {
        passed: true,
        severity: 'info',
        message: 'Single image found - lazy loading not required',
      };
    }

    if (withLazy > 0) {
      return {
        passed: true,
        severity: 'success',
        message: `${withLazy}/${total} images use lazy loading`,
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: 'No images use lazy loading',
      description: 'Lazy loading improves initial page load performance.',
      suggestion: 'Add loading="lazy" to images below the fold',
    };
  },
};

/**
 * Check internal linking
 */
const internalLinksRule: SEORule = {
  id: RULE_IDS.ONPAGE_INTERNAL_LINKS,
  name: 'Internal Links',
  category: 'on_page',
  description: 'Checks for sufficient internal linking',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const linkMatches = Array.from(allHtml.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi));

    let internal = 0;
    let external = 0;

    for (const match of linkMatches) {
      const href = match[1];

      // Skip mailto, tel, javascript
      if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;

      // Skip anchors
      if (href.startsWith('#')) continue;

      // External if starts with http and not same domain
      if (/^https?:\/\//i.test(href)) {
        if (context.deployUrl && href.startsWith(context.deployUrl)) {
          internal++;
        } else {
          external++;
        }
      } else {
        // Relative URLs are internal
        internal++;
      }
    }

    if (internal >= THRESHOLDS.MIN_INTERNAL_LINKS) {
      return {
        passed: true,
        severity: 'success',
        message: `Good internal linking (${internal} internal links)`,
        currentValue: `${internal} internal, ${external} external`,
      };
    }

    // For single-page apps, minimal internal links might be expected
    if (internal === 0 && external === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No links found - may be a single-page app',
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: `Only ${internal} internal links found`,
      description: 'Internal linking helps search engines discover and understand your site structure.',
      suggestion: `Add at least ${THRESHOLDS.MIN_INTERNAL_LINKS} internal links`,
      currentValue: `${internal} internal links`,
      expectedValue: `${THRESHOLDS.MIN_INTERNAL_LINKS}+ internal links`,
      learnMoreUrl: LEARN_MORE_URLS.INTERNAL_LINKING,
    };
  },
};

/**
 * Check external links have rel attributes
 */
const externalLinksRelRule: SEORule = {
  id: RULE_IDS.ONPAGE_EXTERNAL_LINKS_REL,
  name: 'External Link Attributes',
  category: 'on_page',
  description: 'Checks if external links have proper rel attributes',
  weight: 0.04,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const linkMatches = Array.from(allHtml.matchAll(/<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/gi));

    const externalLinks: Array<{ href: string; hasRel: boolean; relValue?: string }> = [];

    for (const match of linkMatches) {
      const href = match[1];
      const fullTag = match[0];

      // Skip same domain
      if (context.deployUrl && href.startsWith(context.deployUrl)) continue;

      const relMatch = fullTag.match(/\srel=["']([^"']+)["']/i);
      externalLinks.push({
        href,
        hasRel: !!relMatch,
        relValue: relMatch?.[1],
      });
    }

    if (externalLinks.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No external links found',
      };
    }

    const withProperRel = externalLinks.filter(l =>
      l.relValue?.includes('noopener') || l.relValue?.includes('noreferrer')
    );

    if (withProperRel.length === externalLinks.length) {
      return {
        passed: true,
        severity: 'success',
        message: `All ${externalLinks.length} external links have proper rel attributes`,
      };
    }

    const withoutRel = externalLinks.length - withProperRel.length;

    return {
      passed: false,
      severity: 'info',
      message: `${withoutRel} external links missing rel="noopener"`,
      description: 'Adding rel="noopener" to external links improves security.',
      suggestion: 'Add rel="noopener noreferrer" to external links with target="_blank"',
      currentValue: `${withProperRel.length}/${externalLinks.length} with proper rel`,
    };
  },
};

/**
 * Check for broken links (basic check - looks for obviously broken hrefs)
 */
const brokenLinksRule: SEORule = {
  id: RULE_IDS.ONPAGE_BROKEN_LINKS,
  name: 'Link Quality',
  category: 'on_page',
  description: 'Checks for obviously broken or empty links',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const linkMatches = Array.from(allHtml.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi));

    const brokenLinks: string[] = [];

    for (const match of linkMatches) {
      const href = match[1].trim();

      // Check for empty or obviously broken hrefs
      if (
        href === '' ||
        href === '#' ||
        href === 'undefined' ||
        href === 'null' ||
        href === 'javascript:void(0)' ||
        href === 'javascript:;'
      ) {
        brokenLinks.push(href || '(empty)');
      }
    }

    if (brokenLinks.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'No obviously broken links found',
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `${brokenLinks.length} potentially broken or empty links`,
      description: 'Empty or placeholder links hurt user experience.',
      suggestion: 'Update or remove placeholder href values',
      currentValue: `${brokenLinks.length} issues`,
      metadata: { brokenLinks: brokenLinks.slice(0, 5) },
    };
  },
};

/**
 * Check keyword density (if focus keywords provided)
 */
const keywordDensityRule: SEORule = {
  id: RULE_IDS.ONPAGE_KEYWORD_DENSITY,
  name: 'Keyword Density',
  category: 'on_page',
  description: 'Checks if focus keyword has appropriate density',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    if (!context.focusKeywords || context.focusKeywords.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'No focus keywords specified for density check',
      };
    }

    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const textContent = allHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    if (totalWords < 100) {
      return {
        passed: true,
        severity: 'info',
        message: 'Not enough content for keyword density analysis',
      };
    }

    const keyword = context.focusKeywords[0].toLowerCase();
    const keywordWords = keyword.split(/\s+/);
    let occurrences = 0;

    // Count keyword occurrences
    for (let i = 0; i <= words.length - keywordWords.length; i++) {
      const phrase = words.slice(i, i + keywordWords.length).join(' ');
      if (phrase === keyword) {
        occurrences++;
      }
    }

    const density = (occurrences * keywordWords.length / totalWords) * 100;

    if (density >= THRESHOLDS.KEYWORD_DENSITY_MIN && density <= THRESHOLDS.KEYWORD_DENSITY_MAX) {
      return {
        passed: true,
        severity: 'success',
        message: `Good keyword density: ${density.toFixed(1)}%`,
        currentValue: `${density.toFixed(1)}% for "${keyword}"`,
      };
    }

    if (density < THRESHOLDS.KEYWORD_DENSITY_MIN) {
      return {
        passed: false,
        severity: 'info',
        message: `Low keyword density: ${density.toFixed(1)}%`,
        description: 'Your focus keyword might not appear enough in the content.',
        suggestion: 'Consider naturally incorporating the keyword more often',
        currentValue: `${density.toFixed(1)}%`,
        expectedValue: `${THRESHOLDS.KEYWORD_DENSITY_MIN}-${THRESHOLDS.KEYWORD_DENSITY_MAX}%`,
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `High keyword density: ${density.toFixed(1)}%`,
      description: 'Too high keyword density may be seen as keyword stuffing.',
      suggestion: 'Reduce keyword usage to appear more natural',
      currentValue: `${density.toFixed(1)}%`,
      expectedValue: `${THRESHOLDS.KEYWORD_DENSITY_MIN}-${THRESHOLDS.KEYWORD_DENSITY_MAX}%`,
    };
  },
};

/**
 * Check URL length
 */
const urlLengthRule: SEORule = {
  id: RULE_IDS.ONPAGE_URL_LENGTH,
  name: 'URL Length',
  category: 'on_page',
  description: 'Validates URL is not too long',
  weight: 0.04,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    if (!context.deployUrl) {
      return {
        passed: true,
        severity: 'info',
        message: 'No deploy URL to check length',
      };
    }

    const urlLength = context.deployUrl.length;

    if (urlLength <= THRESHOLDS.URL_MAX_LENGTH) {
      return {
        passed: true,
        severity: 'success',
        message: `URL length is good (${urlLength} characters)`,
        currentValue: `${urlLength} characters`,
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: `URL is long (${urlLength} characters)`,
      description: 'Shorter URLs are easier to share and may rank better.',
      suggestion: `Try to keep URLs under ${THRESHOLDS.URL_MAX_LENGTH} characters`,
      currentValue: `${urlLength} characters`,
      expectedValue: `≤${THRESHOLDS.URL_MAX_LENGTH} characters`,
    };
  },
};

/**
 * Check if keywords appear in URL
 */
const urlKeywordsRule: SEORule = {
  id: RULE_IDS.ONPAGE_URL_KEYWORDS,
  name: 'Keywords in URL',
  category: 'on_page',
  description: 'Checks if focus keyword appears in URL',
  weight: 0.04,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    if (!context.deployUrl || !context.focusKeywords || context.focusKeywords.length === 0) {
      return {
        passed: true,
        severity: 'info',
        message: 'Cannot check keywords in URL - missing data',
      };
    }

    const urlPath = context.deployUrl.toLowerCase();
    const foundKeywords = context.focusKeywords.filter(kw =>
      urlPath.includes(kw.toLowerCase().replace(/\s+/g, '-'))
    );

    if (foundKeywords.length > 0) {
      return {
        passed: true,
        severity: 'success',
        message: `Focus keyword found in URL: "${foundKeywords[0]}"`,
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: 'Focus keyword not found in URL',
      description: 'Having keywords in URL can help with rankings.',
      suggestion: 'Consider including the focus keyword in the URL slug',
    };
  },
};

/**
 * Check Open Graph tags
 */
const ogTagsRule: SEORule = {
  id: RULE_IDS.ONPAGE_OG_TAGS,
  name: 'Open Graph Tags',
  category: 'on_page',
  description: 'Validates Open Graph meta tags for social sharing',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';

    const requiredOgTags = ['og:title', 'og:description', 'og:image', 'og:url'];
    const foundTags: string[] = [];
    const missingTags: string[] = [];

    for (const tag of requiredOgTags) {
      const regex = new RegExp(`<meta\\s+property=["']${tag}["'][^>]*content=["'][^"']+["']`, 'i');
      if (regex.test(html)) {
        foundTags.push(tag);
      } else {
        missingTags.push(tag);
      }
    }

    if (missingTags.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'All required Open Graph tags present',
        currentValue: foundTags.join(', '),
      };
    }

    if (foundTags.length === 0) {
      return {
        passed: false,
        severity: 'warning',
        message: 'No Open Graph tags found',
        description: 'Open Graph tags control how your page appears when shared on social media.',
        suggestion: 'Add og:title, og:description, og:image, and og:url meta tags',
        expectedValue: requiredOgTags.join(', '),
        learnMoreUrl: LEARN_MORE_URLS.OG_TAGS,
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `Missing Open Graph tags: ${missingTags.join(', ')}`,
      description: 'Complete Open Graph tags improve social sharing appearance.',
      suggestion: `Add: ${missingTags.join(', ')}`,
      currentValue: foundTags.join(', '),
      expectedValue: requiredOgTags.join(', '),
      learnMoreUrl: LEARN_MORE_URLS.OG_TAGS,
    };
  },
};

/**
 * Check Twitter Card tags
 */
const twitterCardsRule: SEORule = {
  id: RULE_IDS.ONPAGE_TWITTER_CARDS,
  name: 'Twitter Card Tags',
  category: 'on_page',
  description: 'Validates Twitter Card meta tags',
  weight: 0.06,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';

    const hasCard = /<meta\s+name=["']twitter:card["'][^>]*content=["'][^"']+["']/i.test(html);
    const hasTitle = /<meta\s+name=["']twitter:title["'][^>]*content=["'][^"']+["']/i.test(html);
    const hasDescription = /<meta\s+name=["']twitter:description["'][^>]*content=["'][^"']+["']/i.test(html);
    const hasImage = /<meta\s+name=["']twitter:image["'][^>]*content=["'][^"']+["']/i.test(html);

    const found = [hasCard, hasTitle, hasDescription, hasImage].filter(Boolean).length;

    if (found === 4) {
      return {
        passed: true,
        severity: 'success',
        message: 'All Twitter Card tags present',
      };
    }

    if (found === 0) {
      return {
        passed: false,
        severity: 'info',
        message: 'No Twitter Card tags found',
        description: 'Twitter Cards control how your page appears when shared on Twitter.',
        suggestion: 'Add twitter:card, twitter:title, twitter:description, and twitter:image',
        learnMoreUrl: LEARN_MORE_URLS.TWITTER_CARDS,
      };
    }

    const missing: string[] = [];
    if (!hasCard) missing.push('twitter:card');
    if (!hasTitle) missing.push('twitter:title');
    if (!hasDescription) missing.push('twitter:description');
    if (!hasImage) missing.push('twitter:image');

    return {
      passed: false,
      severity: 'info',
      message: `Missing Twitter Card tags: ${missing.join(', ')}`,
      suggestion: `Add: ${missing.join(', ')}`,
      learnMoreUrl: LEARN_MORE_URLS.TWITTER_CARDS,
    };
  },
};

/**
 * Check for structured data (JSON-LD)
 */
const structuredDataRule: SEORule = {
  id: RULE_IDS.ONPAGE_STRUCTURED_DATA,
  name: 'Structured Data',
  category: 'on_page',
  description: 'Checks for Schema.org structured data',
  weight: 0.08,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

    if (!jsonLdMatches || jsonLdMatches.length === 0) {
      return {
        passed: false,
        severity: 'info',
        message: 'No JSON-LD structured data found',
        description: 'Structured data helps search engines understand your content.',
        suggestion: 'Add Schema.org JSON-LD markup for rich search results',
        learnMoreUrl: LEARN_MORE_URLS.STRUCTURED_DATA,
      };
    }

    // Try to parse JSON-LD
    let validCount = 0;
    let invalidCount = 0;
    const types: string[] = [];

    for (const match of jsonLdMatches) {
      const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '').trim();
      try {
        const data = JSON.parse(jsonContent);
        validCount++;
        if (data['@type']) {
          types.push(data['@type']);
        }
      } catch {
        invalidCount++;
      }
    }

    if (invalidCount > 0) {
      return {
        passed: false,
        severity: 'warning',
        message: `${invalidCount} JSON-LD blocks have invalid JSON`,
        description: 'Invalid JSON-LD will not be recognized by search engines.',
        suggestion: 'Fix JSON syntax errors in structured data',
        currentValue: `${validCount} valid, ${invalidCount} invalid`,
      };
    }

    return {
      passed: true,
      severity: 'success',
      message: `Found ${validCount} valid JSON-LD block(s)`,
      currentValue: types.length > 0 ? `Types: ${types.join(', ')}` : `${validCount} block(s)`,
    };
  },
};

/**
 * Check for favicon
 */
const faviconRule: SEORule = {
  id: RULE_IDS.ONPAGE_FAVICON,
  name: 'Favicon',
  category: 'on_page',
  description: 'Checks if favicon is defined',
  weight: 0.04,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';

    const hasFavicon = /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/i.test(html);
    const hasAppleTouchIcon = /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/i.test(html);

    // Also check for favicon files
    const hasFaviconFile = context.files.some(f =>
      f.path.includes('favicon') ||
      f.path.includes('apple-touch-icon')
    );

    if (hasFavicon || hasFaviconFile) {
      const extras = hasAppleTouchIcon ? ' (+ apple-touch-icon)' : '';
      return {
        passed: true,
        severity: 'success',
        message: `Favicon is defined${extras}`,
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: 'No favicon defined',
      description: 'Favicons improve brand recognition in browser tabs and bookmarks.',
      suggestion: 'Add a favicon with <link rel="icon" href="/favicon.ico">',
    };
  },
};

export const onPageRules: SEORule[] = [
  imgAltRule,
  imgAltQualityRule,
  imgDimensionsRule,
  imgLazyLoadingRule,
  internalLinksRule,
  externalLinksRelRule,
  brokenLinksRule,
  keywordDensityRule,
  urlLengthRule,
  urlKeywordsRule,
  ogTagsRule,
  twitterCardsRule,
  structuredDataRule,
  faviconRule,
];
