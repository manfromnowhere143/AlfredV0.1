# Alfred SEO Agent - Implementation Plan

## Executive Summary

The Alfred SEO Agent is a three-phase automated SEO system that provides enterprise-level search optimization to every user without requiring SEO knowledge.

**Key Differentiators:**
- Zero-knowledge required - works automatically
- AI-powered meta generation using Claude
- Auto-detected Schema.org markup
- Real-time SEO scoring
- One-click optimization
- Continuous monitoring and improvement

---

## 1. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ALFRED SEO AGENT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         SEO ORCHESTRATOR                              │  │
│  │                    (Coordinates all SEO operations)                   │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                          │
│          ┌───────────────────────┼───────────────────────┐                  │
│          │                       │                       │                  │
│          ▼                       ▼                       ▼                  │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐           │
│  │   ANALYZER    │      │   OPTIMIZER   │      │   MONITOR     │           │
│  │    ENGINE     │      │    ENGINE     │      │    ENGINE     │           │
│  │               │      │               │      │               │           │
│  │ • HTML Audit  │      │ • Meta Gen    │      │ • Rank Track  │           │
│  │ • Content     │      │ • Schema Gen  │      │ • Alerts      │           │
│  │ • Structure   │      │ • Sitemap     │      │ • Suggestions │           │
│  │ • Performance │      │ • Links       │      │ • Competitors │           │
│  └───────┬───────┘      └───────┬───────┘      └───────┬───────┘           │
│          │                       │                       │                  │
│          └───────────────────────┼───────────────────────┘                  │
│                                  │                                          │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         SEO DATA STORE                                │  │
│  │                                                                       │  │
│  │  • Project SEO Config    • Analysis Results    • Monitoring Data     │  │
│  │  • Schema Definitions    • Historical Scores   • Competitor Data     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Relationships

```typescript
// Core SEO Agent Structure
interface SEOAgent {
  analyzer: AnalyzerEngine;
  optimizer: OptimizerEngine;
  monitor: MonitorEngine;
  orchestrator: SEOOrchestrator;
}

interface AnalyzerEngine {
  analyzeHTML(html: string): HTMLAnalysis;
  analyzeContent(content: string): ContentAnalysis;
  analyzeStructure(files: ProjectFile[]): StructureAnalysis;
  analyzePerformance(html: string): PerformanceAnalysis;
  calculateScore(analyses: Analysis[]): SEOScore;
}

interface OptimizerEngine {
  generateMeta(content: string, context: BusinessContext): MetaTags;
  generateSchema(content: string, pageType: PageType): SchemaMarkup;
  generateSitemap(pages: Page[]): string;
  optimizeImages(images: ImageFile[]): OptimizedImage[];
  optimizeLinks(html: string): string;
}

interface MonitorEngine {
  trackRankings(keywords: string[]): RankingData;
  detectAlgorithmChanges(): AlgorithmUpdate[];
  analyzeCompetitors(competitors: string[]): CompetitorAnalysis;
  generateSuggestions(data: MonitoringData): Suggestion[];
}
```

---

## 2. Database Schema

### New Tables for SEO Agent

```sql
-- ============================================================================
-- SEO CONFIGURATION (Per Project)
-- ============================================================================

CREATE TABLE seo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Business Context (for AI-powered optimization)
  business_name VARCHAR(255),
  business_type VARCHAR(100), -- 'saas', 'ecommerce', 'local_business', 'blog', etc.
  target_audience TEXT,
  primary_keywords TEXT[], -- Array of target keywords
  secondary_keywords TEXT[],

  -- Geographic targeting
  target_locations TEXT[], -- ['United States', 'United Kingdom']
  local_business_info JSONB, -- For LocalBusiness schema

  -- Social/Brand
  social_profiles JSONB, -- { twitter: '@handle', facebook: 'url', ... }
  logo_url VARCHAR(500),
  brand_colors TEXT[],

  -- SEO Settings
  default_meta_title_template VARCHAR(255) DEFAULT '{page_title} | {business_name}',
  default_meta_description_template TEXT,
  robots_config JSONB DEFAULT '{"index": true, "follow": true}',
  canonical_base_url VARCHAR(500),

  -- Feature Flags
  auto_schema_detection BOOLEAN DEFAULT true,
  auto_sitemap_generation BOOLEAN DEFAULT true,
  auto_image_optimization BOOLEAN DEFAULT true,
  continuous_monitoring BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id)
);

-- ============================================================================
-- PAGE-LEVEL SEO DATA
-- ============================================================================

CREATE TABLE page_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_path VARCHAR(500) NOT NULL, -- '/about', '/products/widget'

  -- Meta Tags
  meta_title VARCHAR(70), -- Recommended max length
  meta_description VARCHAR(160), -- Recommended max length
  meta_keywords TEXT[],

  -- Open Graph
  og_title VARCHAR(95),
  og_description VARCHAR(200),
  og_image VARCHAR(500),
  og_type VARCHAR(50) DEFAULT 'website',

  -- Twitter Card
  twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
  twitter_title VARCHAR(70),
  twitter_description VARCHAR(200),
  twitter_image VARCHAR(500),

  -- Technical SEO
  canonical_url VARCHAR(500),
  robots_directive VARCHAR(100), -- 'index, follow', 'noindex, nofollow'
  structured_data JSONB, -- JSON-LD schema

  -- Analysis Results
  seo_score INTEGER, -- 0-100
  issues JSONB, -- Array of detected issues
  last_analyzed_at TIMESTAMPTZ,

  -- Content Metrics
  word_count INTEGER,
  reading_time_minutes INTEGER,
  heading_structure JSONB, -- { h1: [...], h2: [...], ... }
  internal_links_count INTEGER,
  external_links_count INTEGER,
  images_count INTEGER,
  images_with_alt INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, page_path)
);

-- ============================================================================
-- SEO ANALYSIS HISTORY
-- ============================================================================

CREATE TABLE seo_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Snapshot Data
  overall_score INTEGER NOT NULL,
  category_scores JSONB, -- { technical: 85, content: 72, onPage: 90, ... }
  issues_found JSONB, -- Array of all issues
  opportunities JSONB, -- Array of improvement opportunities

  -- Comparison
  score_change INTEGER, -- Compared to previous analysis
  issues_resolved INTEGER,
  new_issues INTEGER,

  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for time-series queries
  INDEX idx_seo_history_project_time (project_id, analyzed_at DESC)
);

-- ============================================================================
-- SCHEMA MARKUP LIBRARY
-- ============================================================================

CREATE TABLE schema_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  schema_type VARCHAR(100) NOT NULL, -- 'Organization', 'Product', 'FAQPage', etc.
  category VARCHAR(50), -- 'business', 'content', 'ecommerce', 'local'

  -- Template
  template JSONB NOT NULL, -- JSON-LD template with placeholders
  required_fields TEXT[],
  optional_fields TEXT[],

  -- Detection Rules
  detection_patterns JSONB, -- Patterns to auto-detect this schema type

  -- Metadata
  google_docs_url VARCHAR(500),
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- KEYWORD TRACKING (Phase 3)
-- ============================================================================

CREATE TABLE keyword_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  keyword VARCHAR(255) NOT NULL,
  search_volume INTEGER, -- Monthly searches
  keyword_difficulty INTEGER, -- 0-100

  -- Ranking History
  current_position INTEGER,
  best_position INTEGER,
  position_history JSONB, -- [{ date: '2024-01-15', position: 23 }, ...]

  -- Performance
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4),

  -- Status
  is_tracking BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, keyword)
);

-- ============================================================================
-- COMPETITOR TRACKING (Phase 3)
-- ============================================================================

CREATE TABLE competitor_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  competitor_url VARCHAR(500) NOT NULL,
  competitor_name VARCHAR(255),

  -- Metrics
  domain_authority INTEGER,
  estimated_traffic INTEGER,
  keyword_overlap INTEGER, -- Number of shared keywords

  -- Analysis
  strengths JSONB,
  weaknesses JSONB,
  content_gaps JSONB, -- Keywords they rank for that we don't

  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, competitor_url)
);

-- ============================================================================
-- SEO ALERTS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE seo_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  alert_type VARCHAR(50) NOT NULL, -- 'ranking_drop', 'new_opportunity', 'issue_detected'
  severity VARCHAR(20) DEFAULT 'info', -- 'critical', 'warning', 'info', 'success'

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Related Data
  related_keyword VARCHAR(255),
  related_page VARCHAR(500),
  metadata JSONB,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Drizzle Schema (TypeScript)

```typescript
// packages/database/src/schema/seo.ts

