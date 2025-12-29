// ═══════════════════════════════════════════════════════════════════════════════
// CHAT API ROUTE - /api/chat
// State-of-the-art: ALWAYS uses optimized images for Vision
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectFacet, buildSystemPrompt, inferSkillLevel as coreInferSkillLevel } from '@alfred/core';
import { createLLMClient, type StreamOptions } from '@alfred/llm';
import { db, conversations, messages, files, eq, asc, desc } from '@alfred/database';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  optimizedUrl?: string;
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

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];

// Claude Vision limit is 5MB, we use 4MB to be safe with base64 overhead
const MAX_IMAGE_SIZE_FOR_VISION = 4 * 1024 * 1024;
const MAX_IMAGES_PER_REQUEST = 5;
const MAX_HISTORY_MESSAGES = 20;

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

██████████████████████████████████████████████████████████████████████████████
`;

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
    'heic': 'image/jpeg', 'heif': 'image/jpeg',
  };
  return mimeMap[ext || ''] || type;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED IMAGE READER - Top-tier approach
// Always tries to find optimized version first, never trusts frontend base64
// ═══════════════════════════════════════════════════════════════════════════════

async function getOptimizedImageForVision(file: FileAttachment): Promise<{ base64: string; size: number } | null> {
  try {
    if (!file.url) return null;
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Try to find optimized version on disk
    // Upload saves: {timestamp}-{id}-optimized-{name}.jpg
    // ─────────────────────────────────────────────────────────────────────────
    
    const urlDir = path.dirname(file.url);
    const urlBase = path.basename(file.url);
    
    // Pattern: 1767000822806-qchffs-IMG_5563.png → 1767000822806-qchffs-optimized-IMG_5563.jpg
    const match = urlBase.match(/^(\d+-\w+-)(.+)$/);
    if (match) {
      const nameWithoutExt = match[2].replace(/\.[^.]+$/, '');
      const optimizedName = `${match[1]}optimized-${nameWithoutExt}.jpg`;
      const optimizedPath = path.join(process.cwd(), 'public', urlDir, optimizedName);
      
      if (existsSync(optimizedPath)) {
        const buffer = await readFile(optimizedPath);
        console.log(`[Chat] ✅ Using OPTIMIZED (${(buffer.length/1024/1024).toFixed(2)}MB): ${file.name}`);
        return { base64: buffer.toString('base64'), size: buffer.length };
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Fallback to original if it's small enough
    // ─────────────────────────────────────────────────────────────────────────
    
    const originalPath = path.join(process.cwd(), 'public', file.url);
    if (existsSync(originalPath)) {
      const buffer = await readFile(originalPath);
      
      // Check if small enough for Vision (accounting for base64 overhead)
      const base64Size = Math.ceil(buffer.length * 1.37); // base64 adds ~37%
      if (base64Size <= MAX_IMAGE_SIZE_FOR_VISION) {
        console.log(`[Chat] Using original (${(buffer.length/1024/1024).toFixed(2)}MB): ${file.name}`);
        return { base64: buffer.toString('base64'), size: buffer.length };
      }
      
      console.log(`[Chat] ⏭️ Original too large (${(buffer.length/1024/1024).toFixed(2)}MB → ${(base64Size/1024/1024).toFixed(2)}MB base64): ${file.name}`);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: No usable version found - Claude won't see it, but URL still works
    // ─────────────────────────────────────────────────────────────────────────
    
    return null;
    
  } catch (error) {
    console.error(`[Chat] Error reading image ${file.name}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD MESSAGE CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

