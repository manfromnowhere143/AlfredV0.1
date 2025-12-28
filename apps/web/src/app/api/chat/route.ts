// ═══════════════════════════════════════════════════════════════════════════════
// CHAT API ROUTE - /api/chat
// Production-grade implementation with Claude Vision API support
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { detectFacet, buildSystemPrompt, inferSkillLevel as coreInferSkillLevel } from '@alfred/core';
import { createLLMClient, type StreamOptions } from '@alfred/llm';
import { db, conversations, messages, eq } from '@alfred/database';

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

EVERY piece of code you write MUST be wrapped in markdown code blocks.
This is not optional. The UI parser REQUIRES this exact format:

\`\`\`jsx
// your code here
export default function ComponentName() {
  return <div>Content</div>;
}
\`\`\`

WRONG (BREAKS UI - code will not render):
<script>code here</script>
<div>raw html</div>
function Component() { return <div/> }

RIGHT (WORKS - code renders with PREVIEW button):
\`\`\`jsx
function Component() { return <div/> }
\`\`\`

Rules:
1. Start with \`\`\`jsx (or \`\`\`html, \`\`\`typescript, \`\`\`css, etc.)
2. Newline after the opening backticks
3. Your complete, runnable code
4. Newline then \`\`\` to close
5. NEVER output raw HTML, JSX, or JavaScript without code blocks

██████████████████████████████████████████████████████████████████████████████

`;

// ═══════════════════════════════════════════════════════════════════════════════
// LLM CLIENT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let llmClient: ReturnType<typeof createLLMClient> | null = null;

function getLLMClient() {
  if (!llmClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
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
// FILE PROCESSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a MIME type is supported by Claude Vision API
 */
function isSupported(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType) || SUPPORTED_DOCUMENT_TYPES.includes(mimeType);
}

/**
 * Normalize MIME type to Claude-accepted format
 */
function normalizeMimeType(type: string, filename: string): string {
  // If type is already valid, use it
  if (SUPPORTED_IMAGE_TYPES.includes(type) || SUPPORTED_DOCUMENT_TYPES.includes(type)) {
    return type;
  }
  
  // Fallback: infer from filename extension
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
  };
  
  return mimeMap[ext || ''] || 'image/jpeg';
}

/**
 * Fetch file from URL and convert to base64
 */
