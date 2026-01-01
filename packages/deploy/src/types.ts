/**
 * Deployment Types
 *
 * Type definitions for Alfred's deployment engine.
 * These types define contracts for artifact transformation and Vercel deployment.
 */

// ============================================================================
// ARTIFACT TYPES
// ============================================================================

export type ArtifactType = 'react' | 'html' | 'vue' | 'svelte';

export type ArtifactLanguage = 'jsx' | 'tsx' | 'html' | 'vue' | 'svelte';

export interface Artifact {
  id: string;
  title: string;
  code: string;
  language: ArtifactLanguage;
  conversationId: string;
  projectId?: string;
  version: number;
  createdAt: Date;
}

export interface ParsedArtifact {
  type: ArtifactType;
  language: ArtifactLanguage;
  code: string;
  componentName: string;
  dependencies: DependencyInfo[];
  imports: ImportStatement[];
  exports: ExportStatement[];
  hasDefaultExport: boolean;
  usesHooks: boolean;
  usesTailwind: boolean;
  usesTypeScript: boolean;
}

// ============================================================================
// DEPENDENCY DETECTION
// ============================================================================

export interface DependencyInfo {
  name: string;
  version: string;
  isDev: boolean;
}

export interface ImportStatement {
  source: string;
  defaultImport?: string;
  namedImports: string[];
  namespaceImport?: string;
  isRelative: boolean;
}

export interface ExportStatement {
  type: 'default' | 'named' | 'all';
  name?: string;
  source?: string;
}

// ============================================================================
// PROJECT GENERATION
// ============================================================================

export interface ProjectFile {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface GeneratedProject {
  files: ProjectFile[];
  framework: 'vite-react' | 'vite-vue' | 'static';
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  devCommand: string;
}

export interface TemplateConfig {
  framework: GeneratedProject['framework'];
  typescript: boolean;
  tailwind: boolean;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// ============================================================================
// VERCEL DEPLOYMENT
// ============================================================================

export type DeploymentStatus =
  | 'pending'
  | 'transforming'
  | 'uploading'
  | 'building'
  | 'deploying'
  | 'ready'
  | 'error'
  | 'canceled';

export type DomainType = 'vercel' | 'custom';

export interface DomainConfig {
  type: DomainType;
  domain: string;
  subdomain?: string;
  verified: boolean;
  dnsRecords?: DNSRecord[];
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
}

export interface DeploymentRequest {
  artifactId: string;
  userId: string;
  projectName: string;
  domain: DomainConfig;
  environmentVariables?: Record<string, string>;
}

export interface DeploymentResult {
  id: string;
  status: DeploymentStatus;
  url?: string;
  vercelProjectId?: string;
  vercelDeploymentId?: string;
  buildLogs?: string[];
  error?: string;
  domain: DomainConfig;
  createdAt: Date;
  updatedAt: Date;
  readyAt?: Date;
}

export interface DeploymentProgressEvent {
  deploymentId: string;
  status: DeploymentStatus;
  message: string;
  progress: number;
  timestamp: Date;
  details?: Record<string, unknown>;
}

// ============================================================================
// VERCEL API TYPES
// ============================================================================

export interface VercelConfig {
  token: string;
  teamId?: string;
}

export interface VercelProjectRequest {
  name: string;
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  devCommand?: string;
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: ('production' | 'preview' | 'development')[];
  }>;
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
  framework?: string;
  link?: {
    type: string;
    repo: string;
  };
}

export interface VercelFile {
  file: string;
  data: string;
  encoding?: 'utf-8' | 'base64';
}

export interface VercelDeploymentRequest {
  name: string;
  files: VercelFile[];
  projectSettings?: {
    framework?: string;
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
    devCommand?: string;
  };
  target?: 'production' | 'preview';
}

export interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  state: 'QUEUED' | 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'READY' | 'CANCELED';
  readyState: 'QUEUED' | 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'READY' | 'CANCELED';
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  alias?: string[];
  meta?: Record<string, string>;
}

export interface VercelDomainRequest {
  name: string;
}

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  gitBranch?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VercelDomainConfig {
  configuredBy?: 'CNAME' | 'A' | 'http';
  acceptedChallenges?: ('dns-01' | 'http-01')[];
  misconfigured: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type DeploymentErrorCode =
  | 'ARTIFACT_NOT_FOUND'
  | 'PARSE_ERROR'
  | 'TRANSFORM_ERROR'
  | 'VERCEL_API_ERROR'
  | 'BUILD_ERROR'
  | 'DOMAIN_ERROR'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export class DeploymentError extends Error {
  code: DeploymentErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: DeploymentErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DeploymentError';
    this.code = code;
    this.details = details;
  }
}