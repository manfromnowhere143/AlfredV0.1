// ═══════════════════════════════════════════════════════════════════════════════
// CHAT API ROUTE - /api/chat
// Production-grade with persistent file context + video support + artifact editing
// + Usage tracking for billing/limits
// ═══════════════════════════════════════════════════════════════════════════════

export const maxDuration = 300; // Vercel Pro: 5 min timeout for long generations

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectFacet, buildSystemPrompt, inferSkillLevel as coreInferSkillLevel } from '@alfred/core';
import { createLLMClient, type StreamOptions } from '@alfred/llm';
import { db, conversations, messages, files, users, eq, asc, desc, sql } from '@alfred/database';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { extractCodeFromResponse, saveArtifact, loadLatestArtifact } from '@/lib/artifacts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  base64?: string;
}

interface ImageBlock {
  type: 'image';
  source: {
    type: 'base64';
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

interface TextBlock {
  type: 'text';
  text: string;
}

interface DocumentBlock {
  type: 'document';
  source: {
    type: 'base64';
    mediaType: 'application/pdf';
    data: string;
  };
}

type ContentBlock = TextBlock | ImageBlock | DocumentBlock;

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface UsageData {
  inputTokens: number;
  outputTokens: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES_PER_REQUEST = 5;
const MAX_HISTORY_MESSAGES = 20;

/**
 * Tier Limits - Based on 50% margin model
 * Must match /api/usage/route.ts
 */
const TIER_LIMITS = {
  free: { dailyTokens: 4_500, monthlyTokens: 135_000 },
  pro: { dailyTokens: 22_000, monthlyTokens: 660_000 },
  business: { dailyTokens: 55_000, monthlyTokens: 1_650_000 },
  enterprise: { dailyTokens: -1, monthlyTokens: -1 },
};

const CODE_FORMATTING_RULES = `
██████████████████████████████████████████████████████████████████████████████
██  MANDATORY CODE FORMATTING - FAILURE TO COMPLY BREAKS THE UI             ██
██████████████████████████████████████████████████████████████████████████████

EVERY piece of code MUST be wrapped in markdown code blocks:

\`\`\`jsx
export default function Component() {
  return <div>Content</div>;
}
\`\`\`

Rules:
1. Start with \`\`\`jsx (or \`\`\`html, \`\`\`typescript, \`\`\`css, etc.)
2. Newline after opening backticks
3. Complete, runnable code
4. Newline then \`\`\` to close
5. NEVER output raw HTML/JSX without code blocks
6. ALWAYS complete code files fully - NEVER stop mid-file
7. If generating a large component, finish it completely with all closing tags

██████████████████████████████████████████████████████████████████████████████
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT MODIFICATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

function buildArtifactModificationPrompt(code: string, title: string): string {
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ARTIFACT MODIFICATION MODE                                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Component: ${title.padEnd(63)}║
╚══════════════════════════════════════════════════════════════════════════════╝

CURRENT CODE:
\`\`\`jsx
${code}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
INSTRUCTIONS:
═══════════════════════════════════════════════════════════════════════════════

The user wants to MODIFY the code above. You must:

1. UNDERSTAND the existing code structure completely
2. APPLY the user's requested changes
3. OUTPUT the COMPLETE updated code (never partial snippets or diffs)
4. PRESERVE all existing functionality unless explicitly asked to remove it
5. MAINTAIN the same component name and export structure
6. WRAP output in \`\`\`jsx code blocks

RESPONSE FORMAT:
- Start with a brief (1-2 sentence) explanation of what you changed
- Then output the complete modified code in a jsx code block
- Keep explanation concise - the user will see the code diff

═══════════════════════════════════════════════════════════════════════════════
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

let llmClient: ReturnType<typeof createLLMClient> | null = null;

function getLLMClient() {
  if (!llmClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    
    llmClient = createLLMClient({
      apiKey,
      model: (process.env.ANTHROPIC_MODEL as any) || 'claude-sonnet-4-20250514',
      maxTokens: 32768,
      temperature: 0.7,
      maxRetries: 3,
    });
  }
  return llmClient;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if user has exceeded their usage limits
 * Returns null if within limits, or an error object if exceeded
 */
async function checkUsageLimits(userId: string): Promise<{ exceeded: boolean; message?: string; tier?: string }> {
  try {
    // Get user tier
    const [user] = await db
      .select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const tier = (user?.tier || 'free') as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    
    // Unlimited tier
    if (limits.dailyTokens < 0) {
      return { exceeded: false, tier };
    }
    
    const today = new Date().toISOString().split('T')[0];
    const monthStart = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-01`;
    
    // Check daily usage
    const dailyResult: any = await db.execute(
      sql`SELECT COALESCE(SUM(output_tokens), 0) as tokens FROM usage WHERE user_id = ${userId} AND date = ${today}`
    );
    const dailyUsed = Number(dailyResult.rows?.[0]?.tokens || dailyResult[0]?.tokens || 0);
    
    if (dailyUsed >= limits.dailyTokens) {
      return {
        exceeded: true,
        tier,
        message: `You've reached your daily limit. Your quota resets at midnight UTC.`,
      };
    }
    
    // Check monthly usage
    const monthlyResult: any = await db.execute(
      sql`SELECT COALESCE(SUM(output_tokens), 0) as tokens FROM usage WHERE user_id = ${userId} AND date >= ${monthStart}`
    );
    const monthlyUsed = Number(monthlyResult.rows?.[0]?.tokens || monthlyResult[0]?.tokens || 0);
    
    if (monthlyUsed >= limits.monthlyTokens) {
      return {
        exceeded: true,
        tier,
        message: `You've reached your monthly limit. Upgrade your plan for more tokens.`,
      };
    }
    
    return { exceeded: false, tier };
  } catch (error) {
    console.error('[Alfred] Error checking usage limits:', error);
    // On error, allow the request to proceed (fail open)
    return { exceeded: false };
  }
}

/**
 * Track usage after successful response
 */
async function trackUsage(userId: string, usage: UsageData): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await db.execute(sql`
      INSERT INTO usage (user_id, date, output_tokens, input_tokens, request_count, artifact_count)
      VALUES (${userId}, ${today}, ${usage.outputTokens}, ${usage.inputTokens}, 1, 0)
      ON CONFLICT (user_id, date) 
      DO UPDATE SET 
        output_tokens = usage.output_tokens + ${usage.outputTokens},
        input_tokens = usage.input_tokens + ${usage.inputTokens},
        request_count = usage.request_count + 1,
        updated_at = NOW()
    `);
    
