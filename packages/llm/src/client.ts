/**
 * LLM Client
 *
 * Anthropic SDK wrapper with streaming, retries, and Alfred integration.
 * Type-safe. Production-ready.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMConfig,
  ModelId,
  Message,
  CompletionRequest,
  CompletionResponse,
  StreamOptions,
  Usage,
  CostEstimate,
  ContentBlock,
  TextBlock,
  AlfredRequest,
  AlfredResponse,
  AlfredContext,
  DEFAULT_MODEL,
  MODEL_INFO,
} from './types';
import { buildSystemPrompt } from './prompts';
import { estimateCost } from './tokens';
import { withRetry, RetryConfig } from './retry';

// ============================================================================
// CLIENT
// ============================================================================

export interface LLMClient {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest, options: StreamOptions): Promise<CompletionResponse>;
  alfred(request: AlfredRequest): Promise<AlfredResponse>;
  alfredStream(request: AlfredRequest, options: StreamOptions): Promise<AlfredResponse>;
  getModel(): ModelId;
  setModel(model: ModelId): void;
}

export function createLLMClient(config: LLMConfig): LLMClient {
  const anthropic = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    timeout: config.timeout || 60000,
    maxRetries: 0, // We handle retries ourselves
  });

  let currentModel: ModelId = config.model || 'claude-sonnet-4-20250514';
  const defaultMaxTokens = config.maxTokens || 4096;
  const defaultTemperature = config.temperature ?? 0.7;

  const retryConfig: RetryConfig = {
    maxRetries: config.maxRetries ?? 3,
    baseDelay: 1000,
    maxDelay: 30000,
  };

  // ============================================================================
  // COMPLETE
  // ============================================================================

  async function complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model || currentModel;
    const maxTokens = request.maxTokens || defaultMaxTokens;

    const response = await withRetry(async () => {
      return anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? defaultTemperature,
        system: request.system,
        messages: convertMessages(request.messages),
        stop_sequences: request.stopSequences,
        tools: request.tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
        })),
        tool_choice: request.toolChoice as Anthropic.ToolChoice,
      });
    }, retryConfig);

    const usage: Usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    return {
      id: response.id,
      content: convertContentBlocks(response.content),
      model: model,
      stopReason: mapStopReason(response.stop_reason),
      usage,
      cost: estimateCost(model, usage),
    };
  }

  // ============================================================================
  // STREAM
  // ============================================================================

  async function stream(
    request: CompletionRequest,
    options: StreamOptions
  ): Promise<CompletionResponse> {
    const model = request.model || currentModel;
    const maxTokens = request.maxTokens || defaultMaxTokens;

    let responseId = '';
    const contentBlocks: ContentBlock[] = [];
    let currentBlockIndex = -1;
    let currentText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason: CompletionResponse['stopReason'] = 'end_turn';

    const streamResponse = await withRetry(async () => {
      return anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? defaultTemperature,
        system: request.system,
        messages: convertMessages(request.messages),
        stop_sequences: request.stopSequences,
      });
    }, retryConfig);

    try {
      for await (const event of streamResponse) {
        if (options.signal?.aborted) {
          streamResponse.controller.abort();
          break;
        }

        switch (event.type) {
          case 'message_start':
            responseId = event.message.id;
            inputTokens = event.message.usage.input_tokens;
            break;

          case 'content_block_start':
            currentBlockIndex = event.index;
            if (event.content_block.type === 'text') {
              currentText = '';
            }
            break;

          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              currentText += event.delta.text;
              options.onToken?.(event.delta.text);
            }
            break;

          case 'content_block_stop':
            if (currentText) {
              const block: TextBlock = { type: 'text', text: currentText };
              contentBlocks.push(block);
              options.onContentBlock?.(block);
            }
            break;

          case 'message_delta':
            outputTokens = event.usage.output_tokens;
            stopReason = mapStopReason(event.delta.stop_reason);
            break;

          case 'message_stop':
            // Stream complete
            break;
        }
      }
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    const usage: Usage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };

    options.onUsage?.(usage);

    return {
      id: responseId,
      content: contentBlocks,
      model,
      stopReason,
      usage,
      cost: estimateCost(model, usage),
    };
  }

  // ============================================================================
  // ALFRED-SPECIFIC
  // ============================================================================

  async function alfred(request: AlfredRequest): Promise<AlfredResponse> {
    const systemPrompt = buildSystemPrompt(request.context);
    const messages = buildAlfredMessages(request);

    const response = await complete({
      system: systemPrompt,
      messages,
      metadata: {
        mode: request.context.mode,
        purpose: 'alfred_conversation',
      },
    });

    return parseAlfredResponse(response);
  }

  async function alfredStream(
    request: AlfredRequest,
    options: StreamOptions
  ): Promise<AlfredResponse> {
    const systemPrompt = buildSystemPrompt(request.context);
    const messages = buildAlfredMessages(request);

    const response = await stream(
      {
        system: systemPrompt,
        messages,
        metadata: {
          mode: request.context.mode,
          purpose: 'alfred_conversation',
        },
      },
      options
    );

    return parseAlfredResponse(response);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  function getModel(): ModelId {
    return currentModel;
  }

  function setModel(model: ModelId): void {
    currentModel = model;
  }

  return {
    complete,
    stream,
    alfred,
    alfredStream,
    getModel,
    setModel,
  };
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

function convertMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string'
      ? msg.content
      : msg.content.map(block => {
          if (block.type === 'text') {
            return { type: 'text' as const, text: block.text };
          }
          if (block.type === 'image') {
            return {
              type: 'image' as const,
              source: {
                type: block.source.type as 'base64',
                media_type: block.source.mediaType,
                data: block.source.data,
              },
            };
          }
          if (block.type === 'tool_use') {
            return {
              type: 'tool_use' as const,
              id: block.id,
              name: block.name,
              input: block.input,
            };
          }
          if (block.type === 'tool_result') {
            return {
              type: 'tool_result' as const,
              tool_use_id: block.toolUseId,
              content: block.content,
              is_error: block.isError,
            };
          }
          return { type: 'text' as const, text: '' };
        }),
  }));
}

function convertContentBlocks(blocks: Anthropic.ContentBlock[]): ContentBlock[] {
  return blocks.map(block => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text };
    }
    if (block.type === 'tool_use') {
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      };
    }
    return { type: 'text', text: '' };
  });
}

function mapStopReason(reason: string | null): CompletionResponse['stopReason'] {
  switch (reason) {
    case 'end_turn':
      return 'end_turn';
    case 'max_tokens':
      return 'max_tokens';
    case 'stop_sequence':
      return 'stop_sequence';
    case 'tool_use':
      return 'tool_use';
    default:
      return 'end_turn';
  }
}

function buildAlfredMessages(request: AlfredRequest): Message[] {
  const messages: Message[] = [];

  // Add conversation history
  if (request.conversationHistory) {
    messages.push(...request.conversationHistory);
  }

  // Add current user message
  const userContent: ContentBlock[] = [{ type: 'text', text: request.userMessage }];

  if (request.attachments) {
    userContent.push(...request.attachments);
  }

  messages.push({
    role: 'user',
    content: userContent,
  });

  return messages;
}

function parseAlfredResponse(response: CompletionResponse): AlfredResponse {
  const textContent = response.content
    .filter((b): b is TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  // Parse artifacts from response (marked with special delimiters)
  const artifacts = extractArtifacts(textContent);
  const cleanContent = removeArtifactMarkers(textContent);

  // Detect mode switch suggestions
  const modeSwitch = detectModeSwitch(textContent);

  // Generate follow-up suggestions
  const suggestions = generateSuggestions(textContent);

  return {
    content: cleanContent,
    artifacts,
    modeSwitch,
    suggestions,
    usage: response.usage,
    cost: response.cost,
  };
}

function extractArtifacts(content: string): AlfredResponse['artifacts'] {
  const artifacts: AlfredResponse['artifacts'] = [];
  const artifactRegex = /```(\w+)?\s*(?:\/\/\s*@artifact:\s*(.+?)\n)?([\s\S]*?)```/g;

  let match;
  while ((match = artifactRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const title = match[2] || `Code (${language})`;
    const code = match[3].trim();

    if (code.length > 50) {
      artifacts.push({
        id: `artifact_${Date.now()}_${artifacts.length}`,
        type: 'code',
        title,
        content: code,
        language,
      });
    }
  }

  return artifacts.length > 0 ? artifacts : undefined;
}

function removeArtifactMarkers(content: string): string {
  return content.replace(/\/\/\s*@artifact:\s*.+?\n/g, '');
}

function detectModeSwitch(content: string): AlfredResponse['modeSwitch'] {
  const mentorTriggers = ['let me explain', 'to understand this', 'the concept here'];
  const reviewerTriggers = ['looking at this code', 'i notice some issues', 'reviewing this'];
  const builderTriggers = ['let me build', 'here\'s the implementation', 'i\'ll create'];

  const lowerContent = content.toLowerCase();

  if (mentorTriggers.some(t => lowerContent.includes(t))) {
    return { newMode: 'mentor', reason: 'Detected teaching opportunity' };
  }
  if (reviewerTriggers.some(t => lowerContent.includes(t))) {
    return { newMode: 'reviewer', reason: 'Detected code review context' };
  }
  if (builderTriggers.some(t => lowerContent.includes(t))) {
    return { newMode: 'builder', reason: 'Detected building context' };
  }

  return undefined;
}

function generateSuggestions(content: string): string[] {
  const suggestions: string[] = [];

  if (content.includes('```')) {
    suggestions.push('Explain this code');
    suggestions.push('Add tests');
  }

  if (content.includes('error') || content.includes('issue')) {
    suggestions.push('How do I fix this?');
  }

  if (content.includes('architecture') || content.includes('design')) {
    suggestions.push('Show me the diagram');
  }

  return suggestions.length > 0 ? suggestions : undefined as unknown as string[];
}

// ============================================================================
// CLIENT FROM ENVIRONMENT
// ============================================================================

export function createLLMClientFromEnv(): LLMClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return createLLMClient({
    apiKey,
    model: (process.env.ANTHROPIC_MODEL as ModelId) || undefined,
    maxTokens: process.env.ANTHROPIC_MAX_TOKENS
      ? parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10)
      : undefined,
  });
}
