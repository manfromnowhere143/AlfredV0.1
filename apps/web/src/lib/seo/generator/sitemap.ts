/**
 * SEO Generator - Sitemap
 *
 * XML sitemap generation for Alfred projects.
 */

import type { GeneratedSitemap } from '../types';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

interface GenerateSitemapOptions {
  baseUrl: string;
  urls?: SitemapUrl[];
  includeDefaultPages?: boolean;
  lastmod?: string;
}

/**
 * Generate XML sitemap
 */
export function generateSitemap(options: GenerateSitemapOptions): GeneratedSitemap {
  const {
    baseUrl,
    urls = [],
    includeDefaultPages = true,
    lastmod = new Date().toISOString().split('T')[0],
  } = options;

  const allUrls: SitemapUrl[] = [];

  // Add base URL if includeDefaultPages
  if (includeDefaultPages) {
    allUrls.push({
      loc: normalizeUrl(baseUrl),
      lastmod,
      changefreq: 'weekly',
      priority: 1.0,
    });
  }

  // Add provided URLs
  for (const url of urls) {
    allUrls.push({
      loc: normalizeUrl(url.loc.startsWith('http') ? url.loc : `${baseUrl}${url.loc}`),
      lastmod: url.lastmod || lastmod,
      changefreq: url.changefreq || 'weekly',
      priority: url.priority ?? 0.8,
    });
  }

  // Remove duplicates
  const uniqueUrls = Array.from(
    new Map(allUrls.map(u => [u.loc, u])).values()
  );

  // Generate XML
  const xmlUrls = uniqueUrls.map(url => {
    let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;

    if (url.lastmod) {
      entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
    }

    if (url.changefreq) {
      entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
    }

    if (url.priority !== undefined) {
      entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
    }

    entry += '\n  </url>';
    return entry;
  }).join('\n');

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

  return {
    content,
    urlCount: uniqueUrls.length,
    lastmod,
  };
}

/**
 * Generate sitemap from file list
 */
export function generateSitemapFromFiles(
  files: Array<{ path: string }>,
  baseUrl: string,
  options?: {
    includeHtmlOnly?: boolean;
    excludePatterns?: RegExp[];
  }
): GeneratedSitemap {
  const { includeHtmlOnly = true, excludePatterns = [] } = options || {};

  const urls: SitemapUrl[] = [];
  const lastmod = new Date().toISOString().split('T')[0];

  for (const file of files) {
    let path = file.path;

    // Skip non-HTML files if includeHtmlOnly
    if (includeHtmlOnly && !path.endsWith('.html') && !path.endsWith('.htm')) {
      continue;
    }

    // Skip excluded patterns
    if (excludePatterns.some(p => p.test(path))) {
      continue;
    }

    // Normalize path
    path = path.replace(/^\//, '').replace(/index\.html?$/, '');

    // Skip duplicates
    const url = path ? `${baseUrl}/${path}` : baseUrl;

    urls.push({
      loc: url,
      lastmod,
      changefreq: path === '' ? 'weekly' : 'monthly',
      priority: path === '' ? 1.0 : 0.8,
    });
  }

  return generateSitemap({
    baseUrl,
    urls,
    includeDefaultPages: false, // We handle this manually
    lastmod,
  });
}

/**
 * Validate sitemap XML
 */
export function validateSitemap(content: string): {
  valid: boolean;
  errors: string[];
  urlCount: number;
} {
  const errors: string[] = [];
  let urlCount = 0;

  // Check for XML declaration
  if (!content.startsWith('<?xml')) {
    errors.push('Missing XML declaration');
  }

  // Check for urlset
  if (!content.includes('<urlset')) {
    errors.push('Missing urlset element');
  }

  // Check for xmlns
  if (!content.includes('xmlns=')) {
    errors.push('Missing xmlns attribute on urlset');
  }

  // Count URLs
  const urlMatches = content.match(/<url>/g);
  urlCount = urlMatches?.length || 0;

  if (urlCount === 0) {
    errors.push('No URLs found in sitemap');
  }

  // Check each URL has loc
  const locMatches = content.match(/<loc>/g);
  if (locMatches?.length !== urlCount) {
    errors.push('Some URLs missing <loc> element');
  }

  // Check for invalid characters
  if (/<loc>[^<]*[<>&"'][^<]*<\/loc>/g.test(content)) {
    errors.push('URLs contain unescaped special characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    urlCount,
  };
}

/**
 * Normalize URL for sitemap
 */
function normalizeUrl(url: string): string {
  // Remove trailing slash unless it's the root
  const normalized = url.replace(/\/+$/, '');
  return normalized || url;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
