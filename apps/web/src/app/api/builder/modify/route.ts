/**
 * Alfred Code - Surgical Modification API
 *
 * The Steve Jobs approach: Analyze existing files, make minimal changes.
 *
 * POST - Analyze files and return a modification plan
 */

export const maxDuration = 60; // 1 minute for analysis

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLLMClient } from '@alfred/llm';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

interface FileChange {
  search: string;
  replace: string;
}

interface FileModification {
  path: string;
  action: 'modify' | 'create' | 'delete';
  changes?: FileChange[];
  newContent?: string;
  reason: string;
}

interface ModificationPlan {
  analysis: string;
  modifications: FileModification[];
  impact: string[];
  confidence: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
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
  };
  return langMap[ext || ''] || 'text';
}

function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift();
    if (lines[lines.length - 1]?.trim() === '```') {
      lines.pop();
    }
    cleaned = lines.join('\n');
  }

  // Find JSON boundaries
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No JSON object found in response');
  }

  return cleaned.slice(startIdx, endIdx + 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Generate Modification Plan
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { files, userRequest } = body as {
      files: ProjectFile[];
      userRequest: string;
    };

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!userRequest || !userRequest.trim()) {
      return NextResponse.json({ error: 'No modification request provided' }, { status: 400 });
    }

    console.log('[Alfred Code] Analyzing modification request:', {
      fileCount: files.length,
      request: userRequest.slice(0, 100),
    });

    // Build system prompt for surgical modifications
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

    // Create LLM client
    const llm = createLLMClient({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4000,
    });

    // Get modification plan from Claude
    const response = await llm.complete({
      system: 'You are a code modification expert. Output only valid JSON.',
      messages: [{ role: 'user', content: systemPrompt }],
      maxTokens: 4000,
      temperature: 0.3, // Lower temperature for more precise output
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON response
    const jsonText = extractJSON(textContent.text);
    const plan = JSON.parse(jsonText) as ModificationPlan;

    console.log('[Alfred Code] Generated plan:', {
      modifications: plan.modifications.length,
      confidence: plan.confidence,
      impact: plan.impact,
    });

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('[Alfred Code] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze modifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
