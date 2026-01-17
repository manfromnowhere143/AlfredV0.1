/**
 * Alfred Code - Surgical Modification Engine
 *
 * The Steve Jobs approach: No extra servers, no WebSocket complexity.
 * Just smart API calls that think like Claude Code.
 *
 * "Simplicity is the ultimate sophistication."
 */

import Anthropic from '@anthropic-ai/sdk';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

export interface FileChange {
  search: string;   // Text to find (exact match)
  replace: string;  // Text to replace with
}

export interface FileModification {
  path: string;
  action: 'modify' | 'create' | 'delete';
  changes?: FileChange[];     // For modify action
  newContent?: string;        // For create action
  reason: string;
}

export interface ModificationPlan {
  analysis: string;           // What Alfred understood from the request
  modifications: FileModification[];
  impact: string[];           // Files that will be affected
  confidence: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SURGICAL MODIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyzes existing project files and generates a surgical modification plan.
 * This is the core of Alfred Code - thinking like Claude Code without the CLI.
 */
export async function modifyProject(
  files: ProjectFile[],
  userRequest: string
): Promise<ModificationPlan> {
  const anthropic = new Anthropic();

  const systemPrompt = `You are Alfred Code, an expert at surgical code modifications.

CURRENT PROJECT FILES:
${files.map(f => `
### ${f.path}
\`\`\`${f.language || getLanguageFromPath(f.path)}
${f.content}
\`\`\`
`).join('\n')}

USER REQUEST: "${userRequest}"

CRITICAL RULES:
1. ANALYZE all files first to understand the project structure and dependencies
2. Identify the MINIMUM changes needed to fulfill the request
3. Use search/replace operations for modifications (like str_replace in Claude Code)
4. The "search" string must be an EXACT match of existing code (including whitespace/indentation)
5. NEVER regenerate entire files unless absolutely necessary
6. Preserve all existing code patterns, styles, and formatting
7. Be SURGICAL - if one line needs to change, only change that one line
8. For CSS changes, include enough context to make the search unique
9. Consider side effects - if changing a prop name, check for all usages

OUTPUT FORMAT (JSON only, no markdown code blocks):
{
  "analysis": "Brief explanation of what you understood and your approach",
  "modifications": [
    {
      "path": "/src/components/Header.tsx",
      "action": "modify",
      "changes": [
        {
          "search": "bg-slate-900",
          "replace": "bg-blue-600"
        }
      ],
      "reason": "Changing header background color to blue as requested"
    }
  ],
  "impact": ["Header.tsx"],
  "confidence": "high"
}

CONFIDENCE LEVELS:
- "high": Simple, localized changes (color, text, single component)
- "medium": Changes affecting multiple files or component behavior
- "low": Architectural changes or unclear requirements