    console.log(`[Alfred] 📊 Tracked usage: ${usage.outputTokens} output, ${usage.inputTokens} input tokens`);
  } catch (error) {
    // Don't fail the request if usage tracking fails
    console.error('[Alfred] Failed to track usage:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function isImage(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType);
}

function isVideo(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType) || mimeType.startsWith('video/');
}

function isPDF(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

function normalizeMimeType(type: string, filename: string): string {
  if (SUPPORTED_IMAGE_TYPES.includes(type) || SUPPORTED_DOCUMENT_TYPES.includes(type) || type.startsWith('video/')) {
    return type;
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
    'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
  };
  return mimeMap[ext || ''] || type;
}

async function readFileFromUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith('http')) {
      console.log('[Chat] Fetching remote file:', url);
      const response = await fetch(url);
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer.toString('base64');
    }
  } catch (e) { console.error('[Chat] Remote fetch error:', e); }
  
  try {
    const filepath = path.join(process.cwd(), 'public', url);
    if (!existsSync(filepath)) {
      console.log(`[Chat] File not found on disk: ${filepath}`);
      return null;
    }
    const buffer = await readFile(filepath);
    return buffer.toString('base64');
  } catch (error) {
    console.error(`[Chat] Error reading file ${url}:`, error);
    return null;
  }
}

