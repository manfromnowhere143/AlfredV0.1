/**
 * SEO Agent - TypeScript Types
 *
 * Comprehensive type definitions for Alfred's SEO system.
 * Covers analysis, scoring, issues, and configuration.
 */

// ============================================================================
// SEVERITY & CATEGORY
// ============================================================================

export type SEOSeverity = 'critical' | 'warning' | 'info' | 'success';
export type SEOCategory = 'technical' | 'content' | 'on_page' | 'ux' | 'schema';
export type SEOGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

// ============================================================================
// SEO RULE
// ============================================================================

export interface SEORule {
  id: string;
  name: string;
  category: SEOCategory;
  description: string;
  weight: number; // 0-1, contribution to category score
  check: (context: SEOAnalysisContext) => SEORuleResult | Promise<SEORuleResult>;
}

export interface SEORuleResult {
  passed: boolean;
  severity: SEOSeverity;
  message: string;
  description?: string;
  suggestion?: string;
  currentValue?: string;
  expectedValue?: string;
  filePath?: string;
  lineNumber?: number;
  selector?: string;
  element?: string;
  isAutoFixable?: boolean;
  autoFix?: SEOAutoFix;
  learnMoreUrl?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AUTO-FIX
// ============================================================================

export interface SEOAutoFix {
  type: 'replace' | 'insert' | 'delete' | 'attribute';
  filePath: string;
  target?: string; // CSS selector or line number
  oldValue?: string;
  newValue: string;
  description: string;
}

// ============================================================================
// ANALYSIS CONTEXT
// ============================================================================

export interface SEOAnalysisContext {
  // Files being analyzed
  files: SEOFile[];
  htmlFiles: SEOFile[];
  indexHtml?: SEOFile;

  // Parsed HTML data
  html?: {
    doctype?: string;
    lang?: string;
    charset?: string;
    viewport?: string;
    title?: string;
    titleLength?: number;
    description?: string;
    descriptionLength?: number;
    canonical?: string;
    robots?: string;
    ogTags?: Record<string, string>;
    twitterTags?: Record<string, string>;
    schemaOrg?: SchemaOrgData[];
    headings?: HeadingData[];
    images?: ImageData[];
    links?: LinkData[];
    scripts?: ScriptData[];
    styles?: StyleData[];
  };

  // Project info
  projectName: string;
  deployUrl?: string;
  seoConfig?: SEOConfigInput;

  // Keywords
  focusKeywords?: string[];
  secondaryKeywords?: string[];
}

export interface SEOFile {
  path: string;
  content: string;
  type: 'html' | 'css' | 'js' | 'json' | 'xml' | 'txt' | 'other';
  size: number;
}

export interface SchemaOrgData {
  type: string;
  data: Record<string, unknown>;
  isValid: boolean;
  errors?: string[];
}

export interface HeadingData {
  level: number; // 1-6
  text: string;
  id?: string;
  lineNumber?: number;
}

export interface ImageData {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  loading?: string;
  decoding?: string;
  lineNumber?: number;
}

export interface LinkData {
  href: string;
  text: string;
  rel?: string;
  target?: string;
  isExternal: boolean;
  lineNumber?: number;
}

export interface ScriptData {
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  isInline: boolean;
  lineNumber?: number;
}

export interface StyleData {
  href?: string;
  isInline: boolean;
  media?: string;
  lineNumber?: number;
}

// ============================================================================
// ANALYSIS RESULT
// ============================================================================

export interface SEOAnalysisResult {
  // Overall
  score: number; // 0-100
  grade: SEOGrade;

  // Category scores
  categoryScores: {
    technical: number;
    content: number;
    on_page: number;
    ux: number;
    schema: number;
  };

  // Issues
  issues: SEOIssue[];
  issuesByCategory: Record<SEOCategory, SEOIssue[]>;
  issueBySeverity: Record<SEOSeverity, SEOIssue[]>;

  // Counts
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;

  // Auto-fix
  autoFixableCount: number;
  autoFixes: SEOAutoFix[];

