/**
 * API Types
 *
 * Request/response contracts for all API endpoints.
 * Every field is explicit. No implicit any.
 */

import type { AlfredMode, SkillLevel } from '@alfred/core';

// ============================================================================
// BASE TYPES
// ============================================================================

export interface ApiRequest<T = unknown> {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  payload: T;
}

export interface ApiResponse<T = unknown> {
  id: string;
  requestId: string;
  timestamp: Date;
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta: ResponseMeta;
}

export interface ResponseMeta {
  processingTimeMs: number;
  tokensUsed?: number;
  cached: boolean;
  version: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

// ============================================================================
// CONVERSATION ENDPOINTS
// ============================================================================

export interface StartConversationRequest {
  userId?: string;
  mode?: AlfredMode;
  projectContext?: ProjectContextInput;
}

export interface StartConversationResponse {
  conversationId: string;
  sessionId: string;
  mode: AlfredMode;
  greeting: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  attachments?: Attachment[];
}

export interface SendMessageResponse {
  messageId: string;
  content: string;
  mode: AlfredMode;
  modeChanged: boolean;
  suggestions?: string[];
  artifacts?: Artifact[];
}

export interface Attachment {
  type: 'code' | 'file' | 'image' | 'url';
  content: string;
  metadata?: Record<string, string>;
}

export interface Artifact {
  id: string;
  type: 'code' | 'architecture' | 'document';
  title: string;
  content: string;
  language?: string;
}

// ============================================================================
// PROJECT CONTEXT
// ============================================================================

export interface ProjectContextInput {
  name: string;
  type: 'web_app' | 'dashboard' | 'api' | 'library' | 'other';
  stack?: StackInput;
  constraints?: string[];
  goals?: string[];
}

export interface StackInput {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  infrastructure?: string[];
}

// ============================================================================
// MODE ENDPOINTS
// ============================================================================

export interface SwitchModeRequest {
  conversationId: string;
  mode: AlfredMode;
  reason?: string;
}

export interface SwitchModeResponse {
  previousMode: AlfredMode;
  currentMode: AlfredMode;
  announcement: string;
}

// ============================================================================
// MEMORY ENDPOINTS
// ============================================================================

export interface GetUserMemoryRequest {
  userId: string;
  includeDecayed?: boolean;
}

export interface GetUserMemoryResponse {
  userId: string;
  preferences: UserPreferencesOutput;
  skillProfile: SkillProfileOutput;
  recentProjects: string[];
  memoryHealth: MemoryHealthOutput;
}

export interface UserPreferencesOutput {
  defaultMode: AlfredMode;
  optimizeFor: 'speed' | 'clarity' | 'learning';
  verbosity: 'minimal' | 'normal' | 'detailed';
}

export interface SkillProfileOutput {
  level: SkillLevel;
  confidence: number;
  topSignals: string[];
}

export interface MemoryHealthOutput {
  totalMemories: number;
  activeMemories: number;
  averageStrength: number;
}

// ============================================================================
// RAG ENDPOINTS
// ============================================================================

export interface SearchKnowledgeRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
}

export interface SearchFilters {
  sourceTypes?: string[];
  languages?: string[];
  qualityTiers?: string[];
}

export interface SearchKnowledgeResponse {
  results: SearchResultOutput[];
  totalFound: number;
  processingTimeMs: number;
}

export interface SearchResultOutput {
  id: string;
  content: string;
  source: string;
  score: number;
  highlights?: string[];
}

// ============================================================================
// ARCHITECTURE ENDPOINTS
// ============================================================================

export interface GenerateArchitectureRequest {
  conversationId: string;
  requirements: string;
  constraints?: string[];
  preferences?: ArchitecturePreferences;
}

export interface ArchitecturePreferences {
  complexity: 'minimal' | 'standard' | 'enterprise';
  prioritize: 'speed' | 'scalability' | 'maintainability';
}

export interface GenerateArchitectureResponse {
  architectureId: string;
  summary: string;
  components: ComponentOutput[];
  decisions: DecisionOutput[];
  diagram?: string;
}

export interface ComponentOutput {
  name: string;
  responsibility: string;
  dependencies: string[];
  technology?: string;
}

export interface DecisionOutput {
  title: string;
  decision: string;
  rationale: string;
  alternatives: string[];
}

// ============================================================================
// REVIEW ENDPOINTS
// ============================================================================

export interface ReviewCodeRequest {
  conversationId: string;
  code: string;
  language: string;
  context?: string;
  focusAreas?: string[];
}

export interface ReviewCodeResponse {
  reviewId: string;
  summary: string;
  issues: ReviewIssueOutput[];
  suggestions: string[];
  overallQuality: 'excellent' | 'good' | 'needs_work' | 'poor';
}

export interface ReviewIssueOutput {
  severity: 'critical' | 'important' | 'optional';
  line?: number;
  description: string;
  suggestion: string;
  category: string;
}

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  components: ComponentHealthOutput[];
}

export interface ComponentHealthOutput {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
}
