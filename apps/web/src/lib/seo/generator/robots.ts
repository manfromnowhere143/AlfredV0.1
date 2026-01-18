/**
 * SEO Generator - robots.txt
 *
 * State-of-the-art robots.txt generation for Alfred projects.
 * Includes bot-specific rules, AI crawler management, and comprehensive directives.
 */

import type { GeneratedRobotsTxt } from '../types';

interface RobotsRule {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
}

interface GenerateRobotsTxtOptions {
  sitemapUrl?: string;
  siteUrl?: string;
  rules?: RobotsRule[];
  allowAll?: boolean;
  disallowPaths?: string[];
  additionalDirectives?: string[];
  // New state-of-the-art options
  blockAICrawlers?: boolean;
  allowGoogleAds?: boolean;
  hostDirective?: boolean;
  imageSitemapUrl?: string;
  videoSitemapUrl?: string;
  newsSitemapUrl?: string;
}

// Known AI/ML crawlers to optionally block
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'CCBot',
  'anthropic-ai',
  'Claude-Web',
  'Bytespider',
  'Diffbot',
  'FacebookBot',
  'Google-Extended',
  'Omgilibot',
  'PerplexityBot',
];

// Important crawlers with specific handling
const BOT_SPECIFIC_RULES: Record<string, { crawlDelay?: number; allow?: string[]; disallow?: string[] }> = {
  'Googlebot': {
    // Google doesn't respect crawl-delay, so we don't set it
    allow: ['/'],
  },
  'Googlebot-Image': {
    allow: ['/*.jpg$', '/*.jpeg$', '/*.png$', '/*.gif$', '/*.webp$', '/*.svg$'],
  },
  'Googlebot-Video': {
    allow: ['/*.mp4$', '/*.webm$', '/*.mov$'],
  },
  'Bingbot': {
    crawlDelay: 1,
    allow: ['/'],
  },
  'Slurp': { // Yahoo
    crawlDelay: 2,
  },
  'DuckDuckBot': {
    crawlDelay: 1,
    allow: ['/'],
  },
  'Applebot': {
    allow: ['/'],
  },
  'facebookexternalhit': {
    allow: ['/'], // Allow Facebook link previews
  },
  'Twitterbot': {
    allow: ['/'], // Allow Twitter card previews
  },
  'LinkedInBot': {
    allow: ['/'], // Allow LinkedIn previews
  },
};

/**
 * Generate state-of-the-art robots.txt content
 */
