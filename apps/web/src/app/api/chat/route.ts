// ═══════════════════════════════════════════════════════════════════════════════
// CHAT API ROUTE - /api/chat
// Production-grade with persistent file context across conversation
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectFacet, buildSystemPrompt, inferSkillLevel as coreInferSkillLevel } from '@alfred/core';
import { createLLMClient, type StreamOptions } from '@alfred/llm';
import { db, conversations, messages, files, eq, asc } from '@alfred/database';
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

function isSupported(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType) || SUPPORTED_DOCUMENT_TYPES.includes(mimeType);
}

function normalizeMimeType(type: string, filename: string): string {
  if (SUPPORTED_IMAGE_TYPES.includes(type) || SUPPORTED_DOCUMENT_TYPES.includes(type)) {
    return type;
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
  };
  return mimeMap[ext || ''] || 'image/jpeg';
}

async function readFileFromDisk(url: string): Promise<string | null> {
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
  fileAttachments?: FileAttachment[]
): Promise<string | ContentBlock[]> {
  if (!fileAttachments || fileAttachments.length === 0) {
    return text || 'Hello';
  }

  const content: ContentBlock[] = [];
  let processedFiles = 0;

  for (const file of fileAttachments) {
    const mimeType = normalizeMimeType(file.type, file.name);
    
    if (!isSupported(mimeType)) {
      console.log(`[Chat] Skipping unsupported: ${file.name} (${file.type})`);
      continue;
    }

    let base64Data: string | null = null;
    
    if (file.base64) {
      base64Data = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
    } else if (file.url) {
      base64Data = await readFileFromDisk(file.url);
    }

    if (!base64Data) {
      console.log(`[Chat] No data for file: ${file.name}`);
      continue;
    }

    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
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
    } else if (mimeType === 'application/pdf') {
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
// HISTORY LOADING - Using direct db.select() calls
// ═══════════════════════════════════════════════════════════════════════════════

async function loadConversationHistory(conversationId: string): Promise<LLMMessage[]> {
  const llmMessages: LLMMessage[] = [];
  
  try {
    const dbMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    for (const msg of dbMessages) {
      const role: 'user' | 'assistant' = msg.role === 'user' ? 'user' : 'assistant';
      
      if (role === 'user') {
        const msgFiles = await db
          .select()
          .from(files)
          .where(eq(files.messageId, msg.id));

        if (msgFiles.length > 0) {
          const attachments: FileAttachment[] = msgFiles.map(f => ({
            id: f.id,
            name: f.originalName,
            type: f.mimeType,
            size: f.size,
            url: f.url,
          }));
          
          const content = await buildMessageContent(msg.content, attachments);
          llmMessages.push({ role, content });
          console.log(`[Alfred] ✅ Reconstructed message with ${msgFiles.length} file(s)`);
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
      
      const imageFiles = incomingFiles.filter((f: FileAttachment) => f.type?.startsWith('image/'));
      
      let imageContext = '';
      if (imageFiles.length > 0) {
        const imgList = imageFiles.map((f: FileAttachment) => 
          `  - ${f.name}: /api/files/serve?id=${f.id}`
        ).join('\n');
        
        imageContext = `

IMAGE EMBEDDING INSTRUCTIONS:
You can SEE these images via Vision API. To DISPLAY them in React/HTML preview:

${imgList}

When creating React code that shows this image, use EXACTLY:
<img src="/api/files/serve?id=${imageFiles[0]?.id}" alt="${imageFiles[0]?.name}" className="w-full h-auto object-cover" />

RULES:
1. You CAN see and describe these images - use your vision
2. To DISPLAY in React: use /api/files/serve?id={FILE_ID}
3. NEVER say you cannot access files - you have full visual access
4. NEVER use external URLs like unsplash or placeholder.com
5. Use the serve endpoint above for any image display`;
      }

      systemPrompt += `\n\nThe user has attached files:\n${fileList}${imageContext}\n\nAnalyze and work with these files.`;
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
    // BUILD LLM MESSAGES - Load history from DB with file reconstruction
    // ─────────────────────────────────────────────────────────────────────────
    let llmMessages: LLMMessage[] = [];

    if (convId && existingConvId) {
      console.log(`[Alfred] Loading history for conversation: ${convId}`);
      llmMessages = await loadConversationHistory(convId);
      console.log(`[Alfred] Loaded ${llmMessages.length} messages from history`);
    }

    const currentContent = await buildMessageContent(message, incomingFiles);
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