async function buildMessageContent(
  text: string,
  fileAttachments?: FileAttachment[],
  skipVideos: boolean = true
): Promise<string | ContentBlock[]> {
  if (!fileAttachments || fileAttachments.length === 0) {
    return text || 'Hello';
  }

  const content: ContentBlock[] = [];
  let processedFiles = 0;
  let skippedFiles = 0;

  for (const file of fileAttachments) {
    const mimeType = normalizeMimeType(file.type, file.name);
    
    if (isVideo(mimeType)) {
      console.log(`[Chat] ⏭️ Skipping video (not supported): ${file.name}`);
      skippedFiles++;
      continue;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      console.log(`[Chat] ⏭️ Skipping large file (${(file.size / 1024 / 1024).toFixed(1)}MB): ${file.name}`);
      skippedFiles++;
      continue;
    }

    if (processedFiles >= MAX_IMAGES_PER_REQUEST) {
      console.log(`[Chat] ⏭️ Max images reached, skipping: ${file.name}`);
      skippedFiles++;
      continue;
    }

    if (!isImage(mimeType) && !isPDF(mimeType)) {
      console.log(`[Chat] ⏭️ Unsupported type: ${file.name} (${mimeType})`);
      continue;
    }

    let base64Data: string | null = null;
    
    if (file.base64) {
      base64Data = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
    } else if (file.url) {
      base64Data = await readFileFromUrl(file.url);
    }

    if (!base64Data) {
      console.log(`[Chat] ⚠️ No data for file: ${file.name}`);
      continue;
    }

    if (isImage(mimeType)) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          mediaType: mimeType as ImageBlock['source']['mediaType'],
          data: base64Data,
        },
      });
      processedFiles++;
      console.log(`[Chat] ✅ Added image: ${file.name}`);
    } else if (isPDF(mimeType)) {
      content.push({
        type: 'document',
        source: { type: 'base64', mediaType: 'application/pdf', data: base64Data },
      });
      processedFiles++;
      console.log(`[Chat] ✅ Added PDF: ${file.name}`);
    }
  }

  const textContent = text?.trim() || (processedFiles > 0 
    ? 'Please analyze the attached file(s) and describe what you see.'
    : 'Hello');
  
  content.push({ type: 'text', text: textContent });

  if (content.length === 1 && content[0].type === 'text') {
    return (content[0] as TextBlock).text;
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY LOADING
// ═══════════════════════════════════════════════════════════════════════════════

async function loadConversationHistory(conversationId: string): Promise<LLMMessage[]> {
  const llmMessages: LLMMessage[] = [];
  
  try {
    const dbMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(MAX_HISTORY_MESSAGES);

    let imagesInHistory = 0;

    for (const msg of dbMessages) {
      const role: 'user' | 'assistant' = msg.role === 'user' ? 'user' : 'assistant';
      
      if (role === 'user') {
        const msgFiles = await db
          .select()
          .from(files)
          .where(eq(files.messageId, msg.id));

        const imageFiles = msgFiles.filter(f => isImage(f.mimeType) && !isVideo(f.mimeType));
        
        if (imageFiles.length > 0 && imagesInHistory < MAX_IMAGES_PER_REQUEST) {
          const attachments: FileAttachment[] = imageFiles
            .slice(0, MAX_IMAGES_PER_REQUEST - imagesInHistory)
            .map(f => ({
              id: f.id,
              name: f.originalName,
              type: f.mimeType,
              size: f.size,
              url: f.url,
            }));
          
          const content = await buildMessageContent(msg.content, attachments);
          llmMessages.push({ role, content });
          imagesInHistory += attachments.length;
        } else if (msg.content?.trim()) {
          llmMessages.push({ role, content: msg.content });
        }
      } else {
        if (msg.content?.trim()) {
          llmMessages.push({ role, content: msg.content });
        }
      }
    }
  } catch (error) {
    console.error('[Alfred] Error loading history:', error);
  }

  return llmMessages;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const client = getLLMClient();
    
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    const body = await request.json();
    const { 
      message = '', 
      files: incomingFiles = [], 
      conversationId: existingConvId,
      // ═══════════════════════════════════════════════════════════════════════
      // NEW: Artifact modification params from preview modal
      // ═══════════════════════════════════════════════════════════════════════
      artifactCode,
      artifactTitle,
    } = body;

    const hasMessage = message?.trim()?.length > 0;
    const hasFiles = incomingFiles?.length > 0;
    const isArtifactEdit = !!artifactCode;

    if (!hasMessage && !hasFiles) {
      return new Response(
        JSON.stringify({ error: 'Message or files required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Usage Limit Check (only for authenticated users)
    // ─────────────────────────────────────────────────────────────────────────
    if (userId) {
      const usageCheck = await checkUsageLimits(userId);
      
      if (usageCheck.exceeded) {
        console.log(`[Alfred] ⚠️ Usage limit exceeded for user ${userId} (${usageCheck.tier})`);
        return new Response(
          JSON.stringify({ 
            error: 'limit_exceeded',
            message: usageCheck.message,
            tier: usageCheck.tier,
            upgradeUrl: '/pricing',
          }), 
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log artifact edit mode
    if (isArtifactEdit) {
      console.log(`[Alfred] 🎨 ARTIFACT EDIT MODE: ${artifactTitle || 'Component'}`);
      console.log(`[Alfred] 📝 Modification request: "${message?.slice(0, 50)}..."`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Context Detection & System Prompt
    // ─────────────────────────────────────────────────────────────────────────
    const detectedFacet = isArtifactEdit ? 'code' : detectFacet(message || 'analyze');
    const skillLevel = coreInferSkillLevel([message || 'analyze image']);
    
    const baseSystemPrompt = buildSystemPrompt({ skillLevel });
    let systemPrompt = CODE_FORMATTING_RULES + baseSystemPrompt;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARTIFACT MODIFICATION: Inject current code into system prompt
    // ═══════════════════════════════════════════════════════════════════════════
    if (isArtifactEdit) {
      systemPrompt += '\n\n' + buildArtifactModificationPrompt(
        artifactCode, 
        artifactTitle || 'Component'
      );
    }

    // Load history files if continuing a conversation
    let historyFiles: FileAttachment[] = [];
    if (existingConvId && !isArtifactEdit) {
      try {
        const dbHistoryFiles = await db
          .select()
          .from(files)
          .where(eq(files.conversationId, existingConvId));
        
        historyFiles = dbHistoryFiles
          .filter(f => !incomingFiles.some((inc: FileAttachment) => inc.id === f.id))
          .map(f => ({
            id: f.id,
            name: f.originalName,
            type: f.mimeType,
            size: f.size,
            url: f.url,
          }));
        
        if (historyFiles.length > 0) {
          console.log(`[Alfred] Found ${historyFiles.length} files from conversation history`);
        }
      } catch (e) {
        console.error('[Alfred] Error loading history files:', e);
      }
    }
    
    const allFiles = [...incomingFiles, ...historyFiles];
    
    // Add file context to prompt (skip for artifact edits to keep prompt focused)
    if ((hasFiles || historyFiles.length > 0) && !isArtifactEdit) {
      const fileList = allFiles.map((f: FileAttachment) => `- ${f.name} (ID: ${f.id})`).join('\n');
      
      const imageFiles = allFiles.filter((f: FileAttachment) => {
        const mime = normalizeMimeType(f.type, f.name);
        return isImage(mime);
      });
      
      const videoFiles = allFiles.filter((f: FileAttachment) => {
        const mime = normalizeMimeType(f.type, f.name);
        return isVideo(mime);
      });
      
      let mediaContext = '';
      
      if (imageFiles.length > 0) {
        const imgList = imageFiles.map((f: FileAttachment) => 
          `  - ${f.name}: ${f.url?.startsWith('http') ? f.url : '/api/files/serve?id=' + f.id}`
        ).join('\n');
        
        mediaContext += `

IMAGE FILES (you can SEE these):
${imgList}

To DISPLAY images in React preview:
<img src="${imageFiles[0]?.url?.startsWith('http') ? imageFiles[0].url : '/api/files/serve?id=' + imageFiles[0]?.id}" alt="${imageFiles[0]?.name}" className="w-full h-auto object-cover" />
`;
      }
      
      if (videoFiles.length > 0) {
        const vidList = videoFiles.map((f: FileAttachment) => 
          `  - ${f.name}: ${f.url?.startsWith('http') ? f.url : '/api/files/serve?id=' + f.id}`
        ).join('\n');
        
        mediaContext += `

VIDEO FILES (use URL in code, you cannot preview these):
${vidList}

To DISPLAY videos in React preview (hero video, background, etc.):
<video 
  src="${videoFiles[0]?.url?.startsWith('http') ? videoFiles[0].url : '/api/files/serve?id=' + videoFiles[0]?.id}" 
  autoPlay 
  muted 
  loop 
  playsInline
  className="absolute inset-0 w-full h-full object-cover"
/>

For hero sections with video backgrounds:
\`\`\`jsx
<div className="relative h-screen overflow-hidden">
  <video 
    src="${videoFiles[0]?.url?.startsWith('http') ? videoFiles[0].url : '/api/files/serve?id=' + videoFiles[0]?.id}"
    autoPlay muted loop playsInline
    className="absolute inset-0 w-full h-full object-cover"
  />
  <div className="absolute inset-0 bg-black/50" />
  <div className="relative z-10">
    {/* Content here */}
  </div>
</div>
\`\`\`
`;
      }

      if (mediaContext) {
        systemPrompt += `\n\nThe user has attached files:\n${fileList}${mediaContext}

RULES:
1. Use the EXACT URLs listed above for all media
2. NEVER use external URLs (unsplash, placeholder, etc.)
3. NEVER say you cannot access files
4. For videos: use <video> tag with the serve URL
5. For images: use <img> tag with the serve URL`;
      } else {
        systemPrompt += `\n\nThe user has attached files:\n${fileList}\n\nAnalyze and work with these files.`;
      }
    }

    console.log(`[Alfred] Facet: ${detectedFacet} | Skill: ${skillLevel} | Files: ${incomingFiles.length} | Artifact: ${isArtifactEdit} | User: ${userId || 'anon'}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Database: Create/Get Conversation (skip for artifact edits from preview)
    // ─────────────────────────────────────────────────────────────────────────
    let convId = existingConvId;

    // For artifact edits from preview modal, we don't create new conversations
    if (userId && !convId && !isArtifactEdit) {
      try {
        const title = message?.slice(0, 50) || (hasFiles ? `File: ${incomingFiles[0].name}` : 'New chat');
        const [newConv] = await db
          .insert(conversations)
          .values({ userId, title })
          .returning();
        
        if (newConv) {
          convId = newConv.id;
          console.log(`[Alfred] ✅ Created conversation: ${convId}`);
        }
      } catch (dbError) {
        console.error('[Alfred] ❌ DB error creating conversation:', dbError);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Save User Message & Link Files (skip for artifact edits)
    // ─────────────────────────────────────────────────────────────────────────
    let userMessageId: string | undefined;

    if (userId && convId && !isArtifactEdit) {
      try {
        const [savedMessage] = await db.insert(messages).values({
          conversationId: convId,
          role: 'user',
          content: message || '[File attachment]',
          mode: detectedFacet === "code" ? "build" : detectedFacet as any,
        }).returning();

        userMessageId = savedMessage?.id;
        console.log(`[Alfred] ✅ Saved user message: ${userMessageId}`);

        if (userMessageId && incomingFiles.length > 0) {
          for (const file of incomingFiles) {
            if (file.id) {
              await db.update(files)
                .set({ messageId: userMessageId, conversationId: convId })
                .where(eq(files.id, file.id));
            }
          }
          console.log(`[Alfred] ✅ Linked ${incomingFiles.length} file(s) to message`);
        }
      } catch (dbError) {
        console.error('[Alfred] ❌ DB error saving message:', dbError);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD LLM MESSAGES
    // ─────────────────────────────────────────────────────────────────────────
    let llmMessages: LLMMessage[] = [];

    // For artifact edits, don't load conversation history (keep it focused)
    if (convId && existingConvId && !isArtifactEdit) {
      console.log(`[Alfred] Loading history for conversation: ${convId}`);
      llmMessages = await loadConversationHistory(convId);
      console.log(`[Alfred] Loaded ${llmMessages.length} messages from history`);
    }

    // Build current message
    if (isArtifactEdit) {
      // For artifact edits, just send the modification request
      llmMessages.push({ role: 'user', content: message });
    } else {
      // Normal flow with potential images
      const imageOnlyFiles = incomingFiles.filter((f: FileAttachment) => {
        const mime = normalizeMimeType(f.type, f.name);
        return isImage(mime);
      });
      
      const currentContent = await buildMessageContent(message, imageOnlyFiles);
      llmMessages.push({ role: 'user', content: currentContent });
    }

    console.log(`[Alfred] Sending ${llmMessages.length} messages to Claude`);

    // ─────────────────────────────────────────────────────────────────────────
    // Stream Response with Usage Tracking
    // ─────────────────────────────────────────────────────────────────────────
    const encoder = new TextEncoder();
    let fullResponse = '';
    let usageData: UsageData | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamOptions: StreamOptions = {
            onToken: (token: string) => {
              fullResponse += token;
              const payload = JSON.stringify({ 
                content: token, 
                conversationId: convId,
                isArtifactEdit, // Let frontend know this is an artifact edit response
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            },
            onError: (error: Error) => {
              console.error('[Alfred] Stream error:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            },
            onUsage: (usage) => {
              usageData = { 
                inputTokens: usage.inputTokens, 
                outputTokens: usage.outputTokens 
              };
            },
          };

          await client.stream(
            { system: systemPrompt, messages: llmMessages as any, maxTokens: 32768 },
            streamOptions
          );

          // Save response to DB (skip for artifact edits from preview modal)
          if (userId && convId && fullResponse && !isArtifactEdit) {
            try {
              await db.insert(messages).values({
                conversationId: convId,
                role: 'alfred',
                content: fullResponse,
                mode: detectedFacet === "code" ? "build" : detectedFacet as any,
              });
              
              await db.update(conversations)
                .set({ updatedAt: new Date(), messageCount: llmMessages.length + 1 })
                .where(eq(conversations.id, convId));
              
              console.log(`[Alfred] ✅ Saved assistant response`);
            } catch (dbError) {
              console.error('[Alfred] ❌ Failed to save response:', dbError);
            }
          }

          // Track usage for billing (always track, even for artifact edits)
          if (userId && usageData) {
            await trackUsage(userId, usageData);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            conversationId: convId, 
            done: true, 
            duration: Date.now() - startTime,
            isArtifactEdit,
            usage: usageData, // Include usage in response for frontend
          })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
          console.log(`[Alfred] ✅ Completed in ${Date.now() - startTime}ms ${isArtifactEdit ? '(artifact edit)' : ''}`);
          
        } catch (error) {
          console.error('[Alfred] Stream failed:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Alfred-Facet': detectedFacet,
        'X-Alfred-Skill': skillLevel,
        'X-Alfred-Conversation': convId || '',
        'X-Alfred-Artifact-Edit': isArtifactEdit ? 'true' : 'false',
      },
    });
    
  } catch (error) {
    console.error('[Alfred] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}