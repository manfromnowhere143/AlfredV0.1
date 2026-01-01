/**
 * Vercel API Client
 *
 * Type-safe client for Vercel's REST API.
 * Handles authentication, rate limiting, and error handling.
 */

import {
  type VercelConfig,
  type VercelProject,
  type VercelProjectRequest,
  type VercelDeployment,
  type VercelDeploymentRequest,
  type VercelDomain,
  type VercelDomainRequest,
  type VercelDomainConfig,
  DeploymentError,
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const VERCEL_API_BASE = 'https://api.vercel.com';

const API_VERSIONS = {
  projects: 'v9',
  deployments: 'v13',
  domains: 'v9',
  domainConfig: 'v6',
} as const;

// ============================================================================
// CLIENT CLASS
// ============================================================================

export class VercelClient {
  private token: string;
  private teamId?: string;

  constructor(config: VercelConfig) {
    if (!config.token) {
      throw new DeploymentError(
        'Vercel API token is required',
        'UNAUTHORIZED'
      );
    }
    this.token = config.token;
    this.teamId = config.teamId;
  }

  // ==========================================================================
  // REQUEST HELPERS
  // ==========================================================================

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    version: string = 'v9'
  ): Promise<T> {
    const url = new URL(`${VERCEL_API_BASE}/${version}${path}`);

    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), options);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new DeploymentError(
          `Rate limited. Retry after ${retryAfter || 'unknown'} seconds`,
          'RATE_LIMITED',
          { retryAfter }
        );
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as { message?: string };
        throw new DeploymentError(
          errorBody.message || `Vercel API error: ${response.status}`,
          'VERCEL_API_ERROR',
          { status: response.status, error: errorBody }
        );
      }

      const data = await response.json();
      return data as T;
    } catch (err: unknown) {
      if (err instanceof DeploymentError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new DeploymentError(
        `Network error: ${message}`,
        'VERCEL_API_ERROR',
        { originalError: err }
      );
    }
  }

  // ==========================================================================
  // PROJECTS
  // ==========================================================================

  async createProject(request: VercelProjectRequest): Promise<VercelProject> {
    return this.request<VercelProject>(
      'POST',
      '/projects',
      request,
      API_VERSIONS.projects
    );
  }

  async getProject(idOrName: string): Promise<VercelProject> {
    return this.request<VercelProject>(
      'GET',
      `/projects/${encodeURIComponent(idOrName)}`,
      undefined,
      API_VERSIONS.projects
    );
  }

  async deleteProject(idOrName: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/projects/${encodeURIComponent(idOrName)}`,
      undefined,
      API_VERSIONS.projects
    );
  }

  async updateProject(
    idOrName: string,
    settings: Partial<VercelProjectRequest>
  ): Promise<VercelProject> {
    return this.request<VercelProject>(
      'PATCH',
      `/projects/${encodeURIComponent(idOrName)}`,
      settings,
      API_VERSIONS.projects
    );
  }

  /**
   * Try to find a project by name.
   * Returns null if it doesn't exist (404), throws for any other error.
   */
  async findProjectByName(name: string): Promise<VercelProject | null> {
    try {
      return await this.getProject(name);
    } catch (err: unknown) {
      if (
        err instanceof DeploymentError &&
        err.details?.status === 404
      ) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Ensure a project exists with the given name/settings.
   * - If it exists, returns it.
   * - If not, creates it once.
   *
   * Use this with a stable name so Alfred reuses the same Vercel project
   * instead of creating "quantumresearchlanding-xxxxxx" clones.
   */
  async ensureProject(request: VercelProjectRequest): Promise<VercelProject> {
    const existing = await this.findProjectByName(request.name);
    if (existing) {
      return existing;
    }
    return this.createProject(request);
  }

  // ==========================================================================
  // DEPLOYMENTS
  // ==========================================================================

  async createDeployment(
    request: VercelDeploymentRequest
  ): Promise<VercelDeployment> {
    return this.request<VercelDeployment>(
      'POST',
      '/deployments',
      request,
      API_VERSIONS.deployments
    );
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.request<VercelDeployment>(
      'GET',
      `/deployments/${deploymentId}`,
      undefined,
      API_VERSIONS.deployments
    );
  }

  async listDeployments(
    projectId: string,
    options?: { limit?: number; target?: 'production' | 'preview' }
  ): Promise<{ deployments: VercelDeployment[] }> {
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.target) params.set('target', options.target);

    return this.request<{ deployments: VercelDeployment[] }>(
      'GET',
      `/deployments?${params.toString()}`,
      undefined,
      API_VERSIONS.deployments
    );
  }

  async cancelDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.request<VercelDeployment>(
      'PATCH',
      `/deployments/${deploymentId}/cancel`,
      undefined,
      API_VERSIONS.deployments
    );
  }

  // ==========================================================================
  // DOMAINS
  // ==========================================================================

  async addDomain(
    projectId: string,
    domain: VercelDomainRequest
  ): Promise<VercelDomain> {
    return this.request<VercelDomain>(
      'POST',
      `/projects/${encodeURIComponent(projectId)}/domains`,
      domain,
      API_VERSIONS.domains
    );
  }

  async getDomainConfig(domain: string): Promise<VercelDomainConfig> {
    return this.request<VercelDomainConfig>(
      'GET',
      `/domains/${encodeURIComponent(domain)}/config`,
      undefined,
      API_VERSIONS.domainConfig
    );
  }

  async listDomains(projectId: string): Promise<{ domains: VercelDomain[] }> {
    return this.request<{ domains: VercelDomain[] }>(
      'GET',
      `/projects/${encodeURIComponent(projectId)}/domains`,
      undefined,
      API_VERSIONS.domains
    );
  }

  async removeDomain(projectId: string, domain: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
      undefined,
      API_VERSIONS.domains
    );
  }

  async verifyDomain(projectId: string, domain: string): Promise<VercelDomain> {
    return this.request<VercelDomain>(
      'POST',
      `/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify`,
      undefined,
      API_VERSIONS.domains
    );
  }

  // ==========================================================================
  // ENVIRONMENT VARIABLES
  // ==========================================================================

  async addEnvVars(
    projectId: string,
    envVars: Array<{
      key: string;
      value: string;
      target: ('production' | 'preview' | 'development')[];
      type?: 'plain' | 'secret' | 'encrypted';
    }>
  ): Promise<void> {
    for (const envVar of envVars) {
      await this.request<unknown>(
        'POST',
        `/projects/${encodeURIComponent(projectId)}/env`,
        {
          ...envVar,
          type: envVar.type || 'encrypted',
        },
        API_VERSIONS.projects
      );
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  async isProjectNameAvailable(name: string): Promise<boolean> {
    try {
      await this.getProject(name);
      return false;
    } catch (err: unknown) {
      if (
        err instanceof DeploymentError &&
        err.details?.status === 404
      ) {
        return true;
      }
      throw err;
    }
  }

  async generateUniqueProjectName(baseName: string): Promise<string> {
    const sanitized = baseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);

    if (await this.isProjectNameAvailable(sanitized)) {
      return sanitized;
    }

    for (let i = 0; i < 5; i++) {
      const suffix = Math.random().toString(36).substring(2, 8);
      const name = `${sanitized}-${suffix}`;
      if (await this.isProjectNameAvailable(name)) {
        return name;
      }
    }

    throw new DeploymentError(
      'Could not generate unique project name',
      'VERCEL_API_ERROR'
    );
    }

  async waitForDeployment(
    deploymentId: string,
    options?: {
      timeout?: number;
      pollInterval?: number;
      onProgress?: (deployment: VercelDeployment) => void;
    }
  ): Promise<VercelDeployment> {
    const timeout = options?.timeout || 300000;
    const pollInterval = options?.pollInterval || 3000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const deployment = await this.getDeployment(deploymentId);

      if (options?.onProgress) {
        options.onProgress(deployment);
      }

      if (['READY', 'ERROR', 'CANCELED'].includes(deployment.readyState)) {
        return deployment;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new DeploymentError(
      'Deployment timed out',
      'VERCEL_API_ERROR',
      { timeout }
    );
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createVercelClient(config: VercelConfig): VercelClient {
  return new VercelClient(config);
}

