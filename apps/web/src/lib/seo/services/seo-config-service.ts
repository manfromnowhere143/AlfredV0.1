/**
 * SEO Config Service
 *
 * CRUD operations for SEO configurations.
 */

import { getDb } from '@/lib/db';
import { seoConfigs, seoReports, seoIssues, seoAssets } from '@alfred/database';
import { eq, and, desc } from 'drizzle-orm';
import type { SEOConfigInput, SEOAnalysisResult, SEOIssue } from '../types';

/**
 * Get SEO config for a project
 */
export async function getSeoConfig(projectId: string) {
  const client = await getDb();

  const configs = await client.db
    .select()
    .from(seoConfigs)
    .where(eq(seoConfigs.projectId, projectId))
    .limit(1);

  return configs[0] || null;
}

/**
 * Create or update SEO config
 */
export async function upsertSeoConfig(
  projectId: string,
  config: SEOConfigInput,
  alfredProjectId?: string
) {
  const client = await getDb();

  const existing = await getSeoConfig(projectId);

  if (existing) {
    // Update existing
    await client.db
      .update(seoConfigs)
      .set({
        siteTitle: config.siteTitle ?? existing.siteTitle,
        siteDescription: config.siteDescription ?? existing.siteDescription,
        canonicalUrl: config.canonicalUrl ?? existing.canonicalUrl,
        ogImage: config.ogImage ?? existing.ogImage,
        ogTitle: config.ogTitle ?? existing.ogTitle,
        ogDescription: config.ogDescription ?? existing.ogDescription,
        ogType: config.ogType ?? existing.ogType,
        ogSiteName: config.ogSiteName ?? existing.ogSiteName,
        twitterCard: config.twitterCard ?? existing.twitterCard,
        twitterSite: config.twitterSite ?? existing.twitterSite,
        twitterCreator: config.twitterCreator ?? existing.twitterCreator,
        focusKeywords: config.focusKeywords ?? existing.focusKeywords,
        secondaryKeywords: config.secondaryKeywords ?? existing.secondaryKeywords,
        autoGenerateMeta: config.autoGenerateMeta ?? existing.autoGenerateMeta,
        autoGenerateAltText: config.autoGenerateAltText ?? existing.autoGenerateAltText,
        autoGenerateSchema: config.autoGenerateSchema ?? existing.autoGenerateSchema,
        autoFixIssues: config.autoFixIssues ?? existing.autoFixIssues,
        includeSitemap: config.includeSitemap ?? existing.includeSitemap,
        includeRobotsTxt: config.includeRobotsTxt ?? existing.includeRobotsTxt,
        robotsTxtContent: config.robotsTxtContent ?? existing.robotsTxtContent,
        schemaType: config.schemaType ?? existing.schemaType,
        schemaData: config.schemaData ?? existing.schemaData,
        faviconUrl: config.faviconUrl ?? existing.faviconUrl,
        appleTouchIconUrl: config.appleTouchIconUrl ?? existing.appleTouchIconUrl,
        language: config.language ?? existing.language,
        locale: config.locale ?? existing.locale,
        allowIndexing: config.allowIndexing ?? existing.allowIndexing,
        allowFollowing: config.allowFollowing ?? existing.allowFollowing,
        updatedAt: new Date(),
      })
      .where(eq(seoConfigs.id, existing.id));

    return existing.id;
  } else {
    // Create new
    const [newConfig] = await client.db
      .insert(seoConfigs)
      .values({
        projectId,
        alfredProjectId,
        siteTitle: config.siteTitle,
        siteDescription: config.siteDescription,
        canonicalUrl: config.canonicalUrl,
        ogImage: config.ogImage,
        ogTitle: config.ogTitle,
        ogDescription: config.ogDescription,
        ogType: config.ogType,
        ogSiteName: config.ogSiteName,
        twitterCard: config.twitterCard,
        twitterSite: config.twitterSite,
        twitterCreator: config.twitterCreator,
        focusKeywords: config.focusKeywords || [],
        secondaryKeywords: config.secondaryKeywords || [],
        autoGenerateMeta: config.autoGenerateMeta ?? true,
        autoGenerateAltText: config.autoGenerateAltText ?? true,
        autoGenerateSchema: config.autoGenerateSchema ?? true,
        autoFixIssues: config.autoFixIssues ?? false,
        includeSitemap: config.includeSitemap ?? true,
        includeRobotsTxt: config.includeRobotsTxt ?? true,
        robotsTxtContent: config.robotsTxtContent,
        schemaType: config.schemaType || 'WebSite',
        schemaData: config.schemaData,
        faviconUrl: config.faviconUrl,
        appleTouchIconUrl: config.appleTouchIconUrl,
        language: config.language || 'en',
        locale: config.locale || 'en_US',
        allowIndexing: config.allowIndexing ?? true,
        allowFollowing: config.allowFollowing ?? true,
      })
      .returning({ id: seoConfigs.id });

    return newConfig.id;
  }
}