export function generateRobotsTxt(options: GenerateRobotsTxtOptions = {}): GeneratedRobotsTxt {
  const {
    sitemapUrl,
    siteUrl,
    rules = [],
    allowAll = true,
    disallowPaths = [],
    additionalDirectives = [],
    blockAICrawlers = false,
    allowGoogleAds = true,
    hostDirective = true,
    imageSitemapUrl,
    videoSitemapUrl,
    newsSitemapUrl,
  } = options;

  const lines: string[] = [];

  const appliedRules: string[] = [];

  // If custom rules provided, use them
  if (rules.length > 0) {
    for (const rule of rules) {
      lines.push(`User-agent: ${rule.userAgent}`);
      appliedRules.push(`User-agent: ${rule.userAgent}`);

      if (rule.allow) {
        for (const path of rule.allow) {
          lines.push(`Allow: ${path}`);
          appliedRules.push(`Allow: ${path}`);
        }
      }

      if (rule.disallow) {
        for (const path of rule.disallow) {
          lines.push(`Disallow: ${path}`);
          appliedRules.push(`Disallow: ${path}`);
        }
      }

      if (rule.crawlDelay) {
        lines.push(`Crawl-delay: ${rule.crawlDelay}`);
        appliedRules.push(`Crawl-delay: ${rule.crawlDelay}`);
      }

      lines.push('');
    }
  } else {
    // Generate state-of-the-art default rules - clean output, no comments

    // Main search engine bots with specific rules
    for (const [bot, botRules] of Object.entries(BOT_SPECIFIC_RULES)) {
      lines.push(`User-agent: ${bot}`);
      appliedRules.push(`User-agent: ${bot}`);

      if (botRules.allow) {
        for (const path of botRules.allow) {
          lines.push(`Allow: ${path}`);
          appliedRules.push(`Allow: ${path}`);
        }
      }

      if (botRules.disallow) {
        for (const path of botRules.disallow) {
          lines.push(`Disallow: ${path}`);
          appliedRules.push(`Disallow: ${path}`);
        }
      }

      if (botRules.crawlDelay) {
        lines.push(`Crawl-delay: ${botRules.crawlDelay}`);
        appliedRules.push(`Crawl-delay: ${botRules.crawlDelay}`);
      }

      lines.push('');
    }

    // AI Crawlers (if blocking enabled)
    if (blockAICrawlers) {
      for (const crawler of AI_CRAWLERS) {
        lines.push(`User-agent: ${crawler}`);
        lines.push('Disallow: /');
        lines.push('');
        appliedRules.push(`User-agent: ${crawler}`, 'Disallow: /');
      }
    }

    // Google Ads bots
    if (allowGoogleAds) {
      lines.push('User-agent: AdsBot-Google');
      lines.push('Allow: /');
      lines.push('');
      lines.push('User-agent: AdsBot-Google-Mobile');
      lines.push('Allow: /');
      lines.push('');
      appliedRules.push('User-agent: AdsBot-Google', 'Allow: /');
      appliedRules.push('User-agent: AdsBot-Google-Mobile', 'Allow: /');
    }

    // Default rules for all other bots
    lines.push('User-agent: *');
    appliedRules.push('User-agent: *');

    if (allowAll) {
      lines.push('Allow: /');
      appliedRules.push('Allow: /');
    }

    // Common paths to disallow
    const defaultDisallowPaths = [
      '/api/',
      '/admin/',
      '/private/',
      '/_next/',
      '/node_modules/',
      '/*.json$',
      '/*.map$',
      '/wp-admin/',
      '/cgi-bin/',
    ];

    const allDisallowPaths = [...new Set([...defaultDisallowPaths, ...disallowPaths])];

    for (const path of allDisallowPaths) {
      lines.push(`Disallow: ${path}`);
      appliedRules.push(`Disallow: ${path}`);
    }

    // Crawl delay for unknown bots
    lines.push('Crawl-delay: 1');
    appliedRules.push('Crawl-delay: 1');
    lines.push('');
  }

  // Add additional directives
  if (additionalDirectives.length > 0) {
    for (const directive of additionalDirectives) {
      lines.push(directive);
      appliedRules.push(directive);
    }
    lines.push('');
  }

  // Host directive (for Yandex)
  if (hostDirective && siteUrl) {
    const host = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    lines.push(`Host: ${host}`);
    appliedRules.push(`Host: ${host}`);
    lines.push('');
  }

  // Sitemaps

  if (sitemapUrl) {
    lines.push(`Sitemap: ${sitemapUrl}`);
    appliedRules.push(`Sitemap: ${sitemapUrl}`);
  }

  if (imageSitemapUrl) {
    lines.push(`Sitemap: ${imageSitemapUrl}`);
    appliedRules.push(`Sitemap: ${imageSitemapUrl}`);
  }

  if (videoSitemapUrl) {
    lines.push(`Sitemap: ${videoSitemapUrl}`);
    appliedRules.push(`Sitemap: ${videoSitemapUrl}`);
  }

  if (newsSitemapUrl) {
    lines.push(`Sitemap: ${newsSitemapUrl}`);
    appliedRules.push(`Sitemap: ${newsSitemapUrl}`);
  }

  return {
    content: lines.join('\n'),
    rules: appliedRules,
  };
}

/**
 * Generate robots.txt for common scenarios
 */
export const robotsPresets = {
  /**
   * Allow all crawling with comprehensive directives (recommended)
   */
  standard: (sitemapUrl?: string, siteUrl?: string): GeneratedRobotsTxt => {
    return generateRobotsTxt({
      allowAll: true,
      sitemapUrl,
      siteUrl,
      hostDirective: true,
      allowGoogleAds: true,
      blockAICrawlers: false,
    });
  },

  /**
   * Privacy-focused: Block AI crawlers, allow search engines
   */
  privacyFocused: (sitemapUrl?: string, siteUrl?: string): GeneratedRobotsTxt => {
    return generateRobotsTxt({
      allowAll: true,
      sitemapUrl,
      siteUrl,
      hostDirective: true,
      allowGoogleAds: true,
      blockAICrawlers: true,
    });
  },

  /**
   * Disallow all crawling (for staging/dev sites)
   */
  disallowAll: (): GeneratedRobotsTxt => {
    return generateRobotsTxt({
      rules: [{
        userAgent: '*',
        disallow: ['/'],
      }],
    });
  },

  /**
   * E-commerce optimized
   */
  ecommerce: (sitemapUrl?: string, siteUrl?: string): GeneratedRobotsTxt => {
    return generateRobotsTxt({
      allowAll: true,
      sitemapUrl,
      siteUrl,
      hostDirective: true,
      allowGoogleAds: true,
      disallowPaths: [
        '/cart/',
        '/checkout/',
        '/account/',
        '/wishlist/',
        '/compare/',
        '/*?*sort=',
        '/*?*filter=',
        '/*?*page=',
        '/*?*color=',
        '/*?*size=',
        '/search?',
      ],
    });
  },

  /**
   * Blog optimized
   */
  blog: (sitemapUrl?: string, siteUrl?: string): GeneratedRobotsTxt => {
    return generateRobotsTxt({
      allowAll: true,
      sitemapUrl,
      siteUrl,
      hostDirective: true,
      disallowPaths: [
        '/tag/*',
        '/category/*',
        '/author/*',
        '/*?*page=',
        '/feed/',
        '/comments/',
      ],
    });
  },

  /**
   * SaaS/App optimized
   */
  saas: (sitemapUrl?: string, siteUrl?: string): GeneratedRobotsTxt => {
    return generateRobotsTxt({
      allowAll: true,
      sitemapUrl,
      siteUrl,
      hostDirective: true,
      allowGoogleAds: true,
      disallowPaths: [
        '/app/',
        '/dashboard/',
        '/settings/',
        '/billing/',
        '/api/',
        '/webhooks/',
        '/oauth/',
        '/*.json$',
      ],
    });
  },
};

