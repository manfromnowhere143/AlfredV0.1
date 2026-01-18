/**
 * Alfred Code - Surgical Modification API
 *
 * The Steve Jobs approach: Analyze existing files, make minimal changes.
 *
 * POST - Analyze files and return a modification plan
 */

export const maxDuration = 120; // 2 minutes for analysis (increased for larger projects)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLLMClient } from '@alfred/llm';
import { compileDNAForPrompt } from '@alfred/core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

interface AttachmentData {
  id: string;
  name: string;
  type: string;
  category: string;
  base64?: string;
  url?: string;
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

  const jsonStr = cleaned.slice(startIdx, endIdx + 1);

  // Validate and repair truncated JSON if needed
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch (e) {
    // Try to repair common truncation issues
    console.log('[Alfred Code] Attempting to repair truncated JSON...');
    const repaired = repairTruncatedJSON(jsonStr);
    JSON.parse(repaired); // Validate the repair worked
    console.log('[Alfred Code] JSON repair successful');
    return repaired;
  }
}

function repairTruncatedJSON(jsonStr: string): string {
  let result = jsonStr;

  // Count open/close brackets and braces
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
  }

  // If we're still in a string, close it
  if (inString) {
    result += '"';
  }

  // Close any unclosed brackets and braces
  while (bracketCount > 0) {
    result += ']';
    bracketCount--;
  }
  while (braceCount > 0) {
    result += '}';
    braceCount--;
  }

  return result;
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
    const { files, userRequest, attachments } = body as {
      files: ProjectFile[];
      userRequest: string;
      attachments?: AttachmentData[];
    };

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!userRequest || !userRequest.trim()) {
      return NextResponse.json({ error: 'No modification request provided' }, { status: 400 });
    }

    // Process image attachments for Claude vision
    const imageAttachments = (attachments || []).filter(
      a => a.category === 'image' && (a.base64 || a.url)
    );

    // Process video attachments (URL reference only - can't analyze video content)
    const videoAttachments = (attachments || []).filter(
      a => a.category === 'video' && a.url
    );

    console.log('[Alfred Code] Analyzing modification request:', {
      fileCount: files.length,
      attachmentCount: attachments?.length || 0,
      imageCount: imageAttachments.length,
      videoCount: videoAttachments.length,
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
10. For EMPTY files or files that need complete rewrite, use action: "create" with newContent
11. When user shares an image and asks to use it, add an img tag with the provided URL
12. When user shares a VIDEO and asks to use it (hero, background, etc.), use INSTANT LOADING attributes

ACTION TYPES:
- "modify": Use for changing existing code. Requires "changes" array with search/replace pairs.
- "create": Use for empty files OR when file needs complete replacement. Requires "newContent" with FULL file content.
- "delete": Use to remove a file.

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
    },
    {
      "path": "/src/components/EmptyComponent.tsx",
      "action": "create",
      "newContent": "import React from 'react';\\n\\nexport default function EmptyComponent() {\\n  return <div>Content</div>;\\n}",
      "reason": "Creating new component with full content since file was empty"
    }
  ],
  "impact": ["Header.tsx", "EmptyComponent.tsx"],
  "confidence": "high"
}

CONFIDENCE LEVELS:
- "high": Simple, localized changes (color, text, single component)
- "medium": Changes affecting multiple files or component behavior
- "low": Architectural changes or unclear requirements

IMPORTANT: Only output valid JSON. No explanatory text before or after.

${compileDNAForPrompt()}`;

    // Build user message content with optional images
    type ContentBlock = { type: 'text'; text: string } | {
      type: 'image';
      source: {
        type: 'base64' | 'url';
        mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        data: string;
      };
    };

    const userContent: ContentBlock[] = [];

    // Add images FIRST (Claude processes images before text for better context)
    for (const img of imageAttachments) {
      if (img.base64) {
        // Determine media type from file type
        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png';
        if (img.type.includes('jpeg') || img.type.includes('jpg')) mediaType = 'image/jpeg';
        else if (img.type.includes('gif')) mediaType = 'image/gif';
        else if (img.type.includes('webp')) mediaType = 'image/webp';

        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            mediaType,
            data: img.base64,
          },
        });
        console.log(`[Alfred Code] Added image: ${img.name} (${mediaType})`);
      }
    }

    // Add image context to the prompt if we have images
    let enhancedPrompt = systemPrompt;
    if (imageAttachments.length > 0) {
      // Build list of images with their URLs for Claude to use in code
      const imageList = imageAttachments.map((img, i) => {
        const urlInfo = img.url ? `\n   URL TO USE IN CODE: "${img.url}"` : '';
        return `- Image ${i + 1}: ${img.name}${urlInfo}`;
      }).join('\n');

      enhancedPrompt += `\n\n📎 USER ATTACHED ${imageAttachments.length} IMAGE(S):