/**
 * Delete SEO config
 */
export async function deleteSeoConfig(projectId: string) {
  const client = await getDb();

  await client.db
    .delete(seoConfigs)
    .where(eq(seoConfigs.projectId, projectId));
}

/**
 * Save SEO analysis report
 */
export async function saveSeoReport(
  projectId: string,
  result: SEOAnalysisResult,
  options?: {
    analyzedUrl?: string;
    analyzedFiles?: string[];
    source?: 'pre_deploy' | 'manual' | 'scheduled';
    autoFixesApplied?: number;
  }
) {
  const client = await getDb();

  // Get SEO config ID if exists
  const config = await getSeoConfig(projectId);

  // Insert report
  const [report] = await client.db
    .insert(seoReports)
    .values({
      projectId,
      seoConfigId: config?.id,
      overallScore: result.score,
      grade: result.grade,
      technicalScore: result.categoryScores.technical,
      contentScore: result.categoryScores.content,
      onPageScore: result.categoryScores.on_page,
      uxScore: result.categoryScores.ux,
      schemaScore: result.categoryScores.schema,
      totalIssues: result.issues.length,
      criticalCount: result.criticalCount,
      warningCount: result.warningCount,
      infoCount: result.infoCount,
      passedCount: result.passedChecks,
      analyzedUrl: options?.analyzedUrl,
      analyzedFiles: options?.analyzedFiles,
      analysisVersion: result.version,
      analysisTime: result.analysisTime,
      autoFixesApplied: options?.autoFixesApplied || 0,
      autoFixesAvailable: result.autoFixableCount,
      metadata: {
        source: options?.source || 'manual',
      },
    })
    .returning({ id: seoReports.id });

  // Insert issues
  if (result.issues.length > 0) {
    await client.db.insert(seoIssues).values(
      result.issues.map((issue: SEOIssue) => ({
        reportId: report.id,
        projectId,
        ruleId: issue.ruleId,
        ruleName: issue.ruleName,
        category: issue.category,
        severity: issue.severity,
        message: issue.message,
        description: issue.description,
        suggestion: issue.suggestion,
        filePath: issue.filePath,
        lineNumber: issue.lineNumber,
        selector: issue.selector,
        element: issue.element,
        currentValue: issue.currentValue,
        expectedValue: issue.expectedValue,
        isAutoFixable: issue.isAutoFixable,
        autoFixCode: issue.autoFix ? JSON.stringify(issue.autoFix) : undefined,
        wasAutoFixed: false,
        scoreImpact: issue.scoreImpact,
        weight: 1.0,
        learnMoreUrl: issue.learnMoreUrl,
        metadata: issue.metadata,
      }))
    );
  }

  // Update config with latest score
  if (config) {
    await client.db
      .update(seoConfigs)
      .set({
        lastScore: result.score,
        lastGrade: result.grade,
        lastAnalyzedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(seoConfigs.id, config.id));
  }

  return report.id;
}

/**
 * Get latest SEO report for a project
 */
export async function getLatestSeoReport(projectId: string) {
  const client = await getDb();

  const reports = await client.db
    .select()
    .from(seoReports)
    .where(eq(seoReports.projectId, projectId))
    .orderBy(desc(seoReports.createdAt))
    .limit(1);

  if (!reports[0]) return null;

  // Get issues for this report
  const issues = await client.db
    .select()
    .from(seoIssues)
    .where(eq(seoIssues.reportId, reports[0].id));

  return {
    ...reports[0],
    issues,
  };
}

/**
 * Get SEO report history
 */
export async function getSeoReportHistory(projectId: string, limit = 10) {
  const client = await getDb();

  const reports = await client.db
    .select({
      id: seoReports.id,
      overallScore: seoReports.overallScore,
      grade: seoReports.grade,
      criticalCount: seoReports.criticalCount,
      warningCount: seoReports.warningCount,
      createdAt: seoReports.createdAt,
    })
    .from(seoReports)
    .where(eq(seoReports.projectId, projectId))
    .orderBy(desc(seoReports.createdAt))
    .limit(limit);

  return reports;
}

/**
 * Save SEO asset (sitemap, robots.txt, schema)
 */
export async function saveSeoAsset(
  projectId: string,
  assetType: 'sitemap' | 'robots_txt' | 'schema_json',
  content: string,
  options?: {
    fileName?: string;
    generatedBy?: 'system' | 'ai' | 'user';
    metadata?: Record<string, unknown>;
  }
) {
  const client = await getDb();

  const config = await getSeoConfig(projectId);

  const fileName = options?.fileName || getDefaultFileName(assetType);
  const mimeType = getMimeType(assetType);

  // Upsert asset
  await client.db
    .insert(seoAssets)
    .values({
      projectId,
      seoConfigId: config?.id,
      assetType,
      content,
      contentHash: hashContent(content),
      fileName,
      mimeType,
      fileSize: new TextEncoder().encode(content).length,
      isActive: true,
      generatedBy: options?.generatedBy || 'system',
      metadata: options?.metadata,
    })
    .onConflictDoUpdate({
      target: [seoAssets.projectId, seoAssets.assetType],
      set: {
        content,
        contentHash: hashContent(content),
        fileSize: new TextEncoder().encode(content).length,
        generatedBy: options?.generatedBy || 'system',
        metadata: options?.metadata,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get SEO asset
 */
export async function getSeoAsset(
  projectId: string,
  assetType: 'sitemap' | 'robots_txt' | 'schema_json'
) {
  const client = await getDb();

  const assets = await client.db
    .select()
    .from(seoAssets)
    .where(
      and(
        eq(seoAssets.projectId, projectId),
        eq(seoAssets.assetType, assetType),
        eq(seoAssets.isActive, true)
      )
    )
    .limit(1);

  return assets[0] || null;
}

/**
 * Get all SEO assets for a project
 */
export async function getAllSeoAssets(projectId: string) {
  const client = await getDb();

  return client.db
    .select()
    .from(seoAssets)
    .where(
      and(
        eq(seoAssets.projectId, projectId),
        eq(seoAssets.isActive, true)
      )
    );
}

// Helper functions
function getDefaultFileName(assetType: 'sitemap' | 'robots_txt' | 'schema_json'): string {
  switch (assetType) {
    case 'sitemap':
      return 'sitemap.xml';
    case 'robots_txt':
      return 'robots.txt';
    case 'schema_json':
      return 'schema.json';
  }
}

function getMimeType(assetType: 'sitemap' | 'robots_txt' | 'schema_json'): string {
  switch (assetType) {
    case 'sitemap':
      return 'application/xml';
    case 'robots_txt':
      return 'text/plain';
    case 'schema_json':
      return 'application/json';
  }
}

function hashContent(content: string): string {
  // Simple hash for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
