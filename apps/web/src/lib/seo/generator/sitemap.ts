/**
 * SEO Generator - Sitemap
 *
 * State-of-the-art XML sitemap generation for Alfred projects.
 * Supports standard sitemap, image sitemap, and smart priority calculation.
 */

import type { GeneratedSitemap } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: SitemapImage[];
}

interface SitemapImage {
  loc: string;
  caption?: string;
  title?: string;
  geoLocation?: string;
  license?: string;
}

interface GenerateSitemapOptions {
  baseUrl: string;
  urls?: SitemapUrl[];
  includeDefaultPages?: boolean;
  lastmod?: string;
  includeImages?: boolean;
}

interface GenerateSitemapFromFilesOptions {
  /** Patterns to exclude from sitemap */
  excludePatterns?: RegExp[];
  /** Include images in sitemap with xmlns:image namespace */
  includeImages?: boolean;
  /** Use smart priority calculation based on URL depth and type */
  smartPriority?: boolean;
}

// ============================================================================
// URL PRIORITY CALCULATION
// ============================================================================

/**
 * Calculate smart priority based on URL depth and type
 */
function calculateSmartPriority(path: string, baseUrl: string): number {
  // Root/homepage gets highest priority
  if (!path || path === '/' || path === '/index.html') {
    return 1.0;
  }

  // Calculate depth (number of slashes)
  const depth = (path.match(/\//g) || []).length;

  // Important page patterns get higher priority
  const importantPatterns = [
    { pattern: /^\/(about|contact|pricing|features|services)/i, priority: 0.9 },
    { pattern: /^\/(blog|articles|news)\/$/i, priority: 0.85 },
    { pattern: /^\/(products?|shop|store)\/$/i, priority: 0.85 },
    { pattern: /^\/(faq|help|support)/i, priority: 0.8 },
    { pattern: /^\/(terms|privacy|legal)/i, priority: 0.5 },
    { pattern: /^\/(blog|articles|news)\/[^\/]+$/i, priority: 0.7 },
    { pattern: /^\/(products?|shop|store)\/[^\/]+$/i, priority: 0.75 },
  ];

  for (const { pattern, priority } of importantPatterns) {
    if (pattern.test(path)) {
      return priority;
    }
  }

  // Base priority on depth
  // depth 1: 0.8, depth 2: 0.6, depth 3: 0.4, etc.
  const depthPriority = Math.max(0.3, 1.0 - (depth * 0.2));

  return Number(depthPriority.toFixed(1));
}

/**
 * Calculate change frequency based on page type
 */
function calculateChangeFreq(path: string): 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' {
  // Homepage changes frequently
  if (!path || path === '/' || path === '/index.html') {
    return 'daily';
  }

  // Blog posts change less frequently
  if (/^\/(blog|articles|news)\/[^\/]+$/i.test(path)) {
    return 'monthly';
  }

  // Blog index changes more frequently
  if (/^\/(blog|articles|news)\/?$/i.test(path)) {
    return 'daily';
  }

  // Product pages may change often
  if (/^\/(products?|shop|store)/i.test(path)) {
    return 'weekly';
  }

  // Static pages change rarely
  if (/^\/(about|contact|terms|privacy|legal)/i.test(path)) {
    return 'monthly';
  }

  return 'weekly';
}

// ============================================================================
// STANDARD SITEMAP GENERATION
// ============================================================================

/**
 * Generate XML sitemap
 */
export function generateSitemap(options: GenerateSitemapOptions): GeneratedSitemap {
  const {
    baseUrl,
    urls = [],
    includeDefaultPages = true,
    lastmod = new Date().toISOString().split('T')[0],
    includeImages = false,
  } = options;

  const allUrls: SitemapUrl[] = [];

  // Add base URL if includeDefaultPages
  if (includeDefaultPages) {
    allUrls.push({
      loc: normalizeUrl(baseUrl),
      lastmod,
      changefreq: 'daily',
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
      images: url.images,
    });
  }

  // Remove duplicates
  const uniqueUrls = Array.from(
    new Map(allUrls.map(u => [u.loc, u])).values()
  );

  // Determine if we need image namespace
  const hasImages = includeImages && uniqueUrls.some(u => u.images && u.images.length > 0);

  // Generate XML
  const xmlUrls = uniqueUrls.map(url => generateUrlEntry(url, hasImages)).join('\n');

  // XML namespaces
  const namespaces = [
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  ];

  if (hasImages) {
    namespaces.push('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  }

  // Build XML content with proper declaration - clean output, no branding
  const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';

  const content = `${xmlDeclaration}
<urlset ${namespaces.join('\n         ')}>
${xmlUrls}
</urlset>`;

  return {
    content,
    urlCount: uniqueUrls.length,
    lastmod,
  };
}

/**
 * Generate a single URL entry
 */
function generateUrlEntry(url: SitemapUrl, includeImages: boolean): string {
  let entry = `  <url>
    <loc>${escapeXml(url.loc)}</loc>`;

  if (url.lastmod) {
    entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
  }

  if (url.changefreq) {
    entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
  }

  if (url.priority !== undefined) {
    entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
  }

  // Add image entries
  if (includeImages && url.images && url.images.length > 0) {
    for (const image of url.images) {
      entry += `\n    <image:image>
      <image:loc>${escapeXml(image.loc)}</image:loc>`;

      if (image.caption) {
        entry += `\n      <image:caption>${escapeXml(image.caption)}</image:caption>`;
      }

      if (image.title) {
        entry += `\n      <image:title>${escapeXml(image.title)}</image:title>`;
      }

      if (image.geoLocation) {
        entry += `\n      <image:geo_location>${escapeXml(image.geoLocation)}</image:geo_location>`;
      }

      if (image.license) {
        entry += `\n      <image:license>${escapeXml(image.license)}</image:license>`;
      }

      entry += `\n    </image:image>`;
    }
  }

  entry += '\n  </url>';
  return entry;
}

// ============================================================================
// FILE-BASED SITEMAP GENERATION
// ============================================================================

/**
 * Generate sitemap from file list with smart priority
 *
 * IMPORTANT: For SPAs (React, Vue, Svelte), the sitemap should only include
 * actual HTML pages, NOT source code files (.tsx, .jsx, .ts, .js, etc.)
 */
export function generateSitemapFromFiles(
  files: Array<{ path: string; content?: string }>,
  baseUrl: string,
  options?: GenerateSitemapFromFilesOptions
): GeneratedSitemap {
  const {
    excludePatterns = [],
    includeImages = true,
    smartPriority = true,
  } = options || {};

  // Clean the baseUrl - remove any duplication and trailing slashes
  const cleanBaseUrl = cleanUrl(baseUrl);

  const urls: SitemapUrl[] = [];
  const lastmod = new Date().toISOString().split('T')[0];
  const addedUrls = new Set<string>();

  // Collect all images for the sitemap
  const allImages: SitemapImage[] = [];

  // First pass: collect images from public/assets folders
  if (includeImages) {
    for (const file of files) {
      const path = file.path.replace(/^\//, '');

      // Only include images from public or assets folders (not src/)
      if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path)) continue;
      if (path.startsWith('src/')) continue; // Skip source folder images
      if (excludePatterns.some(p => p.test(path))) continue;

      const imageName = path.split('/').pop() || path;

      allImages.push({
        loc: `${cleanBaseUrl}/${path}`,
        title: imageName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      });
    }
  }

  // ALWAYS include homepage as the main (and often only) URL for SPAs
  urls.push({
    loc: cleanBaseUrl,
    lastmod,
    changefreq: 'daily',
    priority: 1.0,
    images: allImages.length > 0 ? allImages.slice(0, 1000) : undefined,
  });
  addedUrls.add(cleanBaseUrl);

  // Second pass: ONLY process actual HTML files (not source code!)
  for (const file of files) {
    const path = file.path.replace(/^\//, '');

    // STRICT: Only include .html files
    if (!/\.(html|htm)$/i.test(path)) {
      continue;
    }

    // Skip index.html (already added as homepage)
    if (/^(index\.html?|public\/index\.html?)$/i.test(path)) {
      continue;
    }

    // Skip excluded patterns
    if (excludePatterns.some(p => p.test(path))) {
      continue;
    }

    // Normalize path: remove .html extension and public/ prefix
    let pagePath = path
      .replace(/^public\//i, '')
      .replace(/\.html?$/i, '')
      .replace(/\/index$/i, '');

    // Skip if empty (would be duplicate of homepage)
    if (!pagePath) {
      continue;
    }

    // Build URL
    const url = `${cleanBaseUrl}/${pagePath}`;

    // Skip if already added
    if (addedUrls.has(url)) {
      continue;
    }

    urls.push({
      loc: url,
      lastmod,
      changefreq: smartPriority ? calculateChangeFreq(`/${pagePath}`) : 'weekly',
      priority: smartPriority ? calculateSmartPriority(`/${pagePath}`, cleanBaseUrl) : 0.8,
    });
    addedUrls.add(url);
  }

  // Sort by priority (highest first)
  urls.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return generateSitemap({
    baseUrl: cleanBaseUrl,
    urls,
    includeDefaultPages: false, // We handle this manually
    lastmod,
    includeImages,
  });
}

/**
 * Clean URL - remove duplication and normalize
 */
function cleanUrl(url: string): string {
  // Remove any protocol duplication (https://site.comhttps://site.com)
  const httpMatch = url.match(/^(https?:\/\/)/);
  if (httpMatch) {
    const protocol = httpMatch[1];
    const rest = url.slice(protocol.length);
    // Check if there's another protocol in the rest
    const secondProtocol = rest.indexOf('http');
    if (secondProtocol !== -1) {
      // URL is duplicated, take only up to the second protocol
      url = protocol + rest.slice(0, secondProtocol);
    }
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, '');
}

// ============================================================================
// IMAGE SITEMAP GENERATION
// ============================================================================

/**
 * Generate a dedicated image sitemap
 */
export function generateImageSitemap(
  files: Array<{ path: string; content?: string }>,
  baseUrl: string,
  options?: {
    excludePatterns?: RegExp[];
  }
): GeneratedSitemap {
  const { excludePatterns = [] } = options || {};
  const lastmod = new Date().toISOString().split('T')[0];

  const imageUrls: SitemapUrl[] = [];

  for (const file of files) {
    const path = file.path.replace(/^\//, '');

    // Only process image files
    if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path)) {
      continue;
    }

    // Skip excluded patterns
    if (excludePatterns.some(p => p.test(path))) {
      continue;
    }

    const imageUrl = `${baseUrl}/${path}`;
    const imageName = path.split('/').pop() || path;

    // Create a URL entry for the image page
    imageUrls.push({
      loc: baseUrl, // Images are associated with the main page
      lastmod,
      images: [{
        loc: imageUrl,
        title: imageName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }],
    });
  }

  // Merge images by page URL
  const mergedUrls = new Map<string, SitemapUrl>();
  for (const url of imageUrls) {
    if (mergedUrls.has(url.loc)) {
      const existing = mergedUrls.get(url.loc)!;
      existing.images = [...(existing.images || []), ...(url.images || [])];
    } else {
      mergedUrls.set(url.loc, { ...url });
    }
  }

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${Array.from(mergedUrls.values()).map(url => generateUrlEntry(url, true)).join('\n')}
</urlset>`;

  return {
    content,
    urlCount: Array.from(mergedUrls.values()).reduce((acc, u) => acc + (u.images?.length || 0), 0),
    lastmod,
  };
}

// ============================================================================
// SITEMAP INDEX GENERATION
// ============================================================================

/**
 * Generate sitemap index for multiple sitemaps
 */
export function generateSitemapIndex(
  sitemaps: Array<{ loc: string; lastmod?: string }>,
  baseUrl: string
): string {
  const lastmod = new Date().toISOString().split('T')[0];

  const entries = sitemaps.map(sitemap => `  <sitemap>
    <loc>${escapeXml(sitemap.loc.startsWith('http') ? sitemap.loc : `${baseUrl}${sitemap.loc}`)}</loc>
    <lastmod>${sitemap.lastmod || lastmod}</lastmod>
  </sitemap>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate sitemap XML
 */
export function validateSitemap(content: string): {
  valid: boolean;
  errors: string[];
  urlCount: number;
  hasImages: boolean;
} {
  const errors: string[] = [];
  let urlCount = 0;
  let hasImages = false;

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

  // Check for image namespace
  hasImages = content.includes('xmlns:image=');

  // Count URLs
  const urlMatches = content.match(/<url>/g);
  urlCount = urlMatches?.length || 0;

  if (urlCount === 0) {
    errors.push('No URLs found in sitemap');
  }

  // Check if URL count exceeds limit (50,000 URLs per sitemap)
  if (urlCount > 50000) {
    errors.push(`Too many URLs (${urlCount}). Maximum is 50,000 per sitemap.`);
  }

  // Check file size (should be under 50MB uncompressed)
  if (content.length > 50 * 1024 * 1024) {
    errors.push('Sitemap exceeds 50MB size limit');
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
    hasImages,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize URL for sitemap
 */
function normalizeUrl(url: string): string {
  // Fix any URL duplication issues (e.g., https://site.comhttps://site.com)
  const urlPattern = /(https?:\/\/[^\/]+)/;
  const match = url.match(urlPattern);
  if (match) {
    // Check if URL is duplicated
    const baseUrl = match[1];
    if (url.indexOf(baseUrl, baseUrl.length) !== -1) {
      // URL is duplicated, extract just the first occurrence
      url = baseUrl + url.slice(baseUrl.length).replace(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
    }
  }

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

/**
 * Extract images from HTML content
 */
export function extractImagesFromHtml(html: string, baseUrl: string): SitemapImage[] {
  const images: SitemapImage[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const alt = match[2];

    // Skip data URLs and external images
    if (src.startsWith('data:') || (src.startsWith('http') && !src.includes(new URL(baseUrl).host))) {
      continue;
    }

    // Resolve relative URLs
    let imageUrl = src;
    if (!src.startsWith('http')) {
      imageUrl = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
    }

    images.push({
      loc: imageUrl,
      caption: alt || undefined,
      title: alt || src.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    });
  }

  return images;
}