async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    // Handle relative URLs
    const fullUrl = url.startsWith('/') 
      ? `${process.env.NEXTAUTH_URL || 'http://localhost:3005'}${url}`
      : url;
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.error(`[Chat] Failed to fetch file: ${response.status}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error('[Chat] Error fetching file:', error);
    return null;
  }
}

/**
 * Build Claude Vision API content array from text and files
 */
async function buildMessageContent(
  text: string,
  files?: FileAttachment[]
): Promise<string | ContentBlock[]> {
  // No files - return plain text
  if (!files || files.length === 0) {
    return text || 'Hello';
  }

  const content: ContentBlock[] = [];
  let processedFiles = 0;

  // Process each file
  for (const file of files) {
    const mimeType = normalizeMimeType(file.type, file.name);
    
    // Skip unsupported types
    if (!isSupported(mimeType)) {
      console.log(`[Chat] Skipping unsupported file: ${file.name} (${file.type})`);
      continue;
    }

    // Get base64 data
    let base64Data: string | null = null;
    
    if (file.base64) {
      // Strip data URL prefix if present
      base64Data = file.base64.includes(',') 
        ? file.base64.split(',')[1] 
        : file.base64;
    } else if (file.url) {
      base64Data = await fetchAsBase64(file.url);
    }

    if (!base64Data) {
      console.log(`[Chat] No data available for file: ${file.name}`);
      continue;
    }

    // Add image block
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          mediaType: mimeType as ImageBlock['source']['media_type'],
          data: base64Data,
        },
      });
      processedFiles++;
      console.log(`[Chat] ✅ Added image: ${file.name} (${mimeType})`);
    }
    
    // Add PDF document block
    else if (mimeType === 'application/pdf') {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          mediaType: 'application/pdf',
          data: base64Data,
        },
      });
      processedFiles++;
      console.log(`[Chat] ✅ Added PDF: ${file.name}`);
    }
  }

  // Add text content
  const textContent = text?.trim() || (processedFiles > 0 
    ? 'Please analyze the attached file(s) and describe what you see.'
    : 'Hello');
  
  content.push({ type: 'text', text: textContent });

  // If only text block, return as string
  if (content.length === 1 && content[0].type === 'text') {
    return (content[0] as TextBlock).text;
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const client = getLLMClient();
    
    // ─────────────────────────────────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    // ─────────────────────────────────────────────────────────────────────────
    // Parse & Validate Request
    // ─────────────────────────────────────────────────────────────────────────
    const body = await request.json();
    const { 
      message = '', 
      files = [], 
      history = [], 
      conversationId: existingConvId,
    } = body;

    const hasMessage = message?.trim()?.length > 0;
    const hasFiles = files?.length > 0;

    if (!hasMessage && !hasFiles) {
      return new Response(
        JSON.stringify({ error: 'Message or files required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Context Detection
    // ─────────────────────────────────────────────────────────────────────────
    const detectedFacet = detectFacet(message || 'analyze');
    
    const userMessageHistory = history
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content);
    userMessageHistory.push(message || 'analyze image');
    
    const skillLevel = coreInferSkillLevel(userMessageHistory);
    
    // Build system prompt
    const baseSystemPrompt = buildSystemPrompt({ skillLevel });
    let systemPrompt = CODE_FORMATTING_RULES + baseSystemPrompt;
    
    // Add file context hint
    if (hasFiles) {
      const fileList = files.map((f: FileAttachment) => `- ${f.name}`).join('\n');
      systemPrompt += `\n\nThe user has attached the following files:\n${fileList}\n\nAnalyze and respond based on these files.`;
    }

    console.log(`[Alfred] Facet: ${detectedFacet} | Skill: ${skillLevel} | Files: ${files.length} | User: ${userId || 'anon'}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Database Operations
    // ─────────────────────────────────────────────────────────────────────────
    let convId = existingConvId;

    if (userId) {
      try {
        // Create new conversation if needed
        if (!convId) {
          const title = message?.slice(0, 50) || (hasFiles ? `File: ${files[0].name}` : 'New chat');
          const [newConv] = await db
            .insert(conversations)
            .values({ userId, title, mode: detectedFacet })
            .returning();
          
          if (newConv) {
            convId = newConv.id;
            console.log(`[Alfred] ✅ Created conversation: ${convId}`);
          }
        }

        // Save user message
        if (convId) {
          await db.insert(messages).values({
            conversationId: convId,
            role: 'user',
            content: message || '[File attachment]',
            mode: detectedFacet,
          });
          console.log(`[Alfred] ✅ Saved user message`);
        }
      } catch (dbError) {
        console.error('[Alfred] ❌ Database error:', dbError);
        // Continue without DB - don't fail the request
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build LLM Messages
    // ─────────────────────────────────────────────────────────────────────────
    const llmMessages: LLMMessage[] = [];

    // Add conversation history
    for (const msg of history) {
      llmMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Build current message with file attachments
    const currentContent = await buildMessageContent(message, files);
    llmMessages.push({
      role: 'user',
      content: currentContent,
    });

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
              const payload = JSON.stringify({ 
                content: token, 
                conversationId: convId 
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            },
            onError: (error: Error) => {
              console.error('[Alfred] Stream error:', error);
              const payload = JSON.stringify({ error: error.message });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            },
          };

          await client.stream(
            { 
              system: systemPrompt, 
              messages: llmMessages as any, 
              maxTokens: 32768 
            },
            streamOptions
          );

          // Save assistant response to database
          if (userId && convId && fullResponse) {
            try {
              await db.insert(messages).values({
                conversationId: convId,
                role: 'alfred',
                content: fullResponse,
                mode: detectedFacet,
              });
              
              await db
                .update(conversations)
                .set({ 
                  updatedAt: new Date(), 
                  messageCount: history.length + 2 
                })
                .where(eq(conversations.id, convId));
              
              console.log(`[Alfred] ✅ Saved assistant response`);
            } catch (dbError) {
              console.error('[Alfred] ❌ Failed to save response:', dbError);
            }
          }

          // Send completion signal
          const donePayload = JSON.stringify({ 
            conversationId: convId, 
            done: true,
            duration: Date.now() - startTime,
          });
          controller.enqueue(encoder.encode(`data: ${donePayload}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
          console.log(`[Alfred] ✅ Completed in ${Date.now() - startTime}ms`);
          
        } catch (error) {
          console.error('[Alfred] Stream failed:', error);
          const payload = JSON.stringify({ error: 'Stream failed' });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
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
        'X-Alfred-Files': String(files.length),
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