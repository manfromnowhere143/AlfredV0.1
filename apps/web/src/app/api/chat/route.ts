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
import { createLLMClient, type StreamOptions, checkCodeCompleteness } from '@alfred/llm';
import { db, conversations, messages, files, users, eq, asc, desc, sql } from '@alfred/database';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { extractCodeFromResponse, saveArtifact, loadLatestArtifact } from '@/lib/artifacts';
import {
  orchestrate,
  withLLMResilience,
  getCircuitBreakerStatus,
  serializeContext,
  deserializeContext,
  type OrchestratorMetadata,
} from '@/lib/chat-orchestrator';
import { generateRequestId, addBreadcrumb, captureError } from '@/lib/observability';

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
8. STRING ESCAPING: When adding multilingual text (Hebrew, Arabic, French, etc):
   - If a string contains apostrophes, use double quotes for that string
   - Example: description: "הקונסיירז' שלנו" NOT description: 'הקונסיירז' שלנו'
   - CRITICAL: Check all translated text for apostrophes to prevent syntax errors

██████████████████████████████████████████████████████████████████████████████
`;

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER MODE PROMPT - Multi-file project generation
// ═══════════════════════════════════════════════════════════════════════════════

const BUILDER_MODE_PROMPT = `
██████████████████████████████████████████████████████████████████████████████████
██  STOP! READ THIS FIRST - YOUR OUTPUT FORMAT IS CRITICAL                       ██
██████████████████████████████████████████████████████████████████████████████████