IMPORTANT: Only output valid JSON. No explanatory text before or after.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonText = extractJSON(content.text);
    const plan = JSON.parse(jsonText) as ModificationPlan;

    // Validate the plan
    validateModificationPlan(plan, files);

    return plan;
  } catch (error) {
    console.error('[Alfred Code] Modification analysis failed:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY MODIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApplyResult {
  success: boolean;
  newFiles: Map<string, string>;
  appliedChanges: number;
  failedChanges: { path: string; search: string; reason: string }[];
}

/**
 * Applies the modification plan to the project files.
 * Uses str_replace style exact matching.
 */
export function applyModifications(
  files: Map<string, string>,
  plan: ModificationPlan
): ApplyResult {
  const newFiles = new Map(files);
  const failedChanges: { path: string; search: string; reason: string }[] = [];
  let appliedChanges = 0;

  for (const mod of plan.modifications) {
    switch (mod.action) {
      case 'modify': {
        const content = newFiles.get(mod.path);
        if (!content) {
          failedChanges.push({
            path: mod.path,
            search: '',
            reason: `File not found: ${mod.path}`
          });
          continue;
        }

        let updatedContent = content;
        for (const change of mod.changes || []) {
          if (updatedContent.includes(change.search)) {
            // Replace only the first occurrence (surgical)
            updatedContent = updatedContent.replace(change.search, change.replace);
            appliedChanges++;
          } else {
            // Try with normalized whitespace
            const normalizedSearch = change.search.replace(/\s+/g, ' ').trim();
            const normalizedContent = updatedContent.replace(/\s+/g, ' ');

            if (normalizedContent.includes(normalizedSearch)) {
              // Find the actual position and replace
              // This is a fuzzy match - might need more sophisticated handling
              console.warn(`[Alfred Code] Fuzzy match needed for: ${change.search.slice(0, 50)}...`);
              failedChanges.push({
                path: mod.path,
                search: change.search.slice(0, 100),
                reason: 'Exact match not found, whitespace might differ'
              });
            } else {
              failedChanges.push({
                path: mod.path,
                search: change.search.slice(0, 100),
                reason: 'Search string not found in file'
              });
            }
          }
        }
        newFiles.set(mod.path, updatedContent);
        break;
      }

      case 'create': {
        if (newFiles.has(mod.path)) {
          console.warn(`[Alfred Code] Overwriting existing file: ${mod.path}`);
        }
        newFiles.set(mod.path, mod.newContent || '');
        appliedChanges++;
        break;
      }

      case 'delete': {
        if (newFiles.has(mod.path)) {
          newFiles.delete(mod.path);
          appliedChanges++;
        } else {
          failedChanges.push({
            path: mod.path,
            search: '',
            reason: 'File not found for deletion'
          });
        }
        break;
      }
    }
  }

  return {
    success: failedChanges.length === 0,
    newFiles,
    appliedChanges,
    failedChanges
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    py: 'python',
    go: 'go',
    rs: 'rust',
  };
  return langMap[ext || ''] || 'text';
}

function extractJSON(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.trim();

  // Remove ```json or ``` wrappers
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift(); // Remove opening ```json
    if (lines[lines.length - 1]?.trim() === '```') {
      lines.pop(); // Remove closing ```
    }
    cleaned = lines.join('\n');
  }

  // Find JSON object boundaries
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No JSON object found in response');
  }

  return cleaned.slice(startIdx, endIdx + 1);
}

function validateModificationPlan(plan: ModificationPlan, files: ProjectFile[]): void {
  const filePaths = new Set(files.map(f => f.path));

  for (const mod of plan.modifications) {
    if (mod.action === 'modify' && !filePaths.has(mod.path)) {
      console.warn(`[Alfred Code] Modification targets non-existent file: ${mod.path}`);
    }

    if (mod.action === 'modify' && (!mod.changes || mod.changes.length === 0)) {
      console.warn(`[Alfred Code] Modify action with no changes for: ${mod.path}`);
    }

    if (mod.action === 'create' && !mod.newContent) {
      console.warn(`[Alfred Code] Create action with no content for: ${mod.path}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODIFICATION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determines if the user's request is asking for a modification to existing code
 * vs a brand new project generation.
 */
export function isModificationRequest(
  message: string,
  existingFileCount: number
): boolean {
  // If no files exist, can't be a modification
  if (existingFileCount === 0) return false;

  const messageLower = message.toLowerCase();

  // Keywords that strongly indicate modification
  const modificationKeywords = [
    'change', 'modify', 'update', 'fix', 'adjust', 'edit',
    'make the', 'turn the', 'set the', 'add a', 'remove the',
    'replace', 'rename', 'move', 'delete', 'improve',
    'can you', 'could you', 'please',
    'instead', 'rather', 'different',
    'color', 'size', 'position', 'style', 'text', 'title',
    'bug', 'error', 'issue', 'broken', 'wrong', 'not working',
  ];

  // Keywords that indicate wanting a new project
  const newProjectKeywords = [
    'create a new', 'build me a new', 'start fresh',
    'from scratch', 'brand new', 'new project',
    'generate a', 'make me a new',
  ];

  // Check for new project indicators first
  for (const keyword of newProjectKeywords) {
    if (messageLower.includes(keyword)) {
      return false;
    }
  }

  // Check for modification indicators
  for (const keyword of modificationKeywords) {
    if (messageLower.includes(keyword)) {
      return true;
    }
  }

  // Default: if files exist and message is short, probably a modification
  // Long messages might be describing a new project
  return message.length < 200;
}
