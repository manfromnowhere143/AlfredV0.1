import { db, artifacts, eq, desc } from '@alfred/database';

export function extractCodeFromResponse(content: string): { code: string; language: string; title: string } | null {
  const codeBlockRegex = /```(jsx|tsx|html|css|javascript|typescript)\n([\s\S]*?)```/;
  const match = content.match(codeBlockRegex);
  if (!match) return null;
  
  const language = match[1];
  const code = match[2].trim();
  const titleMatch = code.match(/(?:export default function|function|const)\s+(\w+)/);
  const title = titleMatch ? titleMatch[1] : 'Artifact';
  
  return { code, language, title };
}

export async function saveArtifact(convId: string, msgId: string | null, code: string, lang: string, name: string) {
  try {
    const existing = await db.select().from(artifacts).where(eq(artifacts.conversationId, convId)).orderBy(desc(artifacts.version)).limit(1);
    const ver = existing.length > 0 ? existing[0].version + 1 : 1;
    const [artifact] = await db.insert(artifacts).values({ 
      conversationId: convId, 
      messageId: msgId, 
      code, 
      language: lang, 
      title: name, 
      version: ver 
    }).returning();
    console.log('[Artifact] Saved v' + ver + ': ' + name);
    return artifact;
  } catch (e) { 
    console.error('[Artifact] Save error:', e); 
    return null; 
  }
}

export async function loadLatestArtifact(convId: string) {
  try {
    const [artifact] = await db.select().from(artifacts).where(eq(artifacts.conversationId, convId)).orderBy(desc(artifacts.version)).limit(1);
    return artifact || null;
  } catch (e) { 
    console.error('[Artifact] Load error:', e); 
    return null; 
  }
}