import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp, decimal, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { projects, users } from './core';

export const seoConfig = pgTable('seo_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Business Context
  businessName: varchar('business_name', { length: 255 }),
  businessType: varchar('business_type', { length: 100 }),
  targetAudience: text('target_audience'),
  primaryKeywords: text('primary_keywords').array(),
  secondaryKeywords: text('secondary_keywords').array(),

  // Geographic
  targetLocations: text('target_locations').array(),
  localBusinessInfo: jsonb('local_business_info'),

  // Social
  socialProfiles: jsonb('social_profiles'),
  logoUrl: varchar('logo_url', { length: 500 }),
  brandColors: text('brand_colors').array(),

  // Templates
  defaultMetaTitleTemplate: varchar('default_meta_title_template', { length: 255 }).default('{page_title} | {business_name}'),
  defaultMetaDescriptionTemplate: text('default_meta_description_template'),
  robotsConfig: jsonb('robots_config').default({ index: true, follow: true }),
  canonicalBaseUrl: varchar('canonical_base_url', { length: 500 }),

  // Feature Flags
  autoSchemaDetection: boolean('auto_schema_detection').default(true),
  autoSitemapGeneration: boolean('auto_sitemap_generation').default(true),
  autoImageOptimization: boolean('auto_image_optimization').default(true),
  continuousMonitoring: boolean('continuous_monitoring').default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  projectIdx: uniqueIndex('seo_config_project_idx').on(table.projectId),
}));

export const pageSeo = pgTable('page_seo', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  pagePath: varchar('page_path', { length: 500 }).notNull(),

  // Meta Tags
  metaTitle: varchar('meta_title', { length: 70 }),
  metaDescription: varchar('meta_description', { length: 160 }),
  metaKeywords: text('meta_keywords').array(),

  // Open Graph
  ogTitle: varchar('og_title', { length: 95 }),
  ogDescription: varchar('og_description', { length: 200 }),
  ogImage: varchar('og_image', { length: 500 }),
  ogType: varchar('og_type', { length: 50 }).default('website'),

  // Twitter
  twitterCard: varchar('twitter_card', { length: 50 }).default('summary_large_image'),
  twitterTitle: varchar('twitter_title', { length: 70 }),
  twitterDescription: varchar('twitter_description', { length: 200 }),
  twitterImage: varchar('twitter_image', { length: 500 }),

  // Technical
  canonicalUrl: varchar('canonical_url', { length: 500 }),
  robotsDirective: varchar('robots_directive', { length: 100 }),
  structuredData: jsonb('structured_data'),

  // Analysis
  seoScore: integer('seo_score'),
  issues: jsonb('issues'),
  lastAnalyzedAt: timestamp('last_analyzed_at'),

  // Content Metrics
  wordCount: integer('word_count'),
  readingTimeMinutes: integer('reading_time_minutes'),
  headingStructure: jsonb('heading_structure'),
  internalLinksCount: integer('internal_links_count'),
  externalLinksCount: integer('external_links_count'),
  imagesCount: integer('images_count'),
  imagesWithAlt: integer('images_with_alt'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  projectPageIdx: uniqueIndex('page_seo_project_page_idx').on(table.projectId, table.pagePath),
}));

export const seoAnalysisHistory = pgTable('seo_analysis_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  overallScore: integer('overall_score').notNull(),
  categoryScores: jsonb('category_scores'),
  issuesFound: jsonb('issues_found'),
  opportunities: jsonb('opportunities'),

  scoreChange: integer('score_change'),
  issuesResolved: integer('issues_resolved'),
  newIssues: integer('new_issues'),

  analyzedAt: timestamp('analyzed_at').defaultNow(),
}, (table) => ({
  projectTimeIdx: index('seo_history_project_time_idx').on(table.projectId, table.analyzedAt),
}));

export const keywordTracking = pgTable('keyword_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  keyword: varchar('keyword', { length: 255 }).notNull(),
  searchVolume: integer('search_volume'),
  keywordDifficulty: integer('keyword_difficulty'),

  currentPosition: integer('current_position'),
  bestPosition: integer('best_position'),
  positionHistory: jsonb('position_history'),

  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  ctr: decimal('ctr', { precision: 5, scale: 4 }),

  isTracking: boolean('is_tracking').default(true),
  lastCheckedAt: timestamp('last_checked_at'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  projectKeywordIdx: uniqueIndex('keyword_tracking_project_keyword_idx').on(table.projectId, table.keyword),
}));

