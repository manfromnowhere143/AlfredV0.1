/**
 * @alfred/deploy
 *
 * Alfred's deployment engine.
 * Transform single-file artifacts into production deployments.
 *
 * @example
 * ```typescript
 * import { deployArtifact, transformArtifact } from '@alfred/deploy';
 *
 * // Transform artifact to see what will be deployed
 * const project = transformArtifact(artifact, 'my-project');
 * console.log(`Generated ${project.files.length} files`);
 *
 * // Deploy to Vercel
 * const result = await deployArtifact(artifact, request, {
 *   vercelToken: process.env.VERCEL_TOKEN,
 *   onProgress: (event) => console.log(event.message),
 * });
 *
 * console.log(`Deployed to: ${result.url}`);
 * ```
 */

// ============================================================================
// TRANSFORMER
// ============================================================================

export {
    transformArtifact,
    analyzeArtifact,
    validateArtifact,
    parseArtifact,
    generateProject,
    sanitizePackageName,
  } from './transformer';
  
  // ============================================================================
  // VERCEL
  // ============================================================================
  
  export {
    // Client
    VercelClient,
    createVercelClient,
    // Deployment
    deployArtifact,
    quickDeploy,
    generateDeploymentId,
    // Domains
    isValidDomain,
    isSubdomain,
    getRootDomain,
    getSubdomainPart,
    generateDNSRecords,
    formatDNSRecordsForDisplay,
    checkDomainStatus,
    addAndVerifyDomain,
    verifyDomain,
    suggestDomainNames,
    VERCEL_IP_ADDRESSES,
    VERCEL_CNAME_TARGET,
  } from './vercel';
  
 // ============================================================================
// TYPES
// ============================================================================

export type {
    // Artifact types
    Artifact,
    ArtifactType,
    ArtifactLanguage,
    ParsedArtifact,
    ImportStatement,
    ExportStatement,
    DependencyInfo,
    // Project types
    ProjectFile,
    GeneratedProject,
    TemplateConfig,
    // Deployment types
    DeploymentStatus,
    DeploymentRequest,
    DeploymentResult,
    DeploymentProgressEvent,
    // Domain types
    DomainType,
    DomainConfig,
    DNSRecord,
    // Vercel types
    VercelConfig,
    VercelProject,
    VercelProjectRequest,
    VercelDeployment,
    VercelDeploymentRequest,
    VercelDomain,
    VercelDomainRequest,
    VercelDomainConfig,
    VercelFile,
    // SEO types
    SEOConfig,
    SEOAnalysisResult,
    SEOIssue,
    // Error types
    DeploymentErrorCode,
  } from './types';

  export { DeploymentError } from './types';

  // Re-export DeploymentOptions and TransformOptions
  export type { DeploymentOptions } from './vercel/deploy';
  export type { TransformOptions } from './transformer';