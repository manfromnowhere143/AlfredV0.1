/**
 * ALFRED CONTEXT PROTOCOL
 * 
 * How external information flows into Alfred's prompts.
 * This keeps DNA pure while allowing rich contextual behavior.
 * 
 * Context types:
 * - Session: Current conversation state
 * - Project: Codebase and technical context  
 * - User: Preferences and history
 * - Memory: Retrieved relevant information
 */

export interface SessionContext {
    readonly id: string;
    readonly startedAt: Date;
    readonly messageCount: number;
    readonly currentFacet: import('./facets').Facet;
    readonly inferredSkillLevel: import('./skills').SkillLevel;
    readonly topics: readonly string[];
  }
  
  export interface ProjectContext {
    readonly name?: string;
    readonly description?: string;
    readonly stack: {
      readonly framework?: string;
      readonly language?: string;
      readonly styling?: string;
      readonly database?: string;
    };
    readonly conventions?: readonly string[];
    readonly files?: readonly {
      readonly path: string;
      readonly summary: string;
    }[];
  }
  
  export interface UserContext {
    readonly id?: string;
    readonly preferences: {
      readonly verbosity: 'minimal' | 'normal' | 'detailed';
      readonly codeStyle: 'concise' | 'explicit';
      readonly explainDecisions: boolean;
    };
    readonly recentTopics?: readonly string[];
  }
  
  export interface MemoryContext {
    readonly retrieved: readonly {
      readonly content: string;
      readonly relevance: number;
      readonly source: string;
    }[];
    readonly summary?: string;
  }
  
  export interface FullContext {
    readonly session: SessionContext;
    readonly project?: ProjectContext;
    readonly user?: UserContext;
    readonly memory?: MemoryContext;
  }
  
  /**
   * Default context values
   */
  export const DEFAULT_CONTEXT: FullContext = {
    session: {
      id: '',
      startedAt: new Date(),
      messageCount: 0,
      currentFacet: 'build',
      inferredSkillLevel: 'intermediate',
      topics: [],
    },
  } as const;
  
  /**
   * Compile project context into prompt section
   */
  export function compileProjectContext(project?: ProjectContext): string {
    if (!project) return '';
  
    const parts: string[] = ['## Project Context'];
  
    if (project.name) {
      parts.push(`**Project**: ${project.name}`);
    }
    if (project.description) {
      parts.push(`**Description**: ${project.description}`);
    }
  
    const stack = Object.entries(project.stack)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    
    if (stack) {
      parts.push(`**Stack**: ${stack}`);
    }
  
    if (project.conventions?.length) {
      parts.push(`**Conventions**:\n${project.conventions.map(c => `- ${c}`).join('\n')}`);
    }
  
    if (project.files?.length) {
      parts.push(`**Relevant Files**:\n${project.files.map(f => `- \`${f.path}\`: ${f.summary}`).join('\n')}`);
    }
  
    return parts.join('\n\n');
  }
  
  /**
   * Compile memory context into prompt section
   */
  export function compileMemoryContext(memory?: MemoryContext): string {
    if (!memory?.retrieved.length) return '';
  
    const parts: string[] = ['## Relevant Context from Memory'];
  
    if (memory.summary) {
      parts.push(memory.summary);
    }
  
    // Only include high-relevance memories
    const relevant = memory.retrieved
      .filter(m => m.relevance > 0.7)
      .slice(0, 5);
  
    if (relevant.length) {
      parts.push(relevant.map(m => `> ${m.content}\n> — *${m.source}*`).join('\n\n'));
    }
  
    return parts.join('\n\n');
  }
  
  /**
   * Compile user preferences into prompt modifiers
   */
  export function compileUserPreferences(user?: UserContext): string {
    if (!user?.preferences) return '';
  
    const mods: string[] = [];
  
    if (user.preferences.verbosity === 'minimal') {
      mods.push('User prefers minimal explanations.');
    } else if (user.preferences.verbosity === 'detailed') {
      mods.push('User prefers detailed explanations.');
    }
  
    if (user.preferences.codeStyle === 'concise') {
      mods.push('User prefers concise code.');
    }
  
    if (user.preferences.explainDecisions) {
      mods.push('User wants decisions explained.');
    }
  
    if (!mods.length) return '';
  
    return `## User Preferences\n\n${mods.join(' ')}`;
  }
  
  /**
   * Context injection point marker
   * Used to indicate where context should be inserted in prompts
   */
  export const CONTEXT_MARKERS = {
    project: '{{PROJECT_CONTEXT}}',
    memory: '{{MEMORY_CONTEXT}}',
    user: '{{USER_PREFERENCES}}',
    session: '{{SESSION_STATE}}',
  } as const;