⛔ FORBIDDEN - NEVER USE THESE:
   - <boltArtifact> - WRONG
   - <boltAction> - WRONG
   - <artifact> - WRONG
   - \`\`\`jsx or any markdown code blocks - WRONG
   - Any XML or HTML-style tags for code - WRONG

✅ YOU MUST USE THIS FORMAT:
   - <<<PROJECT_START>>> ProjectName react
   - <<<FILE: /path/to/file.tsx>>>
   - <<<END_FILE>>>
   - <<<PROJECT_END>>>

If you use <boltArtifact> or any XML tags, the system will FAIL and show 0 files.
The ONLY format that works is the <<<MARKER>>> protocol below.

╔══════════════════════════════════════════════════════════════════════════════╗
║  ALFRED BUILDER MODE - Multi-File React Project Generation                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
STREAMING PROTOCOL - Follow EXACTLY
═══════════════════════════════════════════════════════════════════════════════

1. Start with project declaration:
   <<<PROJECT_START>>> ProjectName react
   Optional description on next line

2. Declare dependencies (one per line):
   <<<DEPENDENCY: react@^18.2.0>>>
   <<<DEPENDENCY: react-dom@^18.2.0>>>
   <<<DEPENDENCY: lucide-react@^0.300.0>>>

3. For each file, use this exact format:
   <<<FILE: /src/App.tsx tsx component entry>>>
   // File content here...
   <<<END_FILE>>>

   File markers explained:
   - /src/App.tsx = file path from project root
   - tsx = language (tsx, ts, css, json, html)
   - component = file type (component, page, style, config, script)
   - entry = marks this as entry point (only one file should have this)

4. End with:
   <<<PROJECT_END>>>

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE OUTPUT
═══════════════════════════════════════════════════════════════════════════════

<<<PROJECT_START>>> TodoApp react
A beautiful todo application with local storage

<<<DEPENDENCY: react@^18.2.0>>>
<<<DEPENDENCY: react-dom@^18.2.0>>>
<<<DEPENDENCY: lucide-react@^0.300.0>>>

<<<FILE: /src/main.tsx tsx component entry>>>
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
<<<END_FILE>>>

<<<FILE: /src/App.tsx tsx component>>>
import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
    setInput('');
  };

  return (
    <div className="app">
      <h1>Todo App</h1>
      <div className="input-group">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a todo..."
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button onClick={addTodo}><Plus size={20} /></button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <span onClick={() => setTodos(todos.map(t =>
              t.id === todo.id ? {...t, completed: !t.completed} : t
            ))}>
              {todo.completed && <Check size={16} />}
              {todo.text}
            </span>
            <button onClick={() => setTodos(todos.filter(t => t.id !== todo.id))}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
<<<END_FILE>>>

<<<FILE: /src/index.css css style>>>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.app {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
}

input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
}

button {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

ul {
  list-style: none;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

li.completed span {
  text-decoration: line-through;
  color: #999;
}
<<<END_FILE>>>

<<<PROJECT_END>>>

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULES - VIOLATION = SYSTEM FAILURE
═══════════════════════════════════════════════════════════════════════════════

1. START with <<<PROJECT_START>>> ProjectName react - NOTHING BEFORE THIS
2. NEVER use <boltArtifact>, <artifact>, <boltAction> - THESE WILL CAUSE 0 FILES
3. NEVER use \`\`\`jsx code blocks - raw code ONLY between <<<FILE:>>> and <<<END_FILE>>>
4. Each file: <<<FILE: /path>>> then code then <<<END_FILE>>>
5. End with <<<PROJECT_END>>>
6. ALWAYS include /src/main.tsx or /src/index.tsx as entry point
7. ALWAYS include /src/index.css for styling
8. Use modern React (hooks, functional components, TypeScript)

═══════════════════════════════════════════════════════════════════════════════
📋 README WITH MERMAID ARCHITECTURE DIAGRAM - REQUIRED FOR EVERY PROJECT!
═══════════════════════════════════════════════════════════════════════════════

ALWAYS generate a README.md file with a Mermaid architecture diagram.
This is MANDATORY for every project you generate.

The README must include:
1. Project title and description
2. A Mermaid flowchart showing the component architecture
3. Features list
4. Tech stack used
5. Getting started instructions

EXAMPLE README (include similar for every project):

<<<FILE: /README.md md docs>>>
# ProjectName

Beautiful description of what this project does.

## Architecture

\`\`\`mermaid
flowchart TD
    subgraph UI["🎨 User Interface"]
        App[App.tsx]
        Header[Header]
        Main[Main Content]
        Footer[Footer]
    end

    subgraph State["📦 State Management"]
        Store[Zustand Store]
        Hooks[Custom Hooks]
    end

    subgraph Components["🧩 Components"]
        Card[Card]
        Button[Button]
        Modal[Modal]
    end

    App --> Header
    App --> Main
    App --> Footer
    Main --> Components
    Components --> Store
    Store --> Hooks

    style App fill:#8b5cf6,color:#fff
    style Store fill:#6366f1,color:#fff
    style UI fill:#1e1e2e,stroke:#8b5cf6
    style State fill:#1e1e2e,stroke:#6366f1
    style Components fill:#1e1e2e,stroke:#22c55e
\`\`\`

## Features

- ✨ Feature 1
- 🎯 Feature 2
- 🚀 Feature 3

## Tech Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons

## Getting Started

1. Open in Alfred Builder
2. Run preview
3. Customize to your needs

---
*Built with Alfred Pro Builder*
<<<END_FILE>>>

IMPORTANT: The Mermaid diagram MUST be wrapped in \`\`\`mermaid code blocks
inside the README.md file. This is the ONLY place where markdown code
blocks are allowed (inside the README content itself).

⚠️ WRONG FORMAT (will fail):
<boltArtifact id="x" title="y">
<boltAction type="file" filePath="z">
code here
</boltAction>
</boltArtifact>

✅ CORRECT FORMAT (will work):
<<<PROJECT_START>>> MyApp react
<<<DEPENDENCY: react@^18.2.0>>>
<<<FILE: /src/main.tsx tsx component entry>>>
import React from 'react';
// code here
<<<END_FILE>>>
<<<PROJECT_END>>>

YOUR RESPONSE MUST START WITH: <<<PROJECT_START>>>
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
      INSERT INTO usage (id, user_id, date, output_tokens, input_tokens, request_count, artifact_count)
      VALUES (gen_random_uuid(), ${userId}, ${today}, ${usage.outputTokens}, ${usage.inputTokens}, 1, 0)
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY: URL whitelist for remote file fetching (SSRF protection)
// ═══════════════════════════════════════════════════════════════════════════════
const ALLOWED_REMOTE_HOSTS = [
  'blob.vercel-storage.com',
  'public.blob.vercel-storage.com',
  // Add other trusted hosts here
];

const BLOCKED_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]/,
  /^\[fc/i,
  /^\[fd/i,
];

function isUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block internal IPs
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        console.warn(`[Chat] SECURITY: Blocked internal URL: ${hostname}`);
        return false;
      }
    }

    // Only allow whitelisted hosts
    if (!ALLOWED_REMOTE_HOSTS.includes(hostname)) {
      console.warn(`[Chat] SECURITY: Blocked non-whitelisted host: ${hostname}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function readFileFromUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith('http')) {
      // SECURITY: Validate URL before fetching
      if (!isUrlAllowed(url)) {
        console.error('[Chat] SECURITY: Remote URL fetch blocked');
        return null;
      }

      console.log('[Chat] Fetching remote file:', url);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          redirect: 'error', // Don't follow redirects (SSRF protection)
        });
        clearTimeout(timeout);

        if (!response.ok) return null;

        // Limit response size to 10MB
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
          console.error('[Chat] SECURITY: Remote file too large');
          return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer.toString('base64');
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (e) { console.error('[Chat] Remote fetch error:', e); }

  try {
    // SECURITY: Normalize path and verify it's within public directory
    const publicDir = path.resolve(process.cwd(), 'public');
    const filepath = path.resolve(publicDir, url.replace(/^\/+/, ''));

    // Verify path is within public directory (path traversal protection)
    if (!filepath.startsWith(publicDir)) {
      console.error('[Chat] SECURITY: Path traversal attempt blocked:', url);
      return null;
    }

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
  const requestId = generateRequestId();

  // Breadcrumb for request tracing
  addBreadcrumb('Chat request received', 'http', { requestId });

  try {
    const client = getLLMClient();

    // Check circuit breaker status before proceeding
    const cbStatus = getCircuitBreakerStatus();
    if (!cbStatus.healthy) {
      console.warn(`[Alfred] Circuit breaker is ${cbStatus.state}, request may fail`);
      addBreadcrumb('Circuit breaker unhealthy', 'http', { state: cbStatus.state, failures: cbStatus.failures });
    }
    
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
      // ═══════════════════════════════════════════════════════════════════════
      // Builder mode for multi-file project generation
      // ═══════════════════════════════════════════════════════════════════════
      mode,
    } = body;

    const hasMessage = message?.trim()?.length > 0;
    const hasFiles = incomingFiles?.length > 0;
    const isArtifactEdit = !!artifactCode;
    const isBuilderMode = mode === 'builder';

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
    // ORCHESTRATOR: State Machine Integration
    // ─────────────────────────────────────────────────────────────────────────
    let orchestratorMetadata: OrchestratorMetadata | null = null;
    let orchestratorPromptAdditions = '';

    if (!isArtifactEdit) {
      // Run orchestration for non-artifact-edit requests
      const orchestratorResult = orchestrate({
        message: message || '',
        conversationId: existingConvId || '',
        userId: userId || 'anonymous',
        mode: undefined, // Let orchestrator infer from message
        existingContext: undefined, // TODO: Load from conversation record
      });

      orchestratorMetadata = orchestratorResult.metadata;
      orchestratorPromptAdditions = orchestratorResult.systemPromptAdditions;

      console.log(`[Alfred] 🧠 Orchestrator: ${orchestratorMetadata.stateTransition.from} → ${orchestratorMetadata.stateTransition.to}`);
      console.log(`[Alfred] 📊 Task: ${orchestratorMetadata.taskAnalysis.complexity} | Confidence: ${(orchestratorMetadata.taskAnalysis.confidence * 100).toFixed(0)}%`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Context Detection & System Prompt
    // ─────────────────────────────────────────────────────────────────────────
    const detectedFacet = isArtifactEdit ? 'code' : detectFacet(message || 'analyze');
    const skillLevel = coreInferSkillLevel([message || 'analyze image']);

    const baseSystemPrompt = buildSystemPrompt({ skillLevel });
    let systemPrompt = CODE_FORMATTING_RULES + baseSystemPrompt;

    // Add orchestrator state to system prompt
    if (orchestratorPromptAdditions) {
      systemPrompt += '\n' + orchestratorPromptAdditions;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARTIFACT MODIFICATION: Inject current code into system prompt
    // ═══════════════════════════════════════════════════════════════════════════
    if (isArtifactEdit) {
      systemPrompt += '\n\n' + buildArtifactModificationPrompt(
        artifactCode,
        artifactTitle || 'Component'
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILDER MODE: Multi-file project generation
    // ═══════════════════════════════════════════════════════════════════════════
    if (isBuilderMode) {
      console.log('[Alfred] 🏗️ BUILDER MODE: Multi-file project generation');
      systemPrompt = BUILDER_MODE_PROMPT + '\n\n' + baseSystemPrompt;
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

              // Debug: Log when we see markers (only in builder mode)
              if (isBuilderMode && (token.includes('<<<') || token.includes('>>>'))) {
                console.log('[Chat] 🔍 Marker in token:', JSON.stringify(token.slice(0, 80)));
              }

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

          // AUTO-CONTINUATION: Continues if code is incomplete
          let currentMessages = llmMessages;
          let continuationCount = 0;
          const MAX_CONTINUATIONS = 5;

          while (continuationCount <= MAX_CONTINUATIONS) {
            // Wrap LLM call with circuit breaker + retry for resilience
            await withLLMResilience(
              async () => {
                await client.stream(
                  { system: systemPrompt, messages: currentMessages as any, maxTokens: 32768 },
                  streamOptions
                );
              },
              { requestId, operation: `stream_${continuationCount}` }
            );

            if (detectedFacet !== 'code') break;
            
            const completeness = checkCodeCompleteness(fullResponse);
            console.log('[Alfred] Completeness:', completeness.reason, Math.round(completeness.confidence * 100) + '%');

            if (completeness.complete || continuationCount >= MAX_CONTINUATIONS) break;

            continuationCount++;
            console.log('[Alfred] Auto-continuing... attempt', continuationCount);
            
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ continuation: true, attempt: continuationCount }) + '\n\n'));

            const lastLines = fullResponse.split('\n').slice(-50).join('\n');
            currentMessages = [
              ...llmMessages,
              { role: 'assistant', content: fullResponse },
              { role: 'user', content: 'CONTINUE exactly from where you stopped. Do NOT repeat any code. Just continue:\n\n' + lastLines }
            ] as any;

            await new Promise(r => setTimeout(r, 200));
          }

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

          // Debug: Log marker summary in builder mode
          if (isBuilderMode) {
            const projectStarts = (fullResponse.match(/<<<PROJECT_START>>>/g) || []).length;
            const projectEnds = (fullResponse.match(/<<<PROJECT_END>>>/g) || []).length;
            const fileStarts = (fullResponse.match(/<<<FILE:/g) || []).length;
            const fileEnds = (fullResponse.match(/<<<END_FILE>>>/gi) || []).length;
            console.log(`[Chat] 📊 Builder markers: PROJECT_START=${projectStarts}, PROJECT_END=${projectEnds}, FILE_START=${fileStarts}, FILE_END=${fileEnds}`);

            if (fileStarts !== fileEnds) {
              console.log('[Chat] ⚠️ Mismatch! FILES vs END_FILE count. Looking for END patterns...');
              // Look for what Claude is actually outputting
              const endPatterns = fullResponse.match(/<<<[^>]*END[^>]*>>>/gi);
              console.log('[Chat] 🔍 END patterns found:', endPatterns?.slice(0, 5));
            }
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
        'X-Alfred-Builder-Mode': isBuilderMode ? 'true' : 'false',
        'X-Alfred-Request-Id': requestId,
        'X-Alfred-Orchestrator-State': orchestratorMetadata?.stateTransition.to || 'N/A',
        'X-Alfred-Circuit-Breaker': getCircuitBreakerStatus().state,
      },
    });
    
  } catch (error) {
    console.error('[Alfred] Fatal error:', error);

    // Capture to Sentry with full context
    if (error instanceof Error) {
      captureError(error, {
        requestId,
        tags: {
          endpoint: '/api/chat',
          circuitState: getCircuitBreakerStatus().state,
        },
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        requestId,
        circuitBreakerState: getCircuitBreakerStatus().state,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Alfred-Request-Id': requestId,
        },
      }
    );
  }
}