export const seoAlerts = pgTable('seo_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),

  alertType: varchar('alert_type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).default('info'),

  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),

  relatedKeyword: varchar('related_keyword', { length: 255 }),
  relatedPage: varchar('related_page', { length: 500 }),
  metadata: jsonb('metadata'),

  isRead: boolean('is_read').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  actionTaken: boolean('action_taken').default(false),

  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 3. Phase 1: Foundation SEO (During Generation)

### 3.1 HTML Structure Enforcement

Every generated page MUST include:

```typescript
// lib/seo/foundation/html-structure.ts

export interface RequiredHTMLStructure {
  // Document Structure
  doctype: '<!DOCTYPE html>';
  htmlLang: string; // <html lang="en">

  // Head Requirements
  head: {
    charset: '<meta charset="UTF-8">';
    viewport: '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    title: string; // Required, max 60 chars
    metaDescription: string; // Required, max 160 chars
    canonical: string; // Required
    robots: string; // Default: 'index, follow'
  };

  // Heading Hierarchy
  headings: {
    h1: { count: 1; maxLength: 70 }; // Exactly ONE H1
    h2: { minCount: 1 }; // At least one H2
    hierarchy: 'sequential'; // No skipping levels
  };

  // Image Requirements
  images: {
    altRequired: true;
    lazyLoading: 'below-fold'; // Only lazy-load below fold
    dimensionsRequired: true; // width/height for CLS
  };

  // Link Requirements
  links: {
    externalRel: 'noopener'; // Security
    descriptiveText: true; // No "click here"
  };
}

export function enforceHTMLStructure(html: string): {
  valid: boolean;
  issues: SEOIssue[];
  fixed: string;
} {
  const issues: SEOIssue[] = [];
  let fixed = html;

  // Check and fix doctype
  if (!html.startsWith('<!DOCTYPE html>')) {
    issues.push({
      code: 'MISSING_DOCTYPE',
      severity: 'critical',
      message: 'Missing DOCTYPE declaration',
      autoFix: true,
    });
    fixed = '<!DOCTYPE html>\n' + fixed;
  }

  // Check html lang attribute
  const htmlTagMatch = fixed.match(/<html([^>]*)>/);
  if (!htmlTagMatch || !htmlTagMatch[1].includes('lang=')) {
    issues.push({
      code: 'MISSING_HTML_LANG',
      severity: 'warning',
      message: 'Missing lang attribute on <html>',
      autoFix: true,
    });
    fixed = fixed.replace(/<html([^>]*)>/, '<html$1 lang="en">');
  }

  // Check for single H1
  const h1Matches = fixed.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    issues.push({
      code: 'MISSING_H1',
      severity: 'critical',
      message: 'Page is missing an H1 heading',
      autoFix: false,
    });
  } else if (h1Matches.length > 1) {
    issues.push({
      code: 'MULTIPLE_H1',
      severity: 'warning',
      message: `Page has ${h1Matches.length} H1 headings (should have exactly 1)`,
      autoFix: false,
    });
  }

  // Check images for alt text
  const imgTags = fixed.match(/<img[^>]*>/gi) || [];
  for (const img of imgTags) {
    if (!img.includes('alt=')) {
      issues.push({
        code: 'MISSING_ALT_TEXT',
        severity: 'warning',
        message: 'Image missing alt attribute',
        element: img,
        autoFix: false, // Requires AI to generate appropriate alt
      });
    }

    // Add loading="lazy" for images (except first few)
    if (!img.includes('loading=')) {
      // Will be handled by image optimizer
    }

    // Check for dimensions
    if (!img.includes('width=') || !img.includes('height=')) {
      issues.push({
        code: 'MISSING_IMAGE_DIMENSIONS',
        severity: 'info',
        message: 'Image missing width/height (causes CLS)',
        element: img,
        autoFix: true,
      });
    }
  }

  return { valid: issues.filter(i => i.severity === 'critical').length === 0, issues, fixed };
}
```

### 3.2 Default Meta Tags Template

```typescript
// lib/seo/foundation/meta-tags.ts

export function generateDefaultMetaTags(page: PageInfo, config: SEOConfig): string {
  const title = page.title || config.businessName || 'Untitled Page';
  const description = page.description || config.defaultMetaDescriptionTemplate || '';
  const url = `${config.canonicalBaseUrl}${page.path}`;
  const image = page.ogImage || config.logoUrl || '';

  return `
    <!-- Primary Meta Tags -->
    <title>${truncate(title, 60)}</title>
    <meta name="title" content="${truncate(title, 60)}">
    <meta name="description" content="${truncate(description, 160)}">

    <!-- Canonical -->
    <link rel="canonical" href="${url}">

    <!-- Robots -->
    <meta name="robots" content="${config.robotsConfig.index ? 'index' : 'noindex'}, ${config.robotsConfig.follow ? 'follow' : 'nofollow'}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${page.ogType || 'website'}">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${truncate(page.ogTitle || title, 95)}">
    <meta property="og:description" content="${truncate(page.ogDescription || description, 200)}">
    ${image ? `<meta property="og:image" content="${image}">` : ''}

    <!-- Twitter -->
    <meta property="twitter:card" content="${page.twitterCard || 'summary_large_image'}">
    <meta property="twitter:url" content="${url}">
    <meta property="twitter:title" content="${truncate(page.twitterTitle || title, 70)}">
    <meta property="twitter:description" content="${truncate(page.twitterDescription || description, 200)}">
    ${image ? `<meta property="twitter:image" content="${image}">` : ''}

    <!-- Additional SEO -->
    <meta name="author" content="${config.businessName}">
    <meta name="generator" content="Alfred Pro Builder">
  `.trim();
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
```

### 3.3 Automatic Image Alt Generation

```typescript
// lib/seo/foundation/image-optimizer.ts

export async function generateImageAlt(
  imageUrl: string,
  pageContext: string,
  existingAlt?: string
): Promise<string> {
  // If alt exists and is good, keep it
  if (existingAlt && existingAlt.length > 10 && !isGenericAlt(existingAlt)) {
    return existingAlt;
  }

  // Use Claude to analyze image context and generate alt
  const prompt = `Generate a concise, descriptive alt text for an image.

Context about the page: ${pageContext}

Requirements:
- Be descriptive but concise (under 125 characters)
- Don't start with "Image of" or "Picture of"
- Include relevant keywords naturally
- Describe what's important about the image
- Be accessible to screen reader users

Generate ONLY the alt text, nothing else.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Fast and cheap for this task
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text.trim();
}

function isGenericAlt(alt: string): boolean {
  const genericPatterns = [
    /^image$/i,
    /^img$/i,
    /^photo$/i,
    /^picture$/i,
    /^untitled$/i,
    /^placeholder$/i,
    /^\d+$/,
    /^img_\d+$/i,
    /^dsc_?\d+$/i,
  ];
  return genericPatterns.some(pattern => pattern.test(alt.trim()));
}
```

### 3.4 Phase 1 Integration Point

```typescript
// lib/seo/foundation/index.ts

export async function applyFoundationSEO(
  projectFiles: ProjectFile[],
  config: SEOConfig
): Promise<{
  files: ProjectFile[];
  score: number;
  issues: SEOIssue[];
}> {
  const issues: SEOIssue[] = [];
  const processedFiles: ProjectFile[] = [];

  for (const file of projectFiles) {
    if (!file.path.endsWith('.html') && !file.path.endsWith('.tsx')) {
      processedFiles.push(file);
      continue;
    }

    let content = file.content;

    // 1. Enforce HTML structure
    const structureResult = enforceHTMLStructure(content);
    issues.push(...structureResult.issues);
    content = structureResult.fixed;

    // 2. Add/update meta tags
    if (content.includes('<head>')) {
      const metaTags = generateDefaultMetaTags(
        extractPageInfo(content, file.path),
        config
      );
      content = injectMetaTags(content, metaTags);
    }

    // 3. Process images
    const imageResults = await processImages(content, config);
    issues.push(...imageResults.issues);
    content = imageResults.content;

    processedFiles.push({ ...file, content });
  }

  // Calculate foundation score (out of 100, but this is just Phase 1)
  const score = calculateFoundationScore(issues);

  return { files: processedFiles, score, issues };
}
```

---

## 4. Phase 2: Pre-Deploy Optimization

### 4.1 SEO Analysis Engine

```typescript
// lib/seo/analyzer/index.ts

export interface SEOAnalysis {
  overallScore: number;
  categories: {
    technical: CategoryScore;
    content: CategoryScore;
    onPage: CategoryScore;
    ux: CategoryScore;
    schema: CategoryScore;
  };
  issues: SEOIssue[];
  opportunities: SEOOpportunity[];
  competitorComparison?: CompetitorComparison;
}

export interface CategoryScore {
  score: number; // 0-100
  weight: number; // How much this category affects overall score
  checks: SEOCheck[];
}

export interface SEOCheck {
  id: string;
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  impact: 'high' | 'medium' | 'low';
  howToFix?: string;
  autoFixable: boolean;
}

// ============================================================================
// ANALYSIS CHECKLIST (50+ checks)
// ============================================================================

