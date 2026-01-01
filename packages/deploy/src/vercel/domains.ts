/**
 * Domain Management
 *
 * Utilities for managing custom domains on Vercel deployments.
 */

import type {
    DomainConfig,
    DNSRecord,
  } from '../types';
  import { DeploymentError } from '../types';
  import { VercelClient } from './client';
  
  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  export const VERCEL_IP_ADDRESSES = {
    v4: '76.76.21.21',
    v6: '2606:4700:20::681a:8a5',
  };
  
  export const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com';
  
  // ============================================================================
  // DOMAIN VALIDATION
  // ============================================================================
  
  export function isValidDomain(domain: string): boolean {
    const domainRegex =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }
  
  export function isSubdomain(domain: string): boolean {
    const parts = domain.split('.');
    return parts.length > 2;
  }
  
  export function getRootDomain(domain: string): string {
    const parts = domain.split('.');
    return parts.slice(-2).join('.');
  }
  
  export function getSubdomainPart(domain: string): string | null {
    const parts = domain.split('.');
    if (parts.length <= 2) return null;
    return parts.slice(0, -2).join('.');
  }
  
  // ============================================================================
  // DNS RECORD GENERATION
  // ============================================================================
  
  export function generateDNSRecords(domain: string): DNSRecord[] {
    const records: DNSRecord[] = [];
    const isSub = isSubdomain(domain);
  
    if (isSub) {
      const subPart = getSubdomainPart(domain);
      records.push({
        type: 'CNAME',
        name: subPart || domain,
        value: VERCEL_CNAME_TARGET,
        ttl: 300,
      });
    } else {
      records.push({
        type: 'A',
        name: '@',
        value: VERCEL_IP_ADDRESSES.v4,
        ttl: 300,
      });
  
      records.push({
        type: 'CNAME',
        name: 'www',
        value: VERCEL_CNAME_TARGET,
        ttl: 300,
      });
    }
  
    return records;
  }
  
  export function formatDNSRecordsForDisplay(records: DNSRecord[]): string {
    const lines = records.map((r) => {
      return `Type: ${r.type.padEnd(6)} Name: ${r.name.padEnd(15)} Value: ${r.value}`;
    });
    return lines.join('\n');
  }
  
  // ============================================================================
  // DOMAIN VERIFICATION
  // ============================================================================
  
  export async function checkDomainStatus(
    client: VercelClient,
    projectId: string,
    domain: string
  ): Promise<{
    configured: boolean;
    verified: boolean;
    dnsRecords?: DNSRecord[];
    issues?: string[];
  }> {
    try {
      const { domains } = await client.listDomains(projectId);
      const domainInfo = domains.find((d) => d.name === domain);
  
      if (!domainInfo) {
        return {
          configured: false,
          verified: false,
          issues: ['Domain not found on project'],
        };
      }
  
      const config = await client.getDomainConfig(domain);
  
      const result = {
        configured: !config.misconfigured,
        verified: domainInfo.verified,
        dnsRecords: generateDNSRecords(domain),
        issues: [] as string[],
      };
  
      if (config.misconfigured) {
        result.issues.push('DNS is not properly configured');
      }
  
      if (!domainInfo.verified && domainInfo.verification) {
        result.issues.push('Domain ownership verification pending');
        result.dnsRecords = domainInfo.verification.map((v) => ({
          type: v.type as DNSRecord['type'],
          name: v.domain,
          value: v.value,
        }));
      }
  
      return result;
    } catch (error) {
      return {
        configured: false,
        verified: false,
        issues: [`Error checking domain: ${(error as Error).message}`],
      };
    }
  }
  
  export async function addAndVerifyDomain(
    client: VercelClient,
    projectId: string,
    domain: string
  ): Promise<DomainConfig> {
    if (!isValidDomain(domain)) {
      throw new DeploymentError(
        `Invalid domain format: ${domain}`,
        'DOMAIN_ERROR'
      );
    }
  
    const domainResult = await client.addDomain(projectId, { name: domain });
    const dnsRecords = generateDNSRecords(domain);
  
    if (domainResult.verified) {
      return {
        type: 'custom',
        domain,
        verified: true,
        dnsRecords,
      };
    }
  
    const verificationRecords: DNSRecord[] =
      domainResult.verification?.map((v) => ({
        type: v.type as DNSRecord['type'],
        name: v.domain,
        value: v.value,
      })) || dnsRecords;
  
    return {
      type: 'custom',
      domain,
      verified: false,
      dnsRecords: verificationRecords,
    };
  }
  
  export async function verifyDomain(
    client: VercelClient,
    projectId: string,
    domain: string
  ): Promise<DomainConfig> {
    const result = await client.verifyDomain(projectId, domain);
  
    return {
      type: 'custom',
      domain,
      verified: result.verified,
      dnsRecords: generateDNSRecords(domain),
    };
  }
  
  // ============================================================================
  // DOMAIN SUGGESTIONS
  // ============================================================================
  
  export function suggestDomainNames(projectName: string): string[] {
    const base = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  
    return [
      `${base}.vercel.app`,
      `${base}-app.vercel.app`,
      `${base}-site.vercel.app`,
      `my-${base}.vercel.app`,
    ];
  }
  
  export type { DomainConfig, DNSRecord };