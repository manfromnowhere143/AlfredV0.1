/**
 * Deployment Orchestrator
 *
 * Orchestrates the full deployment lifecycle:
 * 1. Transform artifact to project
 * 2. Create or reuse Vercel project
 * 3. Deploy files
 * 4. Configure domain
 * 5. Track status
 */

import type {
  Artifact,
  DeploymentRequest,
  DeploymentResult,
  DeploymentStatus,
  DeploymentProgressEvent,
  DomainConfig,
  VercelFile,
  VercelProjectRequest,
  VercelProject,
  SEOConfig,
  SEOAnalysisResult,
} from '../types';
import { DeploymentError } from '../types';
import { VercelClient } from './client';
import { transformArtifact, validateArtifact } from '../transformer';
import type { TransformOptions } from '../transformer';

// ============================================================================
// TYPES
// ============================================================================

export interface DeploymentOptions {
  vercelToken: string;
  teamId?: string;
  onProgress?: (event: DeploymentProgressEvent) => void;
  timeout?: number;
  seoConfig?: SEOConfig;
  runSEOAnalysis?: boolean;
}

interface DeploymentState {
  id: string;
  status: DeploymentStatus;
  progress: number;
  error?: string;
  vercelProjectId?: string;
  vercelDeploymentId?: string;
  url?: string;
  domain: DomainConfig;
  createdAt: Date;
  updatedAt: Date;
  readyAt?: Date;
  logs: string[];
  seoAnalysis?: SEOAnalysisResult;
}

// ============================================================================
// HELPER: STABLE PROJECT NAMING
// ============================================================================