export const SEO_CHECKS: Record<string, SEOCheckDefinition> = {
  // TECHNICAL (Weight: 25%)
  HTTPS: {
    category: 'technical',
    name: 'HTTPS Enabled',
    check: (url) => url.startsWith('https://'),
    impact: 'high',
    autoFixable: false,
  },
  MOBILE_FRIENDLY: {
    category: 'technical',
    name: 'Mobile Responsive',
    check: (html) => html.includes('viewport'),
    impact: 'high',
    autoFixable: true,
  },
  PAGE_SPEED: {
    category: 'technical',
    name: 'Page Load Speed',
    check: async (html) => estimateLoadTime(html) < 3000,
    impact: 'high',
    autoFixable: true,
  },
  CANONICAL_TAG: {
    category: 'technical',
    name: 'Canonical URL Set',
    check: (html) => html.includes('rel="canonical"'),
    impact: 'medium',
    autoFixable: true,
  },
  SITEMAP_EXISTS: {
    category: 'technical',
    name: 'XML Sitemap',
    check: (files) => files.some(f => f.path === '/sitemap.xml'),
    impact: 'medium',
    autoFixable: true,
  },
  ROBOTS_TXT: {
    category: 'technical',
    name: 'Robots.txt File',
    check: (files) => files.some(f => f.path === '/robots.txt'),
    impact: 'medium',
    autoFixable: true,
  },
  NO_BROKEN_LINKS: {
    category: 'technical',
    name: 'No Broken Links',
    check: async (html) => (await findBrokenLinks(html)).length === 0,
    impact: 'medium',
    autoFixable: false,
  },

  // CONTENT (Weight: 30%)
  TITLE_TAG: {
    category: 'content',
    name: 'Title Tag Exists',
    check: (html) => /<title>[^<]+<\/title>/.test(html),
    impact: 'high',
    autoFixable: true,
  },
  TITLE_LENGTH: {
    category: 'content',
    name: 'Title Length (50-60 chars)',
    check: (html) => {
      const match = html.match(/<title>([^<]+)<\/title>/);
      return match && match[1].length >= 50 && match[1].length <= 60;
    },
    impact: 'medium',
    autoFixable: true,
  },
  META_DESCRIPTION: {
    category: 'content',
    name: 'Meta Description Exists',
    check: (html) => /name="description"/.test(html),
    impact: 'high',
    autoFixable: true,
  },
  META_DESCRIPTION_LENGTH: {
    category: 'content',
    name: 'Meta Description Length (150-160 chars)',
    check: (html) => {
      const match = html.match(/name="description"\s+content="([^"]+)"/);
      return match && match[1].length >= 150 && match[1].length <= 160;
    },
    impact: 'medium',
    autoFixable: true,
  },
  H1_EXISTS: {
    category: 'content',
    name: 'H1 Tag Exists',
    check: (html) => /<h1[^>]*>/.test(html),
    impact: 'high',
    autoFixable: false,
  },
  H1_UNIQUE: {
    category: 'content',
    name: 'Single H1 Tag',
    check: (html) => (html.match(/<h1[^>]*>/g) || []).length === 1,
    impact: 'medium',
    autoFixable: false,
  },
  HEADING_HIERARCHY: {
    category: 'content',
    name: 'Proper Heading Hierarchy',
    check: (html) => checkHeadingHierarchy(html),
    impact: 'medium',
    autoFixable: false,
  },
  CONTENT_LENGTH: {
    category: 'content',
    name: 'Sufficient Content (300+ words)',
    check: (html) => extractTextContent(html).split(/\s+/).length >= 300,
    impact: 'medium',
    autoFixable: false,
  },
  KEYWORD_IN_TITLE: {
    category: 'content',
    name: 'Primary Keyword in Title',
    check: (html, config) => {
      const title = extractTitle(html);
      return config.primaryKeywords?.some(kw =>
        title.toLowerCase().includes(kw.toLowerCase())
      );
    },
    impact: 'high',
    autoFixable: true,
  },
  KEYWORD_IN_H1: {
    category: 'content',
    name: 'Primary Keyword in H1',
    check: (html, config) => {
      const h1 = extractH1(html);
      return config.primaryKeywords?.some(kw =>
        h1.toLowerCase().includes(kw.toLowerCase())
      );
    },
    impact: 'high',
    autoFixable: false,
  },
  KEYWORD_DENSITY: {
    category: 'content',
    name: 'Keyword Density (1-3%)',
    check: (html, config) => {
      const density = calculateKeywordDensity(html, config.primaryKeywords?.[0] || '');
      return density >= 0.01 && density <= 0.03;
    },
    impact: 'medium',
    autoFixable: false,
  },

  // ON-PAGE (Weight: 20%)
  IMAGE_ALT_TAGS: {
    category: 'onPage',
    name: 'All Images Have Alt Text',
    check: (html) => {
      const images = html.match(/<img[^>]*>/g) || [];
      return images.every(img => /alt="[^"]*"/.test(img));
    },
    impact: 'medium',
    autoFixable: true,
  },
  IMAGE_OPTIMIZATION: {
    category: 'onPage',
    name: 'Images Optimized',
    check: (html) => {
      const images = html.match(/<img[^>]*>/g) || [];
      return images.every(img => /loading="lazy"/.test(img) || !/loading/.test(img));
    },
    impact: 'medium',
    autoFixable: true,
  },
  INTERNAL_LINKS: {
    category: 'onPage',
    name: 'Has Internal Links',
    check: (html) => countInternalLinks(html) >= 2,
    impact: 'medium',
    autoFixable: false,
  },
  EXTERNAL_LINKS: {
    category: 'onPage',
    name: 'Has External Links',
    check: (html) => countExternalLinks(html) >= 1,
    impact: 'low',
    autoFixable: false,
  },
  DESCRIPTIVE_ANCHOR_TEXT: {
    category: 'onPage',
    name: 'Descriptive Link Text',
    check: (html) => !hasGenericLinkText(html),
    impact: 'medium',
    autoFixable: false,
  },

  // UX (Weight: 15%)
  MOBILE_VIEWPORT: {
    category: 'ux',
    name: 'Mobile Viewport Set',
    check: (html) => html.includes('width=device-width'),
    impact: 'high',
    autoFixable: true,
  },
  READABLE_FONT_SIZE: {
    category: 'ux',
    name: 'Readable Font Size (16px+)',
    check: (css) => !css.includes('font-size: 12px') && !css.includes('font-size: 14px'),
    impact: 'medium',
    autoFixable: true,
  },
  TAP_TARGET_SIZE: {
    category: 'ux',
    name: 'Adequate Tap Targets',
    check: (html) => checkTapTargets(html),
    impact: 'medium',
    autoFixable: false,
  },
  NO_INTRUSIVE_INTERSTITIALS: {
    category: 'ux',
    name: 'No Intrusive Pop-ups',
    check: (html) => !hasIntrusiveInterstitials(html),
    impact: 'medium',
    autoFixable: false,
  },

  // SCHEMA (Weight: 10%)
  HAS_SCHEMA: {
    category: 'schema',
    name: 'Has Structured Data',
    check: (html) => html.includes('application/ld+json'),
    impact: 'medium',
    autoFixable: true,
  },
  VALID_SCHEMA: {
    category: 'schema',
    name: 'Valid Schema Markup',
    check: (html) => validateSchemaMarkup(html),
    impact: 'medium',
    autoFixable: true,
  },
  ORGANIZATION_SCHEMA: {
    category: 'schema',
    name: 'Organization Schema',
    check: (html) => html.includes('"@type":"Organization"') || html.includes('"@type": "Organization"'),
    impact: 'low',
    autoFixable: true,
  },
  WEBSITE_SCHEMA: {
    category: 'schema',
    name: 'WebSite Schema with Search',
    check: (html) => html.includes('"@type":"WebSite"') && html.includes('SearchAction'),
    impact: 'low',
    autoFixable: true,
  },
};

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export async function analyzeProject(
  files: ProjectFile[],
  config: SEOConfig
): Promise<SEOAnalysis> {
  const checkResults: SEOCheck[] = [];

  // Find main HTML file
  const htmlFile = files.find(f => f.path === '/index.html' || f.path.endsWith('.html'));
  const html = htmlFile?.content || '';

  // Find CSS
  const cssFile = files.find(f => f.path.endsWith('.css'));
  const css = cssFile?.content || '';

  // Run all checks
  for (const [checkId, checkDef] of Object.entries(SEO_CHECKS)) {
    try {
      let passed: boolean;

      if (checkDef.category === 'technical' && checkId === 'SITEMAP_EXISTS') {
        passed = await checkDef.check(files);
      } else if (checkDef.category === 'ux' && checkId === 'READABLE_FONT_SIZE') {
        passed = checkDef.check(css);
      } else {
        passed = await checkDef.check(html, config);
      }

      checkResults.push({
        id: checkId,
        name: checkDef.name,
        status: passed ? 'pass' : 'fail',
        message: passed ? `${checkDef.name} ✓` : `${checkDef.name} needs attention`,
        impact: checkDef.impact,
        autoFixable: checkDef.autoFixable,
      });
    } catch (error) {
      checkResults.push({
        id: checkId,
        name: checkDef.name,
        status: 'warning',
        message: `Could not check: ${checkDef.name}`,
        impact: checkDef.impact,
        autoFixable: false,
      });
    }
  }

  // Calculate scores by category
  const categories = calculateCategoryScores(checkResults);

  // Calculate overall score
  const overallScore = calculateOverallScore(categories);

  // Generate issues and opportunities
  const issues = checkResults
    .filter(c => c.status === 'fail')
    .map(c => ({
      code: c.id,
      severity: c.impact === 'high' ? 'critical' : c.impact === 'medium' ? 'warning' : 'info',
      message: c.message,
      autoFix: c.autoFixable,
    }));

  const opportunities = generateOpportunities(checkResults, config);

  return {
    overallScore,
    categories,
    issues,
    opportunities,
  };
}
```

### 4.2 Schema Detection & Generation

```typescript
// lib/seo/optimizer/schema-generator.ts

export interface SchemaDetectionResult {
  detectedTypes: SchemaType[];
  confidence: number;
  suggestedSchema: object;
}