  // Metadata
  analyzedAt: Date;
  analysisTime: number; // ms
  version: string;
}

export interface SEOIssue {
  ruleId: string;
  ruleName: string;
  category: SEOCategory;
  severity: SEOSeverity;
  message: string;
  description?: string;
  suggestion?: string;
  currentValue?: string;
  expectedValue?: string;
  filePath?: string;
  lineNumber?: number;
  selector?: string;
  element?: string;
  isAutoFixable: boolean;
  autoFix?: SEOAutoFix;
  learnMoreUrl?: string;
  scoreImpact: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SEO CONFIG
// ============================================================================

export interface SEOConfigInput {
  // Site Identity
  siteTitle?: string;
  siteDescription?: string;
  canonicalUrl?: string;

  // Open Graph
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogSiteName?: string;

  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;

  // Keywords
  focusKeywords?: string[];
  secondaryKeywords?: string[];

  // Auto-generation
  autoGenerateMeta?: boolean;
  autoGenerateAltText?: boolean;
  autoGenerateSchema?: boolean;
  autoFixIssues?: boolean;

  // Assets
  includeSitemap?: boolean;
  includeRobotsTxt?: boolean;
  robotsTxtContent?: string;

  // Schema.org
  schemaType?: string;
  schemaData?: Record<string, unknown>;

  // Favicon
  faviconUrl?: string;
  appleTouchIconUrl?: string;

  // Language
  language?: string;
  locale?: string;

  // Indexing
  allowIndexing?: boolean;
  allowFollowing?: boolean;
}

// ============================================================================
// GENERATED SEO DATA
// ============================================================================

export interface GeneratedMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  keywords?: string[];
  confidence: number;
}

export interface GeneratedAltText {
  altText: string;
  confidence: number;
  imageSrc: string;
}

export interface GeneratedSchema {
  type: string;
  data: Record<string, unknown>;
  confidence: number;
}

export interface GeneratedSitemap {
  content: string;
  urlCount: number;
  lastmod: string;
}

export interface GeneratedRobotsTxt {
  content: string;
  rules: string[];
}

// ============================================================================
// HTML ENHANCEMENT
// ============================================================================

export interface HTMLEnhancement {
  // DOCTYPE
  hasDoctype: boolean;
  doctypeValue?: string;

  // HTML attributes
  lang?: string;

  // Head elements
  charset?: string;
  viewport?: string;
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;

  // Open Graph
  ogTags?: Record<string, string>;

  // Twitter
  twitterTags?: Record<string, string>;

  // Schema.org
  schemaScript?: string;

  // Favicon
  faviconLinks?: string[];

  // Preconnect/DNS-prefetch
  preconnectHints?: string[];
}

// ============================================================================
// API TYPES
// ============================================================================

export interface AnalyzeRequest {
  files: Array<{
    path: string;
    content: string;
  }>;
  projectName: string;
  deployUrl?: string;
  seoConfig?: SEOConfigInput;
}

export interface AnalyzeResponse {
  success: boolean;
  result?: SEOAnalysisResult;
  error?: string;
}

export interface GenerateMetaRequest {
  content: string;
  pageType?: string;
  focusKeywords?: string[];
  existingTitle?: string;
  existingDescription?: string;
}

export interface GenerateMetaResponse {
  success: boolean;
  meta?: GeneratedMeta;
  error?: string;
}

export interface GenerateAltTextRequest {
  imageContext: string;
  surroundingText?: string;
  keywords?: string[];
}

export interface GenerateAltTextResponse {
  success: boolean;
  altText?: GeneratedAltText;
  error?: string;
}

export interface DetectSchemaRequest {
  htmlContent: string;
  pageType?: string;
}

export interface DetectSchemaResponse {
  success: boolean;
  schema?: GeneratedSchema;
  error?: string;
}

// ============================================================================
// PRE-DEPLOY MODAL TYPES
// ============================================================================

export interface PreDeployAnalysis {
  score: number;
  grade: SEOGrade;
  issues: SEOIssue[];
  autoFixAvailable: boolean;
  autoFixCount: number;
  recommendations: string[];
}

export interface AutoFixResult {
  applied: number;
  failed: number;
  changes: Array<{
    file: string;
    description: string;
    success: boolean;
    error?: string;
  }>;
}
