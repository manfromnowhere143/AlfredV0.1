/**
 * Embedding Service
 * 
 * Voyage AI embeddings for RAG.
 * Best-in-class for code understanding.
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-code-2'; // Optimized for code

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export async function getEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY not configured');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: text,
      input_type: 'document',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error: ${error}`);
  }

  const data = await response.json();
  return {
    embedding: data.data[0].embedding,
    tokens: data.usage.total_tokens,
  };
}

export async function getQueryEmbedding(query: string): Promise<EmbeddingResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY not configured');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: query,
      input_type: 'query',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error: ${error}`);
  }

  const data = await response.json();
  return {
    embedding: data.data[0].embedding,
    tokens: data.usage.total_tokens,
  };
}

export async function getBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY not configured');
  }

  // Voyage supports up to 128 inputs per batch
  const batchSize = 128;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: batch,
        input_type: 'document',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage API error: ${error}`);
    }

    const data = await response.json();
    const tokensPerItem = Math.ceil(data.usage.total_tokens / batch.length);
    
    for (const item of data.data) {
      results.push({
        embedding: item.embedding,
        tokens: tokensPerItem,
      });
    }
  }

  return results;
}