export type SchemaType =
  | 'WebSite'
  | 'Organization'
  | 'LocalBusiness'
  | 'Product'
  | 'Service'
  | 'FAQPage'
  | 'Article'
  | 'BlogPosting'
  | 'BreadcrumbList'
  | 'HowTo'
  | 'Recipe'
  | 'Event'
  | 'Review'
  | 'Person'
  | 'VideoObject'
  | 'Course'
  | 'JobPosting'
  | 'SoftwareApplication';

// Detection patterns for each schema type
const SCHEMA_PATTERNS: Record<SchemaType, DetectionPattern> = {
  FAQPage: {
    patterns: [
      /frequently\s+asked\s+questions/i,
      /faq/i,
      /<details[^>]*>.*?<summary/is,
      /\?.*<\/h[2-4]>/i, // Questions in headings
    ],
    requiredMatches: 2,
    confidence: 0.8,
  },
  Product: {
    patterns: [
      /\$\d+(?:\.\d{2})?/, // Price pattern
      /add\s+to\s+cart/i,
      /buy\s+now/i,
      /in\s+stock/i,
      /out\s+of\s+stock/i,
      /product/i,
    ],
    requiredMatches: 2,
    confidence: 0.7,
  },
  LocalBusiness: {
    patterns: [
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // Phone
      /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)/i, // Address
      /hours|open|closed/i,
      /visit\s+us/i,
    ],
    requiredMatches: 2,
    confidence: 0.7,
  },
  Article: {
    patterns: [
      /<article/i,
      /published|posted|written\s+by/i,
      /<time[^>]*datetime/i,
      /author/i,
    ],
    requiredMatches: 2,
    confidence: 0.7,
  },
  HowTo: {
    patterns: [
      /how\s+to/i,
      /step\s+\d+/i,
      /steps?:/i,
      /instructions?:/i,
      /<ol[^>]*>.*?<li/is,
    ],
    requiredMatches: 2,
    confidence: 0.75,
  },
  Recipe: {
    patterns: [
      /ingredients?:/i,
      /\d+\s*(cups?|tablespoons?|teaspoons?|oz|ml|g|kg)/i,
      /prep\s+time/i,
      /cook\s+time/i,
      /servings?:/i,
    ],
    requiredMatches: 3,
    confidence: 0.85,
  },
  Event: {
    patterns: [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Date
      /register|rsvp|tickets?/i,
      /event|conference|meetup|webinar/i,
      /location|venue/i,
    ],
    requiredMatches: 2,
    confidence: 0.7,
  },
  Course: {
    patterns: [
      /enroll|register/i,
      /course|class|lesson/i,
      /curriculum|syllabus/i,
      /instructor|teacher/i,
    ],
    requiredMatches: 2,
    confidence: 0.7,
  },
  JobPosting: {
    patterns: [
      /job\s+(description|posting|opening)/i,
      /apply\s+now/i,
      /salary|compensation/i,
      /requirements|qualifications/i,
      /full[- ]time|part[- ]time|contract/i,
    ],
    requiredMatches: 3,
    confidence: 0.8,
  },
  SoftwareApplication: {
    patterns: [
      /download|install/i,
      /app|application|software/i,
      /version\s+\d/i,
      /ios|android|windows|mac/i,
      /free|premium|pro/i,
    ],
    requiredMatches: 2,
    confidence: 0.7,
  },
};