async function buildMessageContent(
  text: string,
  fileAttachments?: FileAttachment[],
): Promise<string | ContentBlock[]> {
  if (!fileAttachments || fileAttachments.length === 0) {
    return text || 'Hello';
  }

  const content: ContentBlock[] = [];
  let processedImages = 0;
  const skippedForVision: string[] = [];

  for (const file of fileAttachments) {
    const mimeType = normalizeMimeType(file.type, file.name);
    
    // Skip videos - not supported by Vision
    if (isVideo(mimeType)) {
      console.log(`[Chat] ⏭️ Skipping video for Vision: ${file.name}`);
      continue;
    }

    // Skip if we've hit the image limit
    if (processedImages >= MAX_IMAGES_PER_REQUEST) {
      console.log(`[Chat] ⏭️ Max images reached, skipping Vision: ${file.name}`);
      skippedForVision.push(file.name);
      continue;
    }

    if (!isImage(mimeType) && !isPDF(mimeType)) {
      console.log(`[Chat] ⏭️ Unsupported type: ${file.name} (${mimeType})`);
      continue;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ALWAYS read from disk - never trust frontend base64
    // This ensures we use the optimized version
    // ─────────────────────────────────────────────────────────────────────────
    
    if (isImage(mimeType)) {
      const result = await getOptimizedImageForVision(file);
      
      if (result) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            mediaType: 'image/jpeg', // Optimized images are JPEG
            data: result.base64,
          },
        });
        processedImages++;
      } else {
        // Image too large - Claude won't see it but can still use URL
        skippedForVision.push(file.name);
      }
    } else if (isPDF(mimeType) && file.url) {
      // PDFs - read from disk
      try {
        const pdfPath = path.join(process.cwd(), 'public', file.url);
        if (existsSync(pdfPath)) {
          const buffer = await readFile(pdfPath);
          if (buffer.length <= MAX_IMAGE_SIZE_FOR_VISION) {
            content.push({
              type: 'document',
              source: { type: 'base64', mediaType: 'application/pdf', data: buffer.toString('base64') },
            });
            processedImages++;
            console.log(`[Chat] ✅ Added PDF: ${file.name}`);
          }
        }
      } catch (e) {
        console.error(`[Chat] PDF read error: ${file.name}`, e);
      }
    }
  }

  // Build text content
  let textContent = text?.trim() || '';
  
  if (!textContent && processedImages > 0) {
    textContent = 'Please analyze the attached file(s) and describe what you see.';
  }
  
  if (skippedForVision.length > 0) {
    textContent += `\n\n(Note: ${skippedForVision.join(', ')} - large file(s), use URL to display)`;
  }
  
  if (!textContent) textContent = 'Hello';
  
  content.push({ type: 'text', text: textContent });

  // If only text, return as string
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
          console.log(`[Alfred] ✅ Reconstructed message with ${attachments.length} image(s)`);
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
    } = body;

    const hasMessage = message?.trim()?.length > 0;
    const hasFiles = incomingFiles?.length > 0;

    if (!hasMessage && !hasFiles) {
      return new Response(
        JSON.stringify({ error: 'Message or files required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Context Detection & System Prompt
    // ─────────────────────────────────────────────────────────────────────────
    const detectedFacet = detectFacet(message || 'analyze');
    const skillLevel = coreInferSkillLevel([message || 'analyze image']);
    
    const baseSystemPrompt = buildSystemPrompt({ skillLevel });
    let systemPrompt = CODE_FORMATTING_RULES + baseSystemPrompt;
    
    if (hasFiles) {
      const fileList = incomingFiles.map((f: FileAttachment) => `- ${f.name} (ID: ${f.id})`).join('\n');
      
      const imageFiles = incomingFiles.filter((f: FileAttachment) => {
        const mime = normalizeMimeType(f.type, f.name);
        return isImage(mime);
      });
      
      const videoFiles = incomingFiles.filter((f: FileAttachment) => {
        const mime = normalizeMimeType(f.type, f.name);
        return isVideo(mime);
      });
      
      let mediaContext = '';
      
      if (imageFiles.length > 0) {
        const imgList = imageFiles.map((f: FileAttachment) => 
          `  - ${f.name}: /api/files/serve?id=${f.id}`
        ).join('\n');
        
        mediaContext += `

IMAGE FILES:
${imgList}

You can SEE these images via Vision API.
To DISPLAY in React/HTML preview, use the serve URLs above:
<img src="/api/files/serve?id=${imageFiles[0]?.id}" alt="${imageFiles[0]?.name}" className="w-full h-auto object-cover" />
`;
      }
      
      if (videoFiles.length > 0) {
        const vidList = videoFiles.map((f: FileAttachment) => 
          `  - ${f.name}: /api/files/serve?id=${f.id}`
        ).join('\n');
        
        mediaContext += `

VIDEO FILES (use URL in code, you cannot preview these):
${vidList}

To DISPLAY videos in React preview:
<video 
  src="/api/files/serve?id=${videoFiles[0]?.id}" 
  autoPlay muted loop playsInline
  className="absolute inset-0 w-full h-full object-cover"
/>
`;
      }

      if (mediaContext) {
        systemPrompt += `\n\nThe user has attached files:\n${fileList}${mediaContext}

RULES:
1. Use /api/files/serve?id={FILE_ID} for all media
2. NEVER use external URLs (unsplash, placeholder, etc.)
3. NEVER say you cannot access files
4. For videos: use <video> tag with the serve URL
5. For images: use <img> tag with the serve URL`;
      } else {
        systemPrompt += `\n\nThe user has attached files:\n${fileList}\n\nAnalyze and work with these files.`;
      }
    }

    console.log(`[Alfred] Facet: ${detectedFacet} | Skill: ${skillLevel} | Files: ${incomingFiles.length} | User: ${userId || 'anon'}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Database: Create/Get Conversation
    // ─────────────────────────────────────────────────────────────────────────
    let convId = existingConvId;

    if (userId && !convId) {
      try {
        const title = message?.slice(0, 50) || (hasFiles ? `File: ${incomingFiles[0].name}` : 'New chat');
        const [newConv] = await db
          .insert(conversations)
          .values({ userId, title, mode: detectedFacet })
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
    // Save User Message & Link Files
    // ─────────────────────────────────────────────────────────────────────────
    let userMessageId: string | undefined;

    if (userId && convId) {
      try {
        const [savedMessage] = await db.insert(messages).values({
          conversationId: convId,
          role: 'user',
          content: message || '[File attachment]',
          mode: detectedFacet,
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

    if (convId && existingConvId) {
      console.log(`[Alfred] Loading history for conversation: ${convId}`);
      llmMessages = await loadConversationHistory(convId);
      console.log(`[Alfred] Loaded ${llmMessages.length} messages from history`);
    }

    // Build current message - only include images (not videos) for Vision
    const imageOnlyFiles = incomingFiles.filter((f: FileAttachment) => {
      const mime = normalizeMimeType(f.type, f.name);
      return isImage(mime);
    });
    
    const currentContent = await buildMessageContent(message, imageOnlyFiles);
    llmMessages.push({ role: 'user', content: currentContent });

    console.log(`[Alfred] Sending ${llmMessages.length} messages to Claude`);

    // ─────────────────────────────────────────────────────────────────────────
    // Stream Response
    // ─────────────────────────────────────────────────────────────────────────
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamOptions: StreamOptions = {
            onToken: (token: string) => {
              fullResponse += token;
              const payload = JSON.stringify({ content: token, conversationId: convId });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            },
            onError: (error: Error) => {
              console.error('[Alfred] Stream error:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            },
          };

          await client.stream(
            { system: systemPrompt, messages: llmMessages as any, maxTokens: 32768 },
            streamOptions
          );

          if (userId && convId && fullResponse) {
            try {
              await db.insert(messages).values({
                conversationId: convId,
                role: 'alfred',
                content: fullResponse,
                mode: detectedFacet,
              });
              
              await db.update(conversations)
                .set({ updatedAt: new Date(), messageCount: llmMessages.length + 1 })
                .where(eq(conversations.id, convId));
              
              console.log(`[Alfred] ✅ Saved assistant response`);
            } catch (dbError) {
              console.error('[Alfred] ❌ Failed to save response:', dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId, done: true, duration: Date.now() - startTime })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
          console.log(`[Alfred] ✅ Completed in ${Date.now() - startTime}ms`);
          
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