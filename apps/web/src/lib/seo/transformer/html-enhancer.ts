/**
 * SEO Transformer - HTML Enhancer
 *
 * Injects Foundation SEO into HTML files.
 */

import type { SEOConfigInput, SEOAutoFix } from '../types';
import { HTML_TEMPLATES } from '../constants';
import { schemaToScript, generateWebSiteSchema, generateSchemaGraph } from '../generator/schema-org';

interface EnhanceHtmlOptions {
  html: string;
  config: SEOConfigInput;
  projectName: string;
  deployUrl?: string;
}

interface EnhanceHtmlResult {
  html: string;
  changes: string[];
}

/**
 * Enhance HTML with Foundation SEO
 */
export function enhanceHtml(options: EnhanceHtmlOptions): EnhanceHtmlResult {
  const { config, projectName, deployUrl } = options;
  let { html } = options;
  const changes: string[] = [];

  // Ensure DOCTYPE
  if (!html.trim().startsWith('<!DOCTYPE')) {
    html = '<!DOCTYPE html>\n' + html;
    changes.push('Added DOCTYPE declaration');
  }

  // Ensure html lang attribute
  if (/<html[^>]*>/i.test(html) && !/<html[^>]*lang=/i.test(html)) {
    const lang = config.language || 'en';
    html = html.replace(/<html([^>]*)>/i, `<html$1 lang="${lang}">`);
    changes.push(`Added lang="${lang}" attribute`);
  }

  // Find or create head section
  let headContent = '';
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);

  if (headMatch) {
    headContent = headMatch[1];
  }

  const headInsertions: string[] = [];

  // Charset (should be first in head)
  if (!/<meta\s+charset=/i.test(headContent)) {
    headInsertions.push(HTML_TEMPLATES.CHARSET);
    changes.push('Added charset meta tag');
  }

  // Viewport
  if (!/<meta\s+name=["']viewport["']/i.test(headContent)) {
    headInsertions.push(HTML_TEMPLATES.VIEWPORT);
    changes.push('Added viewport meta tag');
  }

  // Title
  if (config.siteTitle && !/<title[^>]*>[^<]+<\/title>/i.test(headContent)) {
    headInsertions.push(HTML_TEMPLATES.TITLE(config.siteTitle));
    changes.push('Added title tag');
  }

  // Description
  if (config.siteDescription && !/<meta\s+name=["']description["']/i.test(headContent)) {
    headInsertions.push(HTML_TEMPLATES.DESCRIPTION(config.siteDescription));
    changes.push('Added meta description');
  }

  // Canonical URL
  if (deployUrl && config.canonicalUrl !== '' && !/<link[^>]*rel=["']canonical["']/i.test(headContent)) {
    const canonical = config.canonicalUrl || deployUrl;
    headInsertions.push(HTML_TEMPLATES.CANONICAL(canonical));
    changes.push('Added canonical URL');
  }

  // Robots meta
  if (!/<meta\s+name=["']robots["']/i.test(headContent)) {
    const robotsContent = [
      config.allowIndexing !== false ? 'index' : 'noindex',
      config.allowFollowing !== false ? 'follow' : 'nofollow',
    ].join(', ');
    headInsertions.push(HTML_TEMPLATES.ROBOTS(robotsContent));
    changes.push('Added robots meta tag');
  }

  // Open Graph tags
  if (config.ogTitle || config.siteTitle) {
    const ogTags: Record<string, string> = {};

    if (!/<meta\s+property=["']og:title["']/i.test(headContent)) {
      ogTags.title = config.ogTitle || config.siteTitle || projectName;
    }

    if (!/<meta\s+property=["']og:description["']/i.test(headContent) && (config.ogDescription || config.siteDescription)) {
      ogTags.description = config.ogDescription || config.siteDescription || '';
    }

    if (!/<meta\s+property=["']og:type["']/i.test(headContent)) {
      ogTags.type = config.ogType || 'website';
    }

    if (!/<meta\s+property=["']og:url["']/i.test(headContent) && deployUrl) {
      ogTags.url = deployUrl;
    }

    if (!/<meta\s+property=["']og:image["']/i.test(headContent) && config.ogImage) {
      ogTags.image = config.ogImage;
    }

    if (!/<meta\s+property=["']og:site_name["']/i.test(headContent) && config.ogSiteName) {
      ogTags.site_name = config.ogSiteName;
    }

    if (!/<meta\s+property=["']og:locale["']/i.test(headContent) && config.locale) {
      ogTags.locale = config.locale;
    }

    if (Object.keys(ogTags).length > 0) {
      headInsertions.push(HTML_TEMPLATES.OG_TAGS(ogTags));
      changes.push('Added Open Graph tags');
    }
  }

  // Twitter Card tags
  if (config.twitterCard || config.twitterSite) {
    const twitterTags: Record<string, string> = {};

    if (!/<meta\s+name=["']twitter:card["']/i.test(headContent)) {
      twitterTags.card = config.twitterCard || 'summary_large_image';
    }

    if (!/<meta\s+name=["']twitter:title["']/i.test(headContent)) {
      twitterTags.title = config.ogTitle || config.siteTitle || projectName;
    }

    if (!/<meta\s+name=["']twitter:description["']/i.test(headContent) && (config.ogDescription || config.siteDescription)) {
      twitterTags.description = config.ogDescription || config.siteDescription || '';
    }

    if (!/<meta\s+name=["']twitter:site["']/i.test(headContent) && config.twitterSite) {
      twitterTags.site = config.twitterSite;
    }

    if (!/<meta\s+name=["']twitter:creator["']/i.test(headContent) && config.twitterCreator) {
      twitterTags.creator = config.twitterCreator;
    }

    if (!/<meta\s+name=["']twitter:image["']/i.test(headContent) && config.ogImage) {
      twitterTags.image = config.ogImage;
    }

    if (Object.keys(twitterTags).length > 0) {
      headInsertions.push(HTML_TEMPLATES.TWITTER_TAGS(twitterTags));
      changes.push('Added Twitter Card tags');
    }
  }

  // Favicon
  if (config.faviconUrl && !/<link[^>]*rel=["'](?:icon|shortcut icon)["']/i.test(headContent)) {
    headInsertions.push(HTML_TEMPLATES.FAVICON(config.faviconUrl));
    changes.push('Added favicon link');
  }

  if (config.appleTouchIconUrl && !/<link[^>]*rel=["']apple-touch-icon["']/i.test(headContent)) {
    headInsertions.push(HTML_TEMPLATES.APPLE_TOUCH_ICON(config.appleTouchIconUrl));
    changes.push('Added Apple Touch Icon');
  }

  // Schema.org JSON-LD with @graph format (multiple interconnected schemas)
  if (config.autoGenerateSchema !== false && !/<script\s+type=["']application\/ld\+json["']/i.test(headContent)) {
    if (config.schemaData) {
      // Use custom schema data if provided
      headInsertions.push(schemaToScript(config.schemaData));
      changes.push('Added custom Schema.org JSON-LD');
    } else {
      // Generate comprehensive @graph schema with WebSite, Organization, and WebPage
      const schemaResult = generateSchemaGraph({
        htmlContent: html,
        pageTitle: config.siteTitle || projectName,
        pageDescription: config.siteDescription,
        url: deployUrl || '',
        siteName: config.ogSiteName || config.siteTitle || projectName,
        logo: config.ogImage,
        images: config.ogImage ? [config.ogImage] : [],
      });
      headInsertions.push(schemaToScript(schemaResult.graph));
      changes.push(`Added Schema.org JSON-LD @graph (${schemaResult.types.join(', ')})`);
    }
  }

  // Insert all head content
  if (headInsertions.length > 0) {
    const insertContent = '\n    ' + headInsertions.join('\n    ') + '\n';

    if (headMatch) {
      // Insert after opening head tag
      const headStart = html.indexOf('<head');
      const headTagEnd = html.indexOf('>', headStart) + 1;
      html = html.slice(0, headTagEnd) + insertContent + html.slice(headTagEnd);
    } else {
      // Create head section
      const htmlTagMatch = html.match(/<html[^>]*>/i);
      if (htmlTagMatch) {
        const insertPos = html.indexOf(htmlTagMatch[0]) + htmlTagMatch[0].length;
        html = html.slice(0, insertPos) + `\n<head>${insertContent}</head>\n` + html.slice(insertPos);
      }
    }
  }

  return { html, changes };
}

/**
 * Apply auto-fixes to HTML
 */
export function applyAutoFixes(
  html: string,
  fixes: SEOAutoFix[]
): { html: string; applied: number; failed: number } {
  let applied = 0;
  let failed = 0;

  for (const fix of fixes) {
    try {
      switch (fix.type) {
        case 'replace':
          if (fix.oldValue && html.includes(fix.oldValue)) {
            html = html.replace(fix.oldValue, fix.newValue);
            applied++;
          } else {
            failed++;
          }
          break;

        case 'insert':
          if (fix.target === 'head') {
            const headMatch = html.match(/<head[^>]*>/i);
            if (headMatch) {
              const insertPos = html.indexOf(headMatch[0]) + headMatch[0].length;
              html = html.slice(0, insertPos) + '\n    ' + fix.newValue + html.slice(insertPos);
              applied++;
            } else {
              failed++;
            }
          } else if (fix.target === 'html') {
            // Insert at beginning
            html = fix.newValue + html;
            applied++;
          } else {
            failed++;
          }
          break;

        case 'attribute':
          if (fix.target) {
            const tagRegex = new RegExp(`<${fix.target}([^>]*)>`, 'i');
            if (tagRegex.test(html)) {
              html = html.replace(tagRegex, `<${fix.target}$1 ${fix.newValue}>`);
              applied++;
            } else {
              failed++;
            }
          }
          break;

        case 'delete':
          if (fix.oldValue && html.includes(fix.oldValue)) {
            html = html.replace(fix.oldValue, '');
            applied++;
          }
          break;

        default:
          failed++;
      }
    } catch {
      failed++;
    }
  }

  return { html, applied, failed };
}

/**
 * Generate enhanced index.html with Foundation SEO
 */
export function generateEnhancedIndexHtml(
  projectName: string,
  config: SEOConfigInput,
  deployUrl?: string,
  usesTypeScript = false
): string {
  const ext = usesTypeScript ? 'tsx' : 'jsx';
  const title = config.siteTitle || projectName;
  const description = config.siteDescription || `${projectName} - Built with Alfred`;
  const lang = config.language || 'en';

  // Build head content
  const headParts: string[] = [
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
  ];

  // Canonical
  if (deployUrl) {
    headParts.push(`<link rel="canonical" href="${escapeHtml(deployUrl)}">`);
  }

  // Robots
  const robotsContent = [
    config.allowIndexing !== false ? 'index' : 'noindex',
    config.allowFollowing !== false ? 'follow' : 'nofollow',
  ].join(', ');
  headParts.push(`<meta name="robots" content="${robotsContent}">`);

  // Open Graph
  headParts.push(`<meta property="og:type" content="${config.ogType || 'website'}">`);
  headParts.push(`<meta property="og:title" content="${escapeHtml(config.ogTitle || title)}">`);
  headParts.push(`<meta property="og:description" content="${escapeHtml(config.ogDescription || description)}">`);
  if (deployUrl) {
    headParts.push(`<meta property="og:url" content="${escapeHtml(deployUrl)}">`);
  }
  if (config.ogImage) {
    headParts.push(`<meta property="og:image" content="${escapeHtml(config.ogImage)}">`);
  }

  // Twitter Card
  headParts.push(`<meta name="twitter:card" content="${config.twitterCard || 'summary_large_image'}">`);
  headParts.push(`<meta name="twitter:title" content="${escapeHtml(config.ogTitle || title)}">`);
  headParts.push(`<meta name="twitter:description" content="${escapeHtml(config.ogDescription || description)}">`);
  if (config.twitterSite) {
    headParts.push(`<meta name="twitter:site" content="${escapeHtml(config.twitterSite)}">`);
  }
  if (config.ogImage) {
    headParts.push(`<meta name="twitter:image" content="${escapeHtml(config.ogImage)}">`);
  }

  // Favicon
  if (config.faviconUrl) {
    headParts.push(`<link rel="icon" type="image/svg+xml" href="${escapeHtml(config.faviconUrl)}">`);
  } else {
    headParts.push('<link rel="icon" type="image/svg+xml" href="/vite.svg">');
  }

  // Schema.org with @graph format
  if (config.autoGenerateSchema !== false) {
    const schemaResult = generateSchemaGraph({
      htmlContent: '',
      pageTitle: title,
      pageDescription: description,
      url: deployUrl || '',
      siteName: config.ogSiteName || title,
      logo: config.ogImage,
      images: config.ogImage ? [config.ogImage] : [],
    });
    headParts.push(`<script type="application/ld+json">\n${JSON.stringify(schemaResult.graph, null, 2)}\n</script>`);
  }

  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    ${headParts.join('\n    ')}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