export async function detectSchemaTypes(
  html: string,
  config: SEOConfig
): Promise<SchemaDetectionResult[]> {
  const results: SchemaDetectionResult[] = [];

  // Always include WebSite and Organization
  results.push({
    detectedTypes: ['WebSite'],
    confidence: 1.0,
    suggestedSchema: generateWebSiteSchema(config),
  });

  if (config.businessName) {
    results.push({
      detectedTypes: ['Organization'],
      confidence: 1.0,
      suggestedSchema: generateOrganizationSchema(config),
    });
  }

  // Detect content-specific schemas
  for (const [schemaType, pattern] of Object.entries(SCHEMA_PATTERNS)) {
    const matches = pattern.patterns.filter(p => p.test(html)).length;

    if (matches >= pattern.requiredMatches) {
      const confidence = Math.min(
        pattern.confidence + (matches - pattern.requiredMatches) * 0.05,
        0.95
      );

      results.push({
        detectedTypes: [schemaType as SchemaType],
        confidence,
        suggestedSchema: await generateSchemaForType(schemaType as SchemaType, html, config),
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// SCHEMA GENERATORS
// ============================================================================

export function generateWebSiteSchema(config: SEOConfig): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.businessName,
    url: config.canonicalBaseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${config.canonicalBaseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateOrganizationSchema(config: SEOConfig): object {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.businessName,
    url: config.canonicalBaseUrl,
  };

  if (config.logoUrl) {
    schema.logo = config.logoUrl;
  }

  if (config.socialProfiles) {
    schema.sameAs = Object.values(config.socialProfiles).filter(Boolean);
  }

  return schema;
}

export function generateLocalBusinessSchema(config: SEOConfig): object {
  const localInfo = config.localBusinessInfo || {};

  return {
    '@context': 'https://schema.org',
    '@type': localInfo.type || 'LocalBusiness',
    name: config.businessName,
    url: config.canonicalBaseUrl,
    telephone: localInfo.phone,
    address: localInfo.address ? {
      '@type': 'PostalAddress',
      streetAddress: localInfo.address.street,
      addressLocality: localInfo.address.city,
      addressRegion: localInfo.address.state,
      postalCode: localInfo.address.zip,
      addressCountry: localInfo.address.country || 'US',
    } : undefined,
    geo: localInfo.coordinates ? {
      '@type': 'GeoCoordinates',
      latitude: localInfo.coordinates.lat,
      longitude: localInfo.coordinates.lng,
    } : undefined,
    openingHoursSpecification: localInfo.hours?.map((h: any) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
  };
}

export async function generateFAQSchema(html: string): Promise<object> {
  // Use AI to extract Q&A pairs from content
  const qaPrompt = `Extract all question and answer pairs from this HTML content.
Return as JSON array: [{ "question": "...", "answer": "..." }]

HTML:
${html.slice(0, 5000)}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2000,
    messages: [{ role: 'user', content: qaPrompt }],
  });

  try {
    const qaPairs = JSON.parse(response.content[0].text);

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: qaPairs.map((qa: any) => ({
        '@type': 'Question',
        name: qa.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: qa.answer,
        },
      })),
    };
  } catch {
    return {};
  }
}

export async function generateProductSchema(html: string, config: SEOConfig): Promise<object> {
  // Extract product info using AI
  const extractPrompt = `Extract product information from this HTML.
Return JSON: { "name": "", "description": "", "price": "", "currency": "USD", "availability": "InStock", "image": "" }

HTML:
${html.slice(0, 5000)}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [{ role: 'user', content: extractPrompt }],
  });

  try {
    const product = JSON.parse(response.content[0].text);

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.image,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency,
        availability: `https://schema.org/${product.availability}`,
        url: config.canonicalBaseUrl,
      },
    };
  } catch {
    return {};
  }
}

// Export function to generate all detected schemas
export async function generateAllSchemas(
  html: string,
  config: SEOConfig
): Promise<string> {
  const detectedSchemas = await detectSchemaTypes(html, config);

  const schemas = detectedSchemas
    .filter(s => s.confidence >= 0.7)
    .map(s => s.suggestedSchema)
    .filter(s => Object.keys(s).length > 0);

  // Return as script tag
  return schemas.map(schema =>
    `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`
  ).join('\n');
}
```

### 4.3 AI Meta Tag Generation

```typescript
// lib/seo/optimizer/meta-generator.ts

export interface MetaGenerationResult {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}

export async function generateOptimizedMeta(
  content: string,
  config: SEOConfig,
  pageType: string = 'page'
): Promise<MetaGenerationResult> {
  const prompt = `You are an expert SEO copywriter. Generate optimized meta tags for this webpage.

BUSINESS CONTEXT:
- Business Name: ${config.businessName || 'Unknown'}
- Business Type: ${config.businessType || 'website'}
- Target Keywords: ${config.primaryKeywords?.join(', ') || 'none specified'}
- Target Audience: ${config.targetAudience || 'general'}

PAGE CONTENT:
${extractTextContent(content).slice(0, 3000)}

REQUIREMENTS:
1. Title Tag (50-60 characters):
   - Include primary keyword near the beginning
   - Include brand name at end (if space permits)
   - Make it compelling and click-worthy
   - Avoid keyword stuffing

2. Meta Description (150-160 characters):
   - Include a call-to-action
   - Naturally include 1-2 keywords
   - Summarize the page value proposition
   - Create urgency or curiosity

3. Open Graph Title (up to 95 characters):
   - Optimized for social sharing
   - Can be more casual/engaging than SEO title

4. Open Graph Description (up to 200 characters):
   - Compelling for social media
   - Include emoji if appropriate for brand
   - Focus on benefits

5. Twitter variants (same rules as OG)

Return ONLY valid JSON in this exact format:
{
  "title": "...",
  "description": "...",
  "ogTitle": "...",
  "ogDescription": "...",
  "twitterTitle": "...",
  "twitterDescription": "..."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const result = JSON.parse(response.content[0].text);

    // Validate lengths
    return {
      title: truncate(result.title, 60),
      description: truncate(result.description, 160),
      ogTitle: truncate(result.ogTitle, 95),
      ogDescription: truncate(result.ogDescription, 200),
      twitterTitle: truncate(result.twitterTitle, 70),
      twitterDescription: truncate(result.twitterDescription, 200),
    };
  } catch (error) {
    console.error('Failed to parse meta generation response:', error);
    throw new Error('Failed to generate meta tags');
  }
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3).trim() + '...';
}
```

### 4.4 Sitemap Generation

```typescript
// lib/seo/optimizer/sitemap-generator.ts

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemap(
  pages: { path: string; updatedAt?: Date }[],
  baseUrl: string
): string {
  const entries: SitemapEntry[] = pages.map(page => {
    // Determine priority based on path depth
    const depth = page.path.split('/').filter(Boolean).length;
    let priority = 1.0 - (depth * 0.1);
    priority = Math.max(0.1, Math.min(1.0, priority));

    // Homepage always highest priority
    if (page.path === '/' || page.path === '/index.html') {
      priority = 1.0;
    }

    // Determine change frequency
    let changefreq: SitemapEntry['changefreq'] = 'monthly';
    if (page.path === '/') changefreq = 'daily';
    if (page.path.includes('/blog/')) changefreq = 'weekly';

    return {
      loc: `${baseUrl}${page.path.replace(/\/index\.html$/, '/')}`,
      lastmod: page.updatedAt?.toISOString().split('T')[0],
      changefreq,
      priority,
    };
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority.toFixed(1)}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

export function generateRobotsTxt(
  baseUrl: string,
  options: {
    disallowPaths?: string[];
    allowPaths?: string[];
    crawlDelay?: number;
  } = {}
): string {
  const lines: string[] = [
    '# Robots.txt generated by Alfred Pro',
    '',
    'User-agent: *',
  ];

  // Add disallow rules
  if (options.disallowPaths?.length) {
    for (const path of options.disallowPaths) {
      lines.push(`Disallow: ${path}`);
    }
  }

  // Add allow rules
  if (options.allowPaths?.length) {
    for (const path of options.allowPaths) {
      lines.push(`Allow: ${path}`);
    }
  }

  // Add crawl delay if specified
  if (options.crawlDelay) {
    lines.push(`Crawl-delay: ${options.crawlDelay}`);
  }

  // Add sitemap reference
  lines.push('');
  lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);

  return lines.join('\n');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

---

## 5. Phase 3: Continuous Monitoring

### 5.1 Monitoring Architecture

```typescript
// lib/seo/monitor/index.ts

export interface MonitoringConfig {
  projectId: string;
  keywords: string[];
  competitors: string[];
  alertThresholds: {
    rankingDropPercent: number; // Alert if rank drops by this %
    scoreDropPoints: number; // Alert if SEO score drops by this many points
  };
  checkFrequency: 'daily' | 'weekly';
}

export interface MonitoringResult {
  rankings: KeywordRanking[];
  seoScore: number;
  scoreChange: number;
  alerts: SEOAlert[];
  suggestions: SEOSuggestion[];
}

export interface KeywordRanking {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  change: number;
  searchVolume?: number;
  url?: string;
}

export interface SEOAlert {
  type: 'ranking_drop' | 'ranking_gain' | 'score_drop' | 'new_opportunity' | 'competitor_change' | 'algorithm_update';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedAction?: string;
}

// ============================================================================
// MONITORING CRON JOB
// ============================================================================

export async function runMonitoringCheck(projectId: string): Promise<MonitoringResult> {
  // 1. Get project config
  const config = await getProjectSEOConfig(projectId);

  // 2. Check keyword rankings (requires Google Search Console integration)
  const rankings = await checkKeywordRankings(config);

  // 3. Re-analyze SEO score
  const analysis = await analyzeProject(await getProjectFiles(projectId), config);
  const previousScore = await getPreviousSEOScore(projectId);

  // 4. Check for algorithm updates
  const algorithmUpdates = await checkForAlgorithmUpdates();

  // 5. Generate alerts
  const alerts = generateAlerts(rankings, analysis, previousScore, algorithmUpdates, config);

  // 6. Generate suggestions
  const suggestions = await generateSuggestions(rankings, analysis, config);

  // 7. Store results
  await storeMonitoringResults(projectId, { rankings, analysis, alerts, suggestions });

  // 8. Send notifications if needed
  await sendAlertNotifications(projectId, alerts);

  return {
    rankings,
    seoScore: analysis.overallScore,
    scoreChange: analysis.overallScore - previousScore,
    alerts,
    suggestions,
  };
}

// ============================================================================
// GOOGLE SEARCH CONSOLE INTEGRATION
// ============================================================================

export async function checkKeywordRankings(config: SEOConfig): Promise<KeywordRanking[]> {
  // This requires OAuth with Google Search Console
  // For now, return mock data structure

  const rankings: KeywordRanking[] = [];

  for (const keyword of config.primaryKeywords || []) {
    // In production, this would call Google Search Console API:
    // GET https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query

    const previousData = await getPreviousRanking(config.projectId, keyword);

    rankings.push({
      keyword,
      currentPosition: 0, // Would come from GSC
      previousPosition: previousData?.position || 0,
      change: 0,
      searchVolume: 0, // Would come from keyword research API
    });
  }

  return rankings;
}

// ============================================================================
// ALGORITHM UPDATE DETECTION
// ============================================================================

export async function checkForAlgorithmUpdates(): Promise<AlgorithmUpdate[]> {
  // Monitor known sources for algorithm updates:
  // - Google Search Central Blog
  // - Search Engine Journal
  // - SEMrush Sensor
  // - MozCast

  // This would scrape/API these sources
  // For now, return structure

  return [];
}

// ============================================================================
// SUGGESTION GENERATION
// ============================================================================

export async function generateSuggestions(
  rankings: KeywordRanking[],
  analysis: SEOAnalysis,
  config: SEOConfig
): Promise<SEOSuggestion[]> {
  const suggestions: SEOSuggestion[] = [];

  // 1. Content freshness suggestions
  // If content hasn't been updated in 30+ days
  suggestions.push({
    type: 'content_freshness',
    title: 'Update Your Content',
    description: 'Pages that are regularly updated tend to rank better. Consider updating your main content.',
    impact: 'medium',
    effort: 'low',
    priority: calculatePriority('medium', 'low'),
  });

  // 2. Keyword opportunities
  // Find keywords where you're ranking 11-20 (page 2)
  const page2Keywords = rankings.filter(r => r.currentPosition >= 11 && r.currentPosition <= 20);
  for (const kw of page2Keywords) {
    suggestions.push({
      type: 'keyword_opportunity',
      title: `Push "${kw.keyword}" to Page 1`,
      description: `You're ranking #${kw.currentPosition} for "${kw.keyword}". A few optimizations could push you to page 1.`,
      impact: 'high',
      effort: 'medium',
      priority: calculatePriority('high', 'medium'),
      actionSteps: [
        'Add the keyword to your H1 if not present',
        'Increase keyword presence in first 100 words',
        'Add 2-3 internal links with keyword anchor text',
        'Expand content by 20% with keyword-rich sections',
      ],
    });
  }

  // 3. Technical improvements from analysis
  for (const issue of analysis.issues) {
    if (issue.autoFix) {
      suggestions.push({
        type: 'technical_fix',
        title: `Fix: ${issue.message}`,
        description: `This issue can be automatically fixed. Click to apply.`,
        impact: issue.severity === 'critical' ? 'high' : 'medium',
        effort: 'low',
        priority: calculatePriority(issue.severity === 'critical' ? 'high' : 'medium', 'low'),
        autoFixAvailable: true,
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

function calculatePriority(impact: 'high' | 'medium' | 'low', effort: 'high' | 'medium' | 'low'): number {
  const impactScore = { high: 3, medium: 2, low: 1 }[impact];
  const effortScore = { low: 3, medium: 2, high: 1 }[effort]; // Low effort = higher score
  return impactScore * effortScore;
}
```

---

## 6. SEO Scoring System

```typescript
// lib/seo/scoring/index.ts

export interface SEOScore {
  overall: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    technical: number;
    content: number;
    onPage: number;
    ux: number;
    schema: number;
  };
  breakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  weight: number;
  checks: {
    name: string;
    passed: boolean;
    points: number;
    maxPoints: number;
  }[];
}

// Category weights (must sum to 100)
const CATEGORY_WEIGHTS = {
  technical: 25,
  content: 30,
  onPage: 20,
  ux: 15,
  schema: 10,
};

// Check point values
const CHECK_POINTS: Record<string, number> = {
  // Technical (25 points total)
  HTTPS: 5,
  MOBILE_FRIENDLY: 5,
  PAGE_SPEED: 5,
  CANONICAL_TAG: 3,
  SITEMAP_EXISTS: 3,
  ROBOTS_TXT: 2,
  NO_BROKEN_LINKS: 2,

  // Content (30 points total)
  TITLE_TAG: 5,
  TITLE_LENGTH: 3,
  META_DESCRIPTION: 5,
  META_DESCRIPTION_LENGTH: 3,
  H1_EXISTS: 4,
  H1_UNIQUE: 2,
  HEADING_HIERARCHY: 2,
  CONTENT_LENGTH: 2,
  KEYWORD_IN_TITLE: 2,
  KEYWORD_IN_H1: 2,

  // On-Page (20 points total)
  IMAGE_ALT_TAGS: 5,
  IMAGE_OPTIMIZATION: 5,
  INTERNAL_LINKS: 4,
  EXTERNAL_LINKS: 2,
  DESCRIPTIVE_ANCHOR_TEXT: 4,

  // UX (15 points total)
  MOBILE_VIEWPORT: 5,
  READABLE_FONT_SIZE: 4,
  TAP_TARGET_SIZE: 3,
  NO_INTRUSIVE_INTERSTITIALS: 3,

  // Schema (10 points total)
  HAS_SCHEMA: 4,
  VALID_SCHEMA: 3,
  ORGANIZATION_SCHEMA: 2,
  WEBSITE_SCHEMA: 1,
};

export function calculateSEOScore(checkResults: SEOCheck[]): SEOScore {
  const categoryScores: Record<string, { earned: number; possible: number }> = {
    technical: { earned: 0, possible: 0 },
    content: { earned: 0, possible: 0 },
    onPage: { earned: 0, possible: 0 },
    ux: { earned: 0, possible: 0 },
    schema: { earned: 0, possible: 0 },
  };

  const breakdown: ScoreBreakdown[] = [];

  // Calculate points for each check
  for (const check of checkResults) {
    const points = CHECK_POINTS[check.id] || 0;
    const category = SEO_CHECKS[check.id]?.category || 'technical';

    categoryScores[category].possible += points;
    if (check.status === 'pass') {
      categoryScores[category].earned += points;
    }
  }

  // Calculate weighted overall score
  let overallScore = 0;

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const { earned, possible } = categoryScores[category];
    const categoryScore = possible > 0 ? (earned / possible) * 100 : 0;
    overallScore += categoryScore * (weight / 100);

    breakdown.push({
      category,
      score: Math.round(categoryScore),
      maxScore: 100,
      weight,
      checks: checkResults
        .filter(c => SEO_CHECKS[c.id]?.category === category)
        .map(c => ({
          name: c.name,
          passed: c.status === 'pass',
          points: c.status === 'pass' ? CHECK_POINTS[c.id] || 0 : 0,
          maxPoints: CHECK_POINTS[c.id] || 0,
        })),
    });
  }

  const finalScore = Math.round(overallScore);

  return {
    overall: finalScore,
    grade: getGrade(finalScore),
    categories: {
      technical: Math.round((categoryScores.technical.earned / categoryScores.technical.possible) * 100) || 0,
      content: Math.round((categoryScores.content.earned / categoryScores.content.possible) * 100) || 0,
      onPage: Math.round((categoryScores.onPage.earned / categoryScores.onPage.possible) * 100) || 0,
      ux: Math.round((categoryScores.ux.earned / categoryScores.ux.possible) * 100) || 0,
      schema: Math.round((categoryScores.schema.earned / categoryScores.schema.possible) * 100) || 0,
    },
    breakdown,
  };
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
```

---

## 7. API Routes

```typescript
// app/api/seo/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { analyzeProject } from '@/lib/seo/analyzer';
import { getProjectFiles, getProjectSEOConfig } from '@/lib/seo/utils';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    // Get project files and config
    const files = await getProjectFiles(projectId);
    const config = await getProjectSEOConfig(projectId);

    // Run analysis
    const analysis = await analyzeProject(files, config);

    // Store results
    await storeAnalysisResults(projectId, analysis);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('[SEO Analyze] Error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/seo/optimize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { optimizeProject } from '@/lib/seo/optimizer';

export async function POST(request: NextRequest) {
  try {
    const { projectId, optimizations } = await request.json();

    // Apply requested optimizations
    const result = await optimizeProject(projectId, optimizations);

    return NextResponse.json({
      success: true,
      filesUpdated: result.filesUpdated,
      newScore: result.newScore,
      improvements: result.improvements,
    });
  } catch (error) {
    console.error('[SEO Optimize] Error:', error);
    return NextResponse.json(
      { error: 'Optimization failed' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/seo/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db, seoConfig, eq } from '@alfred/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const config = await db.query.seoConfig.findFirst({
    where: eq(seoConfig.projectId, projectId),
  });

  return NextResponse.json({ config });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const result = await db
      .insert(seoConfig)
      .values(data)
      .onConflictDoUpdate({
        target: seoConfig.projectId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ config: result[0] });
  } catch (error) {
    console.error('[SEO Config] Error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
```

```typescript
// app/api/seo/generate-meta/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateOptimizedMeta } from '@/lib/seo/optimizer/meta-generator';

export async function POST(request: NextRequest) {
  try {
    const { content, projectId, pageType } = await request.json();

    const config = await getProjectSEOConfig(projectId);
    const meta = await generateOptimizedMeta(content, config, pageType);

    return NextResponse.json({ meta });
  } catch (error) {
    console.error('[SEO Generate Meta] Error:', error);
    return NextResponse.json({ error: 'Meta generation failed' }, { status: 500 });
  }
}
```

```typescript
// app/api/seo/generate-schema/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { detectSchemaTypes, generateAllSchemas } from '@/lib/seo/optimizer/schema-generator';

export async function POST(request: NextRequest) {
  try {
    const { html, projectId } = await request.json();

    const config = await getProjectSEOConfig(projectId);

    // Detect applicable schema types
    const detectedTypes = await detectSchemaTypes(html, config);

    // Generate all schemas
    const schemas = await generateAllSchemas(html, config);

    return NextResponse.json({
      detectedTypes,
      schemas,
    });
  } catch (error) {
    console.error('[SEO Generate Schema] Error:', error);
    return NextResponse.json({ error: 'Schema generation failed' }, { status: 500 });
  }
}
```

---

## 8. UI Components Structure

```
components/seo/
├── SEODashboard.tsx          # Main dashboard view
├── SEOScoreCard.tsx          # Score display with grade
├── SEOScoreRing.tsx          # Circular progress indicator
├── SEOCategoryScores.tsx     # Category breakdown
├── SEOIssueList.tsx          # List of issues with fix buttons
├── SEOIssueCard.tsx          # Individual issue card
├── SEOOpportunities.tsx      # Improvement opportunities
├── SEOConfigForm.tsx         # Business context configuration
├── SEOMetaEditor.tsx         # Meta tag editor with AI suggestions
├── SEOSchemaViewer.tsx       # Schema markup viewer/editor
├── SEOPreDeployCheck.tsx     # Pre-deploy optimization modal
├── SEOMonitoringDashboard.tsx # Phase 3 monitoring view
├── SEORankingChart.tsx       # Keyword ranking over time
├── SEOAlertList.tsx          # Recent alerts
└── SEOCompetitorView.tsx     # Competitor analysis
```

### Key Component Example: SEO Pre-Deploy Check

```typescript
// components/seo/SEOPreDeployCheck.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SEOPreDeployCheckProps {
  projectId: string;
  onOptimize: () => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
}

export function SEOPreDeployCheck({
  projectId,
  onOptimize,
  onSkip,
  onClose,
}: SEOPreDeployCheckProps) {
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  useEffect(() => {
    analyzeProject();
  }, [projectId]);

  const analyzeProject = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const autoFixableIssues = analysis?.issues
        .filter(i => i.autoFix)
        .map(i => i.code) || [];

      const res = await fetch('/api/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          optimizations: autoFixableIssues,
        }),
      });
      const data = await res.json();
      setOptimizationResult(data);

      // Re-analyze to show new score
      await analyzeProject();
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const potentialScore = analysis?.overallScore
    ? Math.min(100, analysis.overallScore + (analysis.issues.filter(i => i.autoFix).length * 3))
    : 0;

  return (
    <div className="seo-predeploy-modal">
      <div className="modal-overlay" onClick={onClose} />

      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="header-icon">
            <SearchIcon />
          </div>
          <h2>SEO Check Before Deploy</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {isAnalyzing ? (
            <div className="analyzing-state">
              <div className="spinner" />
              <p>Analyzing your site...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Score Comparison */}
              <div className="score-comparison">
                <div className="current-score">
                  <SEOScoreRing score={analysis.overallScore} size={80} />
                  <span className="label">Current</span>
                </div>

                <div className="arrow">→</div>

                <div className="potential-score">
                  <SEOScoreRing score={potentialScore} size={80} highlight />
                  <span className="label">Potential</span>
                </div>

                <div className="improvement">
                  +{potentialScore - analysis.overallScore} points!
                </div>
              </div>

              {/* Auto-fixable Issues */}
              <div className="issues-section">
                <h3>Found {analysis.issues.length} optimization opportunities:</h3>
                <ul className="issues-list">
                  {analysis.issues.slice(0, 5).map((issue, idx) => (
                    <li key={idx} className={`issue ${issue.severity}`}>
                      <span className="icon">
                        {issue.autoFix ? '✓' : '!'}
                      </span>
                      <span className="message">{issue.message}</span>
                      {issue.autoFix && (
                        <span className="auto-badge">Auto-fix</span>
                      )}
                    </li>
                  ))}
                  {analysis.issues.length > 5 && (
                    <li className="more">
                      ... {analysis.issues.length - 5} more
                    </li>
                  )}
                </ul>
              </div>

              {/* Detected Schemas */}
              {analysis.opportunities?.filter(o => o.type === 'schema').length > 0 && (
                <div className="schema-section">
                  <h3>Detected Schema Opportunities:</h3>
                  <div className="schema-badges">
                    {analysis.opportunities
                      .filter(o => o.type === 'schema')
                      .map((o, idx) => (
                        <span key={idx} className="schema-badge">
                          {o.schemaType}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="error-state">
              <p>Failed to analyze. You can still deploy without optimization.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onSkip}
            disabled={isOptimizing}
          >
            Skip for now
          </button>

          <button
            className="btn-primary"
            onClick={handleOptimize}
            disabled={isAnalyzing || isOptimizing}
          >
            {isOptimizing ? (
              <>
                <div className="spinner-small" />
                Optimizing...
              </>
            ) : (
              <>
                🚀 Optimize & Deploy
                <span className="recommended">(Recommended)</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .seo-predeploy-modal {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }

        .modal-content {
          position: relative;
          width: 90%;
          max-width: 500px;
          background: var(--bg, #0f0f12);
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          border-radius: 16px;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }

        .header-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 10px;
          color: white;
        }

        .modal-header h2 {
          flex: 1;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 24px;
          cursor: pointer;
          border-radius: 6px;
        }

        .close-btn:hover {
          background: var(--surface-hover);
          color: var(--text);
        }

        .modal-body {
          padding: 24px;
        }

        .score-comparison {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin-bottom: 24px;
        }

        .current-score, .potential-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .label {
          font-size: 12px;
          color: var(--text-muted);
        }

        .arrow {
          font-size: 24px;
          color: var(--text-muted);
        }

        .improvement {
          padding: 8px 16px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 20px;
          color: #22c55e;
          font-size: 14px;
          font-weight: 600;
        }

        .issues-section h3 {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          margin: 0 0 12px;
        }

        .issues-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .issues-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .issues-list .icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 11px;
        }

        .issue.critical .icon {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .issue.warning .icon {
          background: rgba(234, 179, 8, 0.2);
          color: #eab308;
        }

        .auto-badge {
          margin-left: auto;
          padding: 2px 8px;
          background: rgba(34, 197, 94, 0.15);
          border-radius: 10px;
          font-size: 10px;
          color: #22c55e;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }

        .btn-secondary, .btn-primary {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }

        .btn-secondary:hover {
          background: var(--surface-hover);
          border-color: var(--border);
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border: none;
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .recommended {
          font-size: 11px;
          opacity: 0.8;
        }

        .analyzing-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px 0;
          color: var(--text-secondary);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
```

---

## 9. Implementation Timeline

### Week 1-2: Phase 1 (Foundation)
- [ ] Create database schema and migrations
- [ ] Implement HTML structure enforcement
- [ ] Implement default meta tag generation
- [ ] Implement image alt text generation (AI)
- [ ] Add SEO config to project creation flow
- [ ] Basic SEO score calculation

### Week 3-4: Phase 2 (Pre-Deploy)
- [ ] Build SEO Analyzer Engine (50+ checks)
- [ ] Build Schema Detection & Generation
- [ ] Build AI Meta Tag Generator
- [ ] Build Sitemap/Robots.txt Generator
- [ ] Build SEO Dashboard UI
- [ ] Build Pre-Deploy Check Modal
- [ ] Integrate with deployment flow

### Week 5-6: Phase 2 Refinement
- [ ] Internal linking optimizer
- [ ] Core Web Vitals checks
- [ ] A/B testing setup for titles
- [ ] SEO history tracking
- [ ] Export SEO reports

### Week 7-8: Phase 3 (Monitoring)
- [ ] Google Search Console integration
- [ ] Keyword ranking tracker
- [ ] Alert system
- [ ] Suggestion engine
- [ ] Competitor monitoring (basic)

### Future Enhancements
- [ ] Google Analytics integration
- [ ] Advanced competitor analysis
- [ ] Content gap analysis
- [ ] Backlink monitoring
- [ ] Algorithm update detection

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Baseline SEO Score | 65+ | Average score for new projects with Phase 1 |
| Post-Optimization Score | 90+ | Average score after Phase 2 |
| User Optimization Rate | 70% | % of users who click "Optimize" |
| Time to Optimize | <5 seconds | Full optimization completion time |
| Auto-fix Success Rate | 95% | % of auto-fixes that work correctly |
| Schema Detection Accuracy | 90% | Correct schema type detection |
| User Satisfaction | 4.5/5 | Survey rating for SEO features |

---

This implementation plan provides a complete roadmap for building a world-class SEO Agent. The three-phase approach ensures users get immediate value (Phase 1), can unlock full potential with one click (Phase 2), and maintain their rankings over time (Phase 3).
