/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAL ENGINE: STYLE PRESETS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art visual style presets for persona generation.
 * Each preset is tuned for specific aesthetic quality.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PersonaVisualStyle } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StylePreset {
  /** Display name */
  name: string;
  /** Style category */
  category: 'realistic' | 'stylized' | '3d' | 'anime' | 'fantasy';
  /** Prompt prefix to inject */
  promptPrefix: string;
  /** Negative prompt elements */
  negativePrompt: string;
  /** CFG scale for generation */
  cfgScale: number;
  /** Sampler to use */
  sampler: string;
  /** SDXL checkpoint model */
  checkpoint: string;
  /** LoRAs to apply with weights */
  loras: Array<{ name: string; weight: number }>;
  /** Recommended steps */
  steps: number;
  /** Post-processing options */
  postProcess: {
    colorGrade?: string;
    sharpening?: number;
    contrast?: number;
    saturation?: number;
    vignette?: number;
  };
  /** Sample gallery for UI */
  sampleImages?: string[];
  /** Description for users */
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const STYLE_PRESETS: Record<PersonaVisualStyle, StylePreset> = {
  pixar_3d: {
    name: 'Pixar / Disney 3D',
    category: '3d',
    description: 'Warm, expressive 3D characters with subsurface scattering and soft lighting. Perfect for friendly, approachable personas.',
    promptPrefix: `3D rendered character, Pixar style animation, subsurface scattering skin,
soft ambient lighting, expressive cartoon eyes, smooth rounded features,
Disney quality rendering, octane render, highly detailed, 8K resolution,
studio lighting, professional character design, appealing proportions`,
    negativePrompt: `realistic photo, 2D flat, low quality, blurry, ugly, deformed,
bad anatomy, worst quality, low resolution, amateur, poorly rendered,
uncanny valley, creepy, horror, dark, gritty`,
    cfgScale: 7.5,
    sampler: 'DPM++ 2M Karras',
    checkpoint: 'dreamshaper_8',
    loras: [
      { name: 'pixar_style_v2', weight: 0.8 },
      { name: '3d_render_style', weight: 0.5 },
    ],
    steps: 30,
    postProcess: {
      colorGrade: 'warm_vibrant',
      sharpening: 0.3,
      contrast: 1.1,
      saturation: 1.1,
    },
  },

  arcane_stylized: {
    name: 'Arcane / Spider-Verse',
    category: 'stylized',
    description: 'Painterly 3D with visible brushstrokes and dramatic lighting. Ideal for edgy, artistic personas with depth.',
    promptPrefix: `stylized 3D artwork, Arcane Netflix animation style, painterly texture,
visible brushstrokes, dramatic volumetric lighting, high contrast shadows,
cinematic color grading, oil painting texture, detailed linework,
Spider-Verse aesthetic, bold color palette, artistic rendering`,
    negativePrompt: `anime style, realistic photo, smooth plastic, generic 3D, flat lighting,
simple shading, low detail, amateur, cartoonish, childish`,
    cfgScale: 8.0,
    sampler: 'Euler a',
    checkpoint: 'revAnimated_v122',
    loras: [
      { name: 'arcane_style_v3', weight: 0.9 },
      { name: 'painterly_v2', weight: 0.6 },
    ],
    steps: 35,
    postProcess: {
      colorGrade: 'cinematic_teal_orange',
      contrast: 1.2,
      saturation: 0.95,
      vignette: 0.15,
    },
  },

  anime_premium: {
    name: 'Premium Anime',
    category: 'anime',
    description: 'Studio Ghibli meets modern anime. Beautiful, detailed illustrations with expressive eyes and flowing details.',
    promptPrefix: `masterpiece anime artwork, studio ghibli quality, detailed anime eyes,
flowing hair with highlights, soft cel shading, vibrant colors,
professional anime illustration, sakuga quality, detailed clothing folds,
beautiful lighting, intricate details, high production value`,
    negativePrompt: `3D render, western cartoon, realistic, low quality, sketch, rough,
amateur, simple shading, flat colors, generic anime, chibi, super deformed`,
    cfgScale: 7.0,
    sampler: 'DPM++ SDE Karras',
    checkpoint: 'animagineXL_v3',
    loras: [
      { name: 'anime_quality_v4', weight: 0.7 },
    ],
    steps: 28,
    postProcess: {
      colorGrade: 'anime_vibrant',
      sharpening: 0.2,
      saturation: 1.15,
    },
  },

  hyper_realistic: {
    name: 'Hyper Realistic',
    category: 'realistic',
    description: 'Photorealistic quality indistinguishable from photography. Perfect for professional, authoritative personas.',
    promptPrefix: `hyperrealistic portrait photography, 8K UHD resolution, DSLR quality,
professional studio lighting, detailed skin texture and pores,
sharp focus, photorealistic rendering, Canon EOS R5, 85mm lens,
soft bokeh background, natural skin tones, cinematic lighting setup`,
    negativePrompt: `cartoon, anime, illustration, painting, CGI look, plastic skin,
overly smooth, airbrushed, fake looking, uncanny, amateur photography,
harsh lighting, overexposed, underexposed, noisy`,
    cfgScale: 5.5,
    sampler: 'DPM++ 2M Karras',
    checkpoint: 'realvisxlV40',
    loras: [
      { name: 'realistic_skin_v2', weight: 0.5 },
      { name: 'studio_lighting', weight: 0.4 },
    ],
    steps: 35,
    postProcess: {
      colorGrade: 'natural_film',
      sharpening: 0.4,
      contrast: 1.05,
    },
  },

  fantasy_epic: {
    name: 'Fantasy Epic',
    category: 'fantasy',
    description: 'Epic fantasy art with dramatic lighting and magical atmosphere. Ideal for mystical, powerful personas.',
    promptPrefix: `epic fantasy character art, dramatic volumetric lighting,
magical atmosphere with particle effects, intricate detailed armor or clothing,
god rays and lens flares, artstation trending, fantasy concept art,
detailed ornate accessories, cinematic composition, heroic pose`,
    negativePrompt: `modern clothing, casual, simple design, low detail, flat lighting,
amateur, generic fantasy, stock photo, mundane, boring composition`,
    cfgScale: 8.5,
    sampler: 'Euler a',
    checkpoint: 'juggernautXL_v9',
    loras: [
      { name: 'fantasy_lighting', weight: 0.7 },
      { name: 'epic_composition', weight: 0.5 },
    ],
    steps: 40,
    postProcess: {
      colorGrade: 'fantasy_golden',
      contrast: 1.15,
      saturation: 1.05,
      vignette: 0.2,
    },
  },

  corporate_professional: {
    name: 'Corporate Professional',
    category: 'realistic',
    description: 'Clean, professional headshots for business personas. Approachable yet authoritative.',
    promptPrefix: `professional corporate headshot, business attire, clean background,
soft diffused lighting, confident expression, approachable smile,
high-end portrait photography, LinkedIn quality, polished appearance,
neutral color palette, professional grooming, studio backdrop`,
    negativePrompt: `casual clothing, messy, unprofessional, harsh shadows, busy background,
amateur photography, selfie quality, bad lighting, unflattering angles`,
    cfgScale: 5.0,
    sampler: 'DPM++ 2M Karras',
    checkpoint: 'realvisxlV40',
    loras: [
      { name: 'corporate_portrait', weight: 0.6 },
    ],
    steps: 30,
    postProcess: {
      colorGrade: 'clean_corporate',
      sharpening: 0.35,
      contrast: 1.0,
    },
  },

  custom: {
    name: 'Custom Style',
    category: 'stylized',
    description: 'Fully customizable style with your own prompts and settings.',
    promptPrefix: '',
    negativePrompt: 'low quality, blurry, amateur, deformed',
    cfgScale: 7.0,
    sampler: 'DPM++ 2M Karras',
    checkpoint: 'dreamshaper_8',
    loras: [],
    steps: 30,
    postProcess: {},
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR GRADES
// ═══════════════════════════════════════════════════════════════════════════════

export const COLOR_GRADES = {
  warm_vibrant: {
    name: 'Warm Vibrant',
    lut: 'warm_vibrant.cube',
    adjustments: { temperature: 10, tint: 5, saturation: 1.1 },
  },
  cinematic_teal_orange: {
    name: 'Cinematic Teal/Orange',
    lut: 'teal_orange.cube',
    adjustments: { temperature: -5, contrast: 1.15, saturation: 0.9 },
  },
  anime_vibrant: {
    name: 'Anime Vibrant',
    lut: 'anime_pop.cube',
    adjustments: { saturation: 1.2, vibrance: 1.15 },
  },
  natural_film: {
    name: 'Natural Film',
    lut: 'kodak_portra.cube',
    adjustments: { temperature: 2, contrast: 1.05 },
  },
  fantasy_golden: {
    name: 'Fantasy Golden',
    lut: 'golden_hour.cube',
    adjustments: { temperature: 15, saturation: 1.05, contrast: 1.1 },
  },
  clean_corporate: {
    name: 'Clean Corporate',
    lut: 'neutral_clean.cube',
    adjustments: { temperature: 0, saturation: 0.95, contrast: 1.0 },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESSION CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const EXPRESSION_PROMPTS = {
  neutral: {
    prompt: 'neutral expression, calm, composed, relaxed face',
    eyebrow: 'neutral',
    mouth: 'closed, relaxed',
    eyes: 'looking at viewer',
  },
  happy: {
    prompt: 'happy expression, genuine warm smile, joyful eyes, cheerful',
    eyebrow: 'slightly raised',
    mouth: 'smiling, showing some teeth',
    eyes: 'crinkled with joy, sparkling',
  },
  sad: {
    prompt: 'sad expression, melancholic, slight frown, sorrowful eyes',
    eyebrow: 'inner corners raised',
    mouth: 'slight downturn, closed',
    eyes: 'downcast, glistening',
  },
  angry: {
    prompt: 'angry expression, furrowed brow, intense gaze, stern',
    eyebrow: 'lowered, furrowed',
    mouth: 'tight, possibly clenched',
    eyes: 'narrowed, piercing',
  },
  surprised: {
    prompt: 'surprised expression, wide eyes, raised eyebrows, amazed',
    eyebrow: 'highly raised',
    mouth: 'slightly open, O shape',
    eyes: 'wide open, alert',
  },
  thoughtful: {
    prompt: 'thoughtful expression, contemplative, pondering, wise',
    eyebrow: 'slightly furrowed',
    mouth: 'closed, slight purse',
    eyes: 'looking slightly up or to the side',
  },
  excited: {
    prompt: 'excited expression, enthusiastic, bright smile, energetic',
    eyebrow: 'raised',
    mouth: 'wide open smile',
    eyes: 'wide, sparkling with excitement',
  },
  concerned: {
    prompt: 'concerned expression, worried, empathetic, caring',
    eyebrow: 'slightly raised inner corners',
    mouth: 'slight frown, closed',
    eyes: 'soft, attentive',
  },
  confident: {
    prompt: 'confident expression, assured, slight smirk, powerful',
    eyebrow: 'relaxed, one slightly raised',
    mouth: 'subtle confident smile',
    eyes: 'direct gaze, self-assured',
  },
  curious: {
    prompt: 'curious expression, intrigued, questioning, interested',
    eyebrow: 'one raised higher',
    mouth: 'slightly open',
    eyes: 'bright, alert, focused',
  },
  loving: {
    prompt: 'loving expression, warm, affectionate, tender, caring gaze',
    eyebrow: 'soft, relaxed',
    mouth: 'gentle warm smile',
    eyes: 'soft, warm, adoring',
  },
  disappointed: {
    prompt: 'disappointed expression, let down, slight disapproval',
    eyebrow: 'lowered, flat',
    mouth: 'slight frown, tight',
    eyes: 'looking down or away',
  },
} as const;

export type ExpressionType = keyof typeof EXPRESSION_PROMPTS;

// ═══════════════════════════════════════════════════════════════════════════════
// ANGLE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const ANGLE_PROMPTS = {
  front: {
    prompt: 'front view, facing camera directly, symmetrical face',
    camera: 'straight on',
  },
  three_quarter_left: {
    prompt: '3/4 view from left, slight head turn, dynamic angle',
    camera: '45 degrees left',
  },
  three_quarter_right: {
    prompt: '3/4 view from right, slight head turn, dynamic angle',
    camera: '45 degrees right',
  },
  profile_left: {
    prompt: 'profile view from left, side face, elegant pose',
    camera: '90 degrees left',
  },
  profile_right: {
    prompt: 'profile view from right, side face, elegant pose',
    camera: '90 degrees right',
  },
  looking_up: {
    prompt: 'looking up angle, heroic perspective, powerful pose',
    camera: 'low angle looking up',
  },
  looking_down: {
    prompt: 'looking down angle, intimate perspective, approachable',
    camera: 'high angle looking down',
  },
} as const;

export type AngleType = keyof typeof ANGLE_PROMPTS;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a complete prompt from style preset and options
 */
export function buildVisualPrompt(options: {
  style: PersonaVisualStyle;
  description: string;
  expression?: ExpressionType;
  angle?: AngleType;
  customPrompt?: string;
}): { positive: string; negative: string } {
  const preset = STYLE_PRESETS[options.style] || STYLE_PRESETS.hyper_realistic;
  const expression = options.expression ? EXPRESSION_PROMPTS[options.expression] : null;
  const angle = options.angle ? ANGLE_PROMPTS[options.angle] : null;

  const parts = [
    preset.promptPrefix,
    options.description,
    expression?.prompt,
    angle?.prompt,
    options.customPrompt,
    'looking at viewer, portrait',
  ].filter(Boolean);

  return {
    positive: parts.join(', '),
    negative: preset.negativePrompt,
  };
}

/**
 * Get style preset by name
 */
export function getStylePreset(style: PersonaVisualStyle): StylePreset {
  return STYLE_PRESETS[style] || STYLE_PRESETS.hyper_realistic;
}

/**
 * Get all available style names
 */
export function getAvailableStyles(): PersonaVisualStyle[] {
  return Object.keys(STYLE_PRESETS) as PersonaVisualStyle[];
}