function sanitizeProjectName(baseName: string): string {
  return baseName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Get or create a Vercel project with a stable name.
 * - If project exists → reuse it
 * - If not found (404) → create it with that exact name
 */
async function ensureProjectByName(
  client: VercelClient,
  baseName: string,
  projectRequest: Omit<VercelProjectRequest, 'name'>
): Promise<VercelProject> {
  const name = sanitizeProjectName(baseName);

  try {
    const existing = await client.getProject(name);
    return existing;
  } catch (err: unknown) {
    const isNotFound =
      err instanceof DeploymentError && err.details?.status === 404;

    if (!isNotFound) {
      // Some real error (401, 500, etc.) – bubble up
      throw err;
    }
  }

  // Not found → create new project with this stable name
  return client.createProject({
    ...projectRequest,
    name,
  });
}

// ============================================================================
// DEPLOYMENT ORCHESTRATOR
// ============================================================================

export async function deployArtifact(
  artifact: Artifact,
  request: DeploymentRequest,
  options: DeploymentOptions
): Promise<DeploymentResult> {
  const deploymentId = generateDeploymentId();
  const state: DeploymentState = {
    id: deploymentId,
    status: 'pending',
    progress: 0,
    domain: request.domain,
    createdAt: new Date(),
    updatedAt: new Date(),
    logs: [],
  };

  const emit = (
    status: DeploymentStatus,
    message: string,
    progress: number,
    details?: Record<string, unknown>
  ) => {
    state.status = status;
    state.progress = progress;
    state.updatedAt = new Date();
    state.logs.push(`[${new Date().toISOString()}] ${message}`);

    if (options.onProgress) {
      options.onProgress({
        deploymentId,
        status,
        message,
        progress,
        timestamp: new Date(),
        details,
      });
    }
  };

  try {
    // Step 1: Validate artifact
    emit('pending', 'Validating artifact...', 5);
    const validation = validateArtifact(artifact);
    if (!validation.valid) {
      throw new DeploymentError(
        `Validation failed: ${validation.errors.join(', ')}`,
        'PARSE_ERROR',
        { errors: validation.errors, warnings: validation.warnings }
      );
    }
    if (validation.warnings.length > 0) {
      state.logs.push(`Warnings: ${validation.warnings.join(', ')}`);
    }

    // Step 2: Run SEO analysis if enabled
    let seoAnalysis: SEOAnalysisResult | undefined;
    if (options.runSEOAnalysis) {
      emit('transforming', 'Running SEO analysis...', 12);
      seoAnalysis = performBasicSEOAnalysis(artifact, options.seoConfig);
      state.seoAnalysis = seoAnalysis;
      emit('transforming', `SEO Score: ${seoAnalysis.score}/100 (${seoAnalysis.grade})`, 15, {
        type: 'seo_analysis',
        seoAnalysis,
      });
    }

    // Step 3: Transform artifact to project
    emit('transforming', 'Transforming artifact to project structure...', 18);
    const transformOptions: TransformOptions = {
      seoConfig: options.seoConfig,
    };
    const project = transformArtifact(artifact, request.projectName, transformOptions);
    emit('transforming', `Generated ${project.files.length} files`, 25);

    // Step 3: Initialize Vercel client
    const client = new VercelClient({
      token: options.vercelToken,
      teamId: options.teamId,
    });

    // Step 4: Create or reuse Vercel project with a stable name
    emit('uploading', 'Creating or reusing Vercel project...', 30);

    const baseName = request.projectName;

    const vercelProject = await ensureProjectByName(client, baseName, {
      framework: 'vite',
      buildCommand: project.buildCommand,
      outputDirectory: project.outputDirectory,
      installCommand: project.installCommand,
    });

    const projectName = vercelProject.name;
    state.vercelProjectId = vercelProject.id;
    emit('uploading', `Using project: ${vercelProject.name}`, 40);

    // Step 5: Add environment variables if provided
    if (
      request.environmentVariables &&
      Object.keys(request.environmentVariables).length > 0
    ) {
      emit('uploading', 'Configuring environment variables...', 45);
      const envVars = Object.entries(request.environmentVariables).map(
        ([key, value]) => ({
          key,
          value,
          target: [
            'production',
            'preview',
            'development',
          ] as ('production' | 'preview' | 'development')[],
        })
      );
      await client.addEnvVars(vercelProject.id, envVars);
    }

    // Step 6: Prepare files for deployment
    emit('uploading', 'Preparing files for upload...', 50);
    const vercelFiles: VercelFile[] = project.files.map((file) => ({
      file: file.path,
      data: file.content,
      encoding: file.encoding || 'utf-8',
    }));

    // Step 7: Create deployment
    emit('building', 'Uploading and building...', 55);
    const deployment = await client.createDeployment({
      name: projectName,
      files: vercelFiles,
      projectSettings: {
        framework: 'vite',
        buildCommand: project.buildCommand,
        outputDirectory: project.outputDirectory,
        installCommand: project.installCommand,
      },
      target: 'production',
    });

    state.vercelDeploymentId = deployment.id;
    emit('building', `Deployment started: ${deployment.id}`, 60);

    // Step 8: Wait for deployment to complete
    const finalDeployment = await client.waitForDeployment(deployment.id, {
      timeout: options.timeout || 300000,
      pollInterval: 3000,
      onProgress: (d) => {
        const progressMap: Record<string, number> = {
          QUEUED: 65,
          INITIALIZING: 70,
          BUILDING: 80,
          READY: 95,
          ERROR: 100,
          CANCELED: 100,
        };
        const progress = progressMap[d.readyState] || 75;
        emit('building', `Build status: ${d.readyState}`, progress);
      },
    });

    // Step 9: Handle deployment result
    if (finalDeployment.readyState === 'ERROR') {
      throw new DeploymentError(
        'Deployment build failed',
        'BUILD_ERROR',
        { deployment: finalDeployment }
      );
    }

    if (finalDeployment.readyState === 'CANCELED') {
      throw new DeploymentError(
        'Deployment was canceled',
        'BUILD_ERROR',
        { deployment: finalDeployment }
      );
    }

    // Use clean production alias if available
    const cleanUrl = finalDeployment.alias?.[0] || finalDeployment.url;
    state.url = `https://${cleanUrl}`;
    emit('deploying', `Build complete: ${state.url}`, 90);

    // Step 10: Configure custom domain if requested
    if (request.domain.type === 'custom' && request.domain.domain) {
      emit('deploying', 'Configuring custom domain...', 92);
      try {
        const domainResult = await client.addDomain(vercelProject.id, {
          name: request.domain.domain,
        });

        state.domain = {
          ...request.domain,
          verified: domainResult.verified,
          dnsRecords: domainResult.verification?.map((v) => ({
            type: v.type as 'A' | 'CNAME' | 'TXT',
            name: v.domain,
            value: v.value,
          })),
        };

        if (!domainResult.verified) {
          emit(
            'deploying',
            'Domain added. DNS configuration required.',
            95,
            { dnsRecords: state.domain.dnsRecords }
          );
        } else {
          emit('deploying', 'Domain configured and verified!', 98);
          state.url = `https://${request.domain.domain}`;
        }
      } catch (domainError) {
        state.logs.push(
          `Domain configuration warning: ${(domainError as Error).message}`
        );
        emit(
          'deploying',
          'Domain configuration failed, using Vercel URL',
          95,
          { error: (domainError as Error).message }
        );
      }
    } else {
      state.domain = {
        type: 'vercel',
        domain: finalDeployment.url,
        verified: true,
      };
    }

    // Step 11: Success!
    state.status = 'ready';
    state.progress = 100;
    state.readyAt = new Date();
    emit('ready', 'Deployment successful!', 100, {
      url: state.url,
      seoAnalysis: state.seoAnalysis,
    });

    return {
      id: state.id,
      status: state.status,
      url: state.url,
      vercelProjectId: state.vercelProjectId,
      vercelDeploymentId: state.vercelDeploymentId,
      domain: state.domain,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      readyAt: state.readyAt,
      buildLogs: state.logs,
      seoAnalysis: state.seoAnalysis,
    };
  } catch (error) {
    state.status = 'error';
    state.error =
      error instanceof DeploymentError
        ? error.message
        : (error as Error).message;

    emit('error', state.error, state.progress, {
      code: error instanceof DeploymentError ? error.code : 'UNKNOWN',
    });

    return {
      id: state.id,
      status: 'error',
      error: state.error,
      domain: state.domain,
      vercelProjectId: state.vercelProjectId,
      vercelDeploymentId: state.vercelDeploymentId,
      createdAt: state.createdAt,
      updatedAt: new Date(),
      buildLogs: state.logs,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateDeploymentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `dep_${timestamp}${random}`;
}

export async function quickDeploy(
  artifact: Artifact,
  vercelToken: string,
  options?: {
    projectName?: string;
    teamId?: string;
    onProgress?: (event: DeploymentProgressEvent) => void;
  }
): Promise<DeploymentResult> {
  const projectName =
    options?.projectName ||
    artifact.title.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
    'alfred-project';

  return deployArtifact(
    artifact,
    {
      artifactId: artifact.id,
      userId: 'quick-deploy',
      projectName,
      domain: {
        type: 'vercel',
        domain: '',
        verified: false,
      },
    },
    {
      vercelToken,
      teamId: options?.teamId,
      onProgress: options?.onProgress,
    }
  );
}

// ============================================================================
// SEO ANALYSIS
// ============================================================================

function performBasicSEOAnalysis(
  artifact: Artifact,
  seoConfig?: SEOConfig
): SEOAnalysisResult {
  const issues: SEOAnalysisResult['issues'] = [];
  const categoryScores = {
    technical: 100,
    content: 100,
    onPage: 100,
    ux: 100,
    schema: 100,
  };

  const code = artifact.code;

  // Technical checks
  if (!code.includes('<!DOCTYPE') && !code.includes('<!doctype')) {
    // Not an issue for React components, they get wrapped
  }

  // Check for viewport meta (will be added by generator)
  categoryScores.technical = 95;

  // Content checks
  const titleMatch = artifact.title;
  if (!titleMatch || titleMatch.length < 10) {
    issues.push({
      ruleId: 'content-title-length',
      ruleName: 'Title Length',
      category: 'content',
      severity: 'warning',
      message: 'Project title is short. Consider a more descriptive title.',
      suggestion: 'Use a title between 50-60 characters for optimal SEO.',
      scoreImpact: 5,
    });
    categoryScores.content -= 5;
  }

  if (!seoConfig?.siteDescription || seoConfig.siteDescription.length < 50) {
    issues.push({
      ruleId: 'content-meta-description',
      ruleName: 'Meta Description',
      category: 'content',
      severity: seoConfig?.siteDescription ? 'warning' : 'info',
      message: seoConfig?.siteDescription
        ? 'Meta description is short. Consider expanding it.'
        : 'No custom meta description set. A default will be generated.',
      suggestion: 'Use a meta description between 150-160 characters.',
      isAutoFixable: true,
      scoreImpact: seoConfig?.siteDescription ? 5 : 3,
    });
    categoryScores.content -= seoConfig?.siteDescription ? 5 : 3;
  }

  // On-page checks
  const hasImages = /\.(png|jpg|jpeg|gif|svg|webp)/i.test(code) || /<img/i.test(code);
  const hasAltText = /alt=["'][^"']+["']/i.test(code);

  if (hasImages && !hasAltText) {
    issues.push({
      ruleId: 'onpage-image-alt',
      ruleName: 'Image Alt Text',
      category: 'on_page',
      severity: 'warning',
      message: 'Images detected without alt text.',
      suggestion: 'Add descriptive alt text to all images for accessibility and SEO.',
      isAutoFixable: true,
      scoreImpact: 10,
    });
    categoryScores.onPage -= 10;
  }

  // Check for heading hierarchy
  const hasH1 = /<h1/i.test(code);
  if (!hasH1) {
    issues.push({
      ruleId: 'onpage-h1-missing',
      ruleName: 'H1 Heading',
      category: 'on_page',
      severity: 'info',
      message: 'No H1 heading detected in the component.',
      suggestion: 'Include an H1 heading for better content structure.',
      scoreImpact: 5,
    });
    categoryScores.onPage -= 5;
  }

  // UX checks
  const hasInteractiveElements = /<button|<a |onClick|onPress/i.test(code);
  if (hasInteractiveElements) {
    categoryScores.ux = 100; // Good interactive elements
  }

  // Check for responsive design indicators
  const hasResponsive = /responsive|@media|flex|grid|md:|lg:|sm:/i.test(code);
  if (!hasResponsive) {
    issues.push({
      ruleId: 'ux-responsive',
      ruleName: 'Responsive Design',
      category: 'ux',
      severity: 'info',
      message: 'Limited responsive design patterns detected.',
      suggestion: 'Use Tailwind responsive classes (sm:, md:, lg:) or CSS media queries.',
      scoreImpact: 5,
    });
    categoryScores.ux -= 5;
  }

  // Schema checks
  if (seoConfig?.schemaData || seoConfig?.schemaType) {
    categoryScores.schema = 100;
  } else {
    issues.push({
      ruleId: 'schema-missing',
      ruleName: 'Schema.org Markup',
      category: 'schema',
      severity: 'info',
      message: 'No custom Schema.org markup configured.',
      suggestion: 'A default WebSite schema will be automatically generated.',
      isAutoFixable: true,
      scoreImpact: 0,
    });
    categoryScores.schema = 85; // Default schema will be added
  }

  // Open Graph checks
  if (!seoConfig?.ogImage) {
    issues.push({
      ruleId: 'content-og-image',
      ruleName: 'Open Graph Image',
      category: 'content',
      severity: 'info',
      message: 'No Open Graph image configured.',
      suggestion: 'Add an OG image for better social media sharing.',
      scoreImpact: 5,
    });
    categoryScores.content -= 5;
  }

  // Calculate overall score (weighted average)
  const weights = {
    technical: 0.20,
    content: 0.25,
    onPage: 0.25,
    ux: 0.15,
    schema: 0.15,
  };

  const overallScore = Math.round(
    categoryScores.technical * weights.technical +
    categoryScores.content * weights.content +
    categoryScores.onPage * weights.onPage +
    categoryScores.ux * weights.ux +
    categoryScores.schema * weights.schema
  );

  // Calculate grade
  let grade: SEOAnalysisResult['grade'];
  if (overallScore >= 95) grade = 'A+';
  else if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 75) grade = 'B';
  else if (overallScore >= 60) grade = 'C';
  else if (overallScore >= 50) grade = 'D';
  else grade = 'F';

  // Count issues by severity
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const autoFixableCount = issues.filter(i => i.isAutoFixable).length;

  // Add success items for passing checks
  const passedChecks = [
    { check: 'DOCTYPE Declaration', passed: true },
    { check: 'Meta Viewport', passed: true },
    { check: 'Meta Charset', passed: true },
    { check: 'Canonical URL', passed: true },
    { check: 'Robots Meta', passed: true },
    { check: 'Open Graph Tags', passed: true },
    { check: 'Twitter Card Tags', passed: true },
    { check: 'Language Attribute', passed: true },
  ].filter(c => c.passed).length;

  const totalChecks = 8 + issues.length;

  return {
    score: overallScore,
    grade,
    passedChecks,
    totalChecks,
    criticalCount,
    warningCount,
    infoCount,
    autoFixableCount,
    categoryScores,
    issues,
  };
}

export { generateDeploymentId };