${imageList}

CRITICAL INSTRUCTIONS FOR IMAGES:
1. I can SEE the images above - describe what you see in each one
2. When the user wants to USE an image (as logo, background, etc.), use the URL provided above
3. For logos/icons: Update the relevant component to use <img src="THE_URL_PROVIDED" ... />
4. For backgrounds: Use the URL in CSS background-image or inline styles
5. ALWAYS use the exact URL provided - do not make up paths like "/logo.png"

Example modification for using an uploaded image as logo:
{
  "path": "/src/components/Navigation.tsx",
  "action": "modify",
  "changes": [{
    "search": "<img src=\\"/logo.png\\"",
    "replace": "<img src=\\"https://actual-uploaded-url.blob.vercel-storage.com/image.png\\""
  }],
  "reason": "Replacing logo with user's uploaded image"
}`;
    }

    // Add video context to the prompt if we have videos
    if (videoAttachments.length > 0) {
      const videoList = videoAttachments.map((vid, i) => {
        return `- Video ${i + 1}: ${vid.name}\n   URL TO USE IN CODE: "${vid.url}"`;
      }).join('\n');

      enhancedPrompt += `\n\n🎬 USER ATTACHED ${videoAttachments.length} VIDEO(S):
${videoList}

⚡ CRITICAL INSTRUCTIONS FOR INSTANT VIDEO LOADING:
When adding videos to the UI (hero, background, etc.), use these EXACT attributes for ZERO delay:

<video
  src="THE_VIDEO_URL_PROVIDED"
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  className="absolute inset-0 w-full h-full object-cover"
  style={{ objectFit: 'cover' }}
/>

REQUIRED ATTRIBUTES FOR INSTANT DISPLAY:
- preload="auto" - CRITICAL! Without this, video takes 3+ seconds to appear
- autoPlay muted - Required for browser auto-play policy
- playsInline - Required for mobile devices
- loop - For background/hero videos that should repeat

Example modification for using an uploaded video as hero background:
{
  "path": "/src/components/Hero.tsx",
  "action": "modify",
  "changes": [{
    "search": "<div className=\\"hero-background\\">",
    "replace": "<div className=\\"hero-background relative\\">\\n        <video src=\\"https://blob.vercel-storage.com/video.mp4\\" autoPlay muted loop playsInline preload=\\"auto\\" className=\\"absolute inset-0 w-full h-full object-cover\\" />"
  }],
  "reason": "Adding user's uploaded video as hero background with instant loading"
}`;
    }

    // Add text content
    userContent.push({ type: 'text', text: enhancedPrompt });

    // Create LLM client with higher max tokens and timeout
    const llm = createLLMClient({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8000,
      timeout: 90000, // 90 second timeout
    });

    // Get modification plan from Claude with retry logic
    let response;
    let lastError;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const mediaInfo = [
          imageAttachments.length > 0 ? `${imageAttachments.length} images` : '',
          videoAttachments.length > 0 ? `${videoAttachments.length} videos` : '',
        ].filter(Boolean).join(', ');
        console.log(`[Alfred Code] API attempt ${attempt + 1}/${maxRetries + 1}${mediaInfo ? ` (with ${mediaInfo})` : ''}`);
        response = await llm.complete({
          system: 'You are a code modification expert. Output only valid JSON. Keep responses concise. When images are provided, describe what you see. When videos are provided, use the URLs with instant-loading attributes.',
          messages: [{ role: 'user', content: userContent }],
          maxTokens: 8000,
          temperature: 0.2,
        });
        break; // Success, exit retry loop
      } catch (err) {
        lastError = err;
        console.warn(`[Alfred Code] Attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to get response from AI after retries');
    }

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

    // Provide user-friendly error messages
    let message = 'Failed to analyze modifications';
    let status = 500;

    if (error instanceof Error) {
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        message = 'Request took too long. Try a simpler modification or reduce file count.';
        status = 504;
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        message = 'Too many requests. Please wait a moment and try again.';
        status = 429;
      } else {
        message = error.message;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