/**
 * Parse existing robots.txt
 */
export function parseRobotsTxt(content: string): {
  rules: RobotsRule[];
  sitemapUrl?: string;
  sitemaps: string[];
  host?: string;
} {
  const lines = content.split('\n');
  const rules: RobotsRule[] = [];
  let currentRule: RobotsRule | null = null;
  const sitemaps: string[] = [];
  let host: string | undefined;

  for (let line of lines) {
    // Remove comments and trim
    line = line.replace(/#.*$/, '').trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    switch (directive) {
      case 'user-agent':
        if (currentRule) {
          rules.push(currentRule);
        }
        currentRule = {
          userAgent: value,
          allow: [],
          disallow: [],
        };
        break;

      case 'allow':
        if (currentRule) {
          currentRule.allow!.push(value);
        }
        break;

      case 'disallow':
        if (currentRule) {
          currentRule.disallow!.push(value);
        }
        break;

      case 'crawl-delay':
        if (currentRule) {
          currentRule.crawlDelay = parseInt(value, 10);
        }
        break;

      case 'sitemap':
        sitemaps.push(value);
        break;

      case 'host':
        host = value;
        break;
    }
  }

  if (currentRule) {
    rules.push(currentRule);
  }

  return {
    rules,
    sitemapUrl: sitemaps[0],
    sitemaps,
    host,
  };
}

/**
 * Validate robots.txt
 */
export function validateRobotsTxt(content: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    userAgentCount: number;
    allowCount: number;
    disallowCount: number;
    sitemapCount: number;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = {
    userAgentCount: 0,
    allowCount: 0,
    disallowCount: 0,
    sitemapCount: 0,
  };

  const lines = content.split('\n');
  let hasUserAgent = false;
  let inUserAgentBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/#.*$/, '').trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      errors.push(`Line ${i + 1}: Invalid directive format`);
      continue;
    }

    const directive = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    switch (directive) {
      case 'user-agent':
        hasUserAgent = true;
        inUserAgentBlock = true;
        stats.userAgentCount++;
        if (!value) {
          errors.push(`Line ${i + 1}: User-agent value is empty`);
        }
        break;

      case 'allow':
        stats.allowCount++;
        if (!inUserAgentBlock) {
          warnings.push(`Line ${i + 1}: Allow before User-agent`);
        }
        break;

      case 'disallow':
        stats.disallowCount++;
        if (!inUserAgentBlock) {
          warnings.push(`Line ${i + 1}: Disallow before User-agent`);
        }
        break;

      case 'sitemap':
        stats.sitemapCount++;
        if (!value.startsWith('http')) {
          warnings.push(`Line ${i + 1}: Sitemap URL should be absolute`);
        }
        break;

      case 'crawl-delay':
        if (isNaN(parseInt(value, 10))) {
          errors.push(`Line ${i + 1}: Crawl-delay must be a number`);
        }
        break;

      case 'host':
        // Valid directive (Yandex)
        break;

      default:
        warnings.push(`Line ${i + 1}: Unknown directive "${directive}"`);
    }
  }

  if (!hasUserAgent) {
    errors.push('No User-agent directive found');
  }

  // Best practice warnings
  if (stats.sitemapCount === 0) {
    warnings.push('No Sitemap directive found - recommended for SEO');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}
