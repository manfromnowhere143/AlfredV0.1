/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE ENGINE: SSML BUILDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Speech Synthesis Markup Language (SSML) builder for expressive TTS.
 * Adds pauses, emphasis, and prosody to make voices more natural.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SSMLOptions {
  /** Overall speaking rate multiplier */
  rate?: number;
  /** Pitch adjustment in semitones */
  pitch?: number;
  /** Volume adjustment */
  volume?: 'silent' | 'x-soft' | 'soft' | 'medium' | 'loud' | 'x-loud';
  /** Add breaks after sentences */
  sentenceBreaks?: boolean;
  /** Add emphasis on key words */
  addEmphasis?: boolean;
  /** Current emotion for prosody adjustment */
  emotion?: EmotionState;
}

export interface ProsodySettings {
  rate: string;
  pitch: string;
  volume: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION PROSODY MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const EMOTION_PROSODY: Record<EmotionState, ProsodySettings> = {
  neutral: {
    rate: 'medium',
    pitch: 'medium',
    volume: 'medium',
  },
  happy: {
    rate: '+10%',
    pitch: '+5%',
    volume: 'loud',
  },
  sad: {
    rate: '-15%',
    pitch: '-10%',
    volume: 'soft',
  },
  angry: {
    rate: '+5%',
    pitch: '-5%',
    volume: 'x-loud',
  },
  surprised: {
    rate: '+15%',
    pitch: '+15%',
    volume: 'loud',
  },
  thoughtful: {
    rate: '-10%',
    pitch: '-2%',
    volume: 'medium',
  },
  excited: {
    rate: '+20%',
    pitch: '+10%',
    volume: 'x-loud',
  },
  calm: {
    rate: '-15%',
    pitch: '-5%',
    volume: 'soft',
  },
  confident: {
    rate: '-5%',
    pitch: '-3%',
    volume: 'loud',
  },
  curious: {
    rate: '+5%',
    pitch: '+5%',
    volume: 'medium',
  },
  concerned: {
    rate: '-5%',
    pitch: '+2%',
    volume: 'medium',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAUSE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const PAUSE_DURATIONS = {
  micro: '100ms',
  short: '250ms',
  medium: '500ms',
  long: '750ms',
  dramatic: '1200ms',
  breath: '300ms',
} as const;

// Punctuation to pause mapping
const PUNCTUATION_PAUSES: Record<string, keyof typeof PAUSE_DURATIONS> = {
  '.': 'medium',
  '!': 'medium',
  '?': 'medium',
  ',': 'short',
  ';': 'short',
  ':': 'short',
  '...': 'long',
  '—': 'short',
  '-': 'micro',
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMPHASIS PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

// Words that typically deserve emphasis
const EMPHASIS_WORDS = new Set([
  // Intensifiers
  'very', 'really', 'absolutely', 'completely', 'totally', 'extremely',
  'incredibly', 'amazingly', 'remarkably', 'utterly', 'definitely',
  // Important words
  'important', 'critical', 'essential', 'vital', 'crucial', 'key',
  'never', 'always', 'must', 'only', 'first', 'last', 'best', 'worst',
  // Emotional words
  'love', 'hate', 'fear', 'hope', 'believe', 'know', 'think', 'feel',
  // Action words
  'now', 'today', 'immediately', 'finally', 'suddenly',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// SSML BUILDER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SSMLBuilder {
  private parts: string[] = [];
  private options: SSMLOptions;

  constructor(options: SSMLOptions = {}) {
    this.options = {
      rate: 1.0,
      pitch: 0,
      sentenceBreaks: true,
      addEmphasis: true,
      ...options,
    };
  }

  /**
   * Add plain text
   */
  text(content: string): this {
    this.parts.push(this.escapeXml(content));
    return this;
  }

  /**
   * Add a break/pause
   */
  break(duration: keyof typeof PAUSE_DURATIONS | string): this {
    const time = PAUSE_DURATIONS[duration as keyof typeof PAUSE_DURATIONS] || duration;
    this.parts.push(`<break time="${time}"/>`);
    return this;
  }

  /**
   * Add emphasized text
   */
  emphasis(content: string, level: 'strong' | 'moderate' | 'reduced' = 'moderate'): this {
    this.parts.push(`<emphasis level="${level}">${this.escapeXml(content)}</emphasis>`);
    return this;
  }

  /**
   * Add prosody-modified text
   */
  prosody(
    content: string,
    settings: Partial<ProsodySettings>
  ): this {
    const attrs = Object.entries(settings)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    
    this.parts.push(`<prosody ${attrs}>${this.escapeXml(content)}</prosody>`);
    return this;
  }

  /**
   * Add a sentence with automatic prosody and breaks
   */
  sentence(content: string): this {
    this.parts.push(`<s>${this.escapeXml(content)}</s>`);
    if (this.options.sentenceBreaks) {
      this.break('short');
    }
    return this;
  }

  /**
   * Add a paragraph with automatic structure
   */
  paragraph(content: string): this {
    this.parts.push(`<p>${this.escapeXml(content)}</p>`);
    return this;
  }

  /**
   * Add phonetic pronunciation
   */
  phoneme(word: string, pronunciation: string, alphabet: 'ipa' | 'x-sampa' = 'ipa'): this {
    this.parts.push(
      `<phoneme alphabet="${alphabet}" ph="${pronunciation}">${this.escapeXml(word)}</phoneme>`
    );
    return this;
  }

  /**
   * Say as specific type
   */
  sayAs(
    content: string,
    interpretAs: 'characters' | 'cardinal' | 'ordinal' | 'fraction' | 'date' | 'time' | 'telephone' | 'address'
  ): this {
    this.parts.push(`<say-as interpret-as="${interpretAs}">${this.escapeXml(content)}</say-as>`);
    return this;
  }

  /**
   * Add raw SSML
   */
  raw(ssml: string): this {
    this.parts.push(ssml);
    return this;
  }

  /**
   * Build the final SSML string
   */
  build(): string {
    let content = this.parts.join('');

    // Wrap with speak tag and prosody if options specified
    const prosodySettings: string[] = [];
    
    if (this.options.rate && this.options.rate !== 1.0) {
      const rate = this.options.rate >= 1 
        ? `+${Math.round((this.options.rate - 1) * 100)}%`
        : `-${Math.round((1 - this.options.rate) * 100)}%`;
      prosodySettings.push(`rate="${rate}"`);
    }

    if (this.options.pitch && this.options.pitch !== 0) {
      const pitch = this.options.pitch > 0 
        ? `+${this.options.pitch}st`
        : `${this.options.pitch}st`;
      prosodySettings.push(`pitch="${pitch}"`);
    }

    if (this.options.volume) {
      prosodySettings.push(`volume="${this.options.volume}"`);
    }

    if (prosodySettings.length > 0) {
      content = `<prosody ${prosodySettings.join(' ')}>${content}</prosody>`;
    }

    return `<speak>${content}</speak>`;
  }

  /**
   * Build without the outer speak tags (for providers that add their own)
   */
  buildContent(): string {
    return this.parts.join('');
  }

  /**
   * Clear all parts
   */
  clear(): this {
    this.parts = [];
    return this;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert plain text to SSML with automatic enhancements
 */
export function textToSSML(
  text: string,
  options: SSMLOptions = {}
): string {
  const builder = new SSMLBuilder(options);
  
  // Apply emotion-based prosody
  if (options.emotion) {
    const emotionProsody = EMOTION_PROSODY[options.emotion];
    
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      let processed = sentence.trim();
      
      // Add emphasis to key words if enabled
      if (options.addEmphasis) {
        processed = addEmphasisToText(processed);
      }
      
      builder.prosody(processed, emotionProsody);
      builder.break('short');
    }
  } else {
    // Simple processing without emotion
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      let processed = sentence.trim();
      
      if (options.addEmphasis) {
        processed = addEmphasisToText(processed);
      }
      
      builder.sentence(processed);
    }
  }

  return builder.build();
}

/**
 * Add emphasis markers to important words in text
 */
function addEmphasisToText(text: string): string {
  const words = text.split(/(\s+)/);
  
  return words.map(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    
    if (EMPHASIS_WORDS.has(cleanWord)) {
      return `<emphasis level="moderate">${word}</emphasis>`;
    }
    
    return word;
  }).join('');
}

/**
 * Add pauses based on punctuation
 */
export function addPunctuationPauses(text: string): string {
  let result = text;
  
  for (const [punct, pauseType] of Object.entries(PUNCTUATION_PAUSES)) {
    const escapedPunct = punct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pauseDuration = PAUSE_DURATIONS[pauseType];
    
    result = result.replace(
      new RegExp(`${escapedPunct}(?!<)`, 'g'),
      `${punct}<break time="${pauseDuration}"/>`
    );
  }
  
  return result;
}

/**
 * Parse emotion tags from text and apply SSML prosody
 */
export function parseEmotionTags(text: string): string {
  // Match [EMOTION:name] tags
  const emotionRegex = /\[EMOTION:(\w+)\]([\s\S]*?)(?=\[EMOTION:|$)/gi;
  
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = emotionRegex.exec(text)) !== null) {
    // Add text before the tag
    if (match.index > lastIndex) {
      result += text.slice(lastIndex, match.index);
    }

    const emotion = match[1].toLowerCase() as EmotionState;
    const content = match[2].trim();
    const prosody = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;

    result += `<prosody rate="${prosody.rate}" pitch="${prosody.pitch}" volume="${prosody.volume}">${content}</prosody>`;
    
    lastIndex = emotionRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result += text.slice(lastIndex);
  }

  return result || text;
}

/**
 * Strip SSML tags from text
 */
export function stripSSML(ssml: string): string {
  return ssml
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}
