/**
 * Vercel Module
 *
 * Exports all Vercel deployment functionality.
 */

// Client
export { VercelClient, createVercelClient } from './client';

// Deployment
export {
  deployArtifact,
  quickDeploy,
  generateDeploymentId,
  type DeploymentOptions,
} from './deploy';

// Domains
export {
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
} from './domains';

// Re-export types
export type {
  VercelConfig,
  VercelProject,
  VercelProjectRequest,
  VercelDeployment,
  VercelDeploymentRequest,
  VercelDomain,
  VercelDomainRequest,
  VercelDomainConfig,
  VercelFile,
  DomainConfig,
  DNSRecord,
} from '../types';