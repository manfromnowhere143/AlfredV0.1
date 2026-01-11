/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE PRESETS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Curated presets for visual styles, voice configurations, and motion settings.
 * These represent production-quality configurations tested for consistency.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
    PersonaVisualStyle,
    VisualStylePreset,
    VoicePreset,
    MotionPreset,
    VoiceCharacteristics,
    VoiceStyle,
  } from '../types';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VISUAL STYLE PRESETS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Visual style presets with SDXL configurations
   */
  export const VISUAL_STYLE_PRESETS: Record<PersonaVisualStyle, VisualStylePreset> = {
    pixar_3d: {
      id: 'pixar_3d',
      name: 'Pixar 3D',
      description: 'High-quality 3D character style inspired by Pixar animation',
      promptPrefix:
        'pixar style, 3d render, high quality character portrait, soft lighting, smooth skin, expressive eyes, detailed features, professional studio lighting, octane render, subsurface scattering',
      negativePrompt:
        'ugly, deformed, noisy, blurry, distorted, out of focus, bad anatomy, extra limbs, poorly drawn face, poorly drawn hands, missing fingers, photo, realistic, anime, cartoon 2d, sketch, painting',
      cfgScale: 7.5,
      sampler: 'DPM++ 2M Karras',
      checkpoint: 'sd_xl_base_1.0',
      loras: ['pixar_style_xl_v1'],
      previewImage: '/presets/pixar_preview.jpg',
    },
  
    arcane_stylized: {
      id: 'arcane_stylized',
      name: 'Arcane Stylized',
      description: 'Stylized art style inspired by the Arcane animated series',
      promptPrefix:
        'arcane style, stylized portrait, painterly, dramatic lighting, detailed face, expressive, fantasy art, league of legends art style, vibrant colors, cinematic, detailed eyes',
      negativePrompt:
        'ugly, deformed, noisy, blurry, photo, realistic, anime, 3d render, cgi, cartoon, chibi, low quality',
      cfgScale: 8.0,
      sampler: 'Euler a',
      checkpoint: 'sd_xl_base_1.0',
      loras: ['arcane_style_xl_v2'],
      previewImage: '/presets/arcane_preview.jpg',
    },
  
    anime_premium: {
      id: 'anime_premium',
      name: 'Premium Anime',
      description: 'High-quality anime character style with detailed features',
      promptPrefix:
        'masterpiece, best quality, anime style, detailed face, beautiful eyes, sharp features, professional artwork, studio quality, vibrant colors, cel shading, clean lines',
      negativePrompt:
        'ugly, deformed, bad anatomy, bad proportions, extra limbs, lowres, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, 3d, realistic, photo',
      cfgScale: 7.0,
      sampler: 'DPM++ 2M Karras',
      checkpoint: 'animagine_xl_v3',
      loras: [],
      previewImage: '/presets/anime_preview.jpg',
    },
  
    hyper_realistic: {
      id: 'hyper_realistic',
      name: 'Hyper Realistic',
      description: 'Photorealistic character generation with lifelike details',
      promptPrefix:
        'hyperrealistic portrait, professional photography, studio lighting, sharp focus, high detail, 8k uhd, dslr, soft lighting, high quality, film grain, detailed skin texture, detailed eyes',
      negativePrompt:
        'cartoon, anime, illustration, painting, drawing, art, sketch, cgi, 3d, render, doll, plastic, fake, ugly, deformed, noisy, blurry, low resolution, oversaturated',
      cfgScale: 6.5,
      sampler: 'DPM++ SDE Karras',
      checkpoint: 'juggernaut_xl_v9',
      loras: ['detail_tweaker_xl', 'skin_texture_xl'],
      previewImage: '/presets/realistic_preview.jpg',
    },
  
    fantasy_epic: {
      id: 'fantasy_epic',
      name: 'Fantasy Epic',
      description: 'Epic fantasy character style with dramatic flair',
      promptPrefix:
        'epic fantasy portrait, dramatic lighting, detailed armor, magical aura, cinematic, professional concept art, artstation, detailed face, ornate details, volumetric lighting',
      negativePrompt:
        'ugly, deformed, noisy, blurry, low quality, anime, cartoon, photo, realistic modern, plain background, simple',
      cfgScale: 8.5,
      sampler: 'Euler a',
      checkpoint: 'sd_xl_base_1.0',
      loras: ['fantasy_art_xl_v1'],
      previewImage: '/presets/fantasy_preview.jpg',
    },
  
    corporate_professional: {
      id: 'corporate_professional',
      name: 'Corporate Professional',
      description: 'Clean, professional look suitable for business applications',
      promptPrefix:
        'professional business portrait, clean background, studio lighting, corporate headshot, friendly expression, well-groomed, professional attire, high quality, sharp focus',
      negativePrompt:
        'casual, messy, artistic, stylized, fantasy, cartoon, anime, dramatic, excessive makeup, unprofessional',
      cfgScale: 7.0,
      sampler: 'DPM++ 2M Karras',
      checkpoint: 'juggernaut_xl_v9',
      loras: [],
      previewImage: '/presets/corporate_preview.jpg',
    },
  
    custom: {
      id: 'custom',
      name: 'Custom Style',
      description: 'Fully customizable style with user-defined parameters',
      promptPrefix: '',
      negativePrompt:
        'ugly, deformed, noisy, blurry, distorted, low quality',
      cfgScale: 7.5,
      sampler: 'DPM++ 2M Karras',
      checkpoint: 'sd_xl_base_1.0',
      loras: [],
      previewImage: '/presets/custom_preview.jpg',
    },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VOICE PRESETS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Voice presets for common character archetypes
   */
  export const VOICE_PRESETS: Record<string, VoicePreset> = {
    // Male voices
    wise_mentor: {
      id: 'wise_mentor',
      name: 'Wise Mentor',
      description: 'Deep, calm voice with wisdom and warmth',
      characteristics: {
        gender: 'male',
        age: 'mature',
        pitch: -0.15,
        speed: 0.9,
        stability: 0.8,
        clarity: 0.85,
      },
      style: {
        accent: 'british',
        speakingStyle: 'measured and thoughtful',
        quirks: ['pauses for emphasis', 'warm undertones'],
      },
      promptHint: 'An experienced guide who speaks with patience and wisdom',
      sampleUrl: '/voices/wise_mentor_sample.mp3',
    },
  
    confident_leader: {
      id: 'confident_leader',
      name: 'Confident Leader',
      description: 'Authoritative, clear voice that commands attention',
      characteristics: {
        gender: 'male',
        age: 'adult',
        pitch: 0,
        speed: 1.0,
        stability: 0.85,
        clarity: 0.9,
      },
      style: {
        speakingStyle: 'assertive and direct',
        quirks: ['decisive statements', 'strong emphasis'],
      },
      promptHint: 'A natural leader who speaks with conviction',
      sampleUrl: '/voices/confident_leader_sample.mp3',
    },
  
    friendly_helper: {
      id: 'friendly_helper',
      name: 'Friendly Helper',
      description: 'Warm, approachable voice with enthusiasm',
      characteristics: {
        gender: 'male',
        age: 'young',
        pitch: 0.1,
        speed: 1.1,
        stability: 0.7,
        clarity: 0.85,
      },
      style: {
        speakingStyle: 'enthusiastic and supportive',
        quirks: ['encouraging tone', 'upbeat energy'],
      },
      promptHint: 'An eager assistant always ready to help',
      sampleUrl: '/voices/friendly_helper_sample.mp3',
    },
  
    // Female voices
    regal_queen: {
      id: 'regal_queen',
      name: 'Regal Queen',
      description: 'Elegant, commanding voice with royal bearing',
      characteristics: {
        gender: 'female',
        age: 'adult',
        pitch: -0.05,
        speed: 0.95,
        stability: 0.85,
        clarity: 0.9,
      },
      style: {
        accent: 'british',
        speakingStyle: 'elegant and authoritative',
        quirks: ['measured pacing', 'regal undertones'],
      },
      promptHint: 'A queen who speaks with grace and authority',
      sampleUrl: '/voices/regal_queen_sample.mp3',
    },
  
    nurturing_guide: {
      id: 'nurturing_guide',
      name: 'Nurturing Guide',
      description: 'Warm, caring voice that puts people at ease',
      characteristics: {
        gender: 'female',
        age: 'mature',
        pitch: 0.05,
        speed: 0.9,
        stability: 0.8,
        clarity: 0.85,
      },
      style: {
        speakingStyle: 'gentle and reassuring',
        quirks: ['soothing tone', 'patient explanations'],
      },
      promptHint: 'A caring mentor who nurtures growth',
      sampleUrl: '/voices/nurturing_guide_sample.mp3',
    },
  
    energetic_creator: {
      id: 'energetic_creator',
      name: 'Energetic Creator',
      description: 'Vibrant, creative voice full of ideas',
      characteristics: {
        gender: 'female',
        age: 'young',
        pitch: 0.15,
        speed: 1.15,
        stability: 0.65,
        clarity: 0.85,
      },
      style: {
        speakingStyle: 'animated and inspiring',
        quirks: ['expressive variations', 'creative energy'],
      },
      promptHint: 'An artist bursting with creative enthusiasm',
      sampleUrl: '/voices/energetic_creator_sample.mp3',
    },
  
    // Neutral voices
    professional_assistant: {
      id: 'professional_assistant',
      name: 'Professional Assistant',
      description: 'Clear, efficient voice for business contexts',
      characteristics: {
        gender: 'neutral',
        age: 'adult',
        pitch: 0,
        speed: 1.0,
        stability: 0.9,
        clarity: 0.95,
      },
      style: {
        speakingStyle: 'professional and efficient',
        quirks: ['clear articulation', 'neutral tone'],
      },
      promptHint: 'A professional assistant focused on clarity',
      sampleUrl: '/voices/professional_assistant_sample.mp3',
    },
  
    mysterious_oracle: {
      id: 'mysterious_oracle',
      name: 'Mysterious Oracle',
      description: 'Ethereal, enigmatic voice with depth',
      characteristics: {
        gender: 'neutral',
        age: 'elderly',
        pitch: -0.1,
        speed: 0.85,
        stability: 0.75,
        clarity: 0.8,
      },
      style: {
        speakingStyle: 'cryptic and profound',
        quirks: ['mysterious pauses', 'layered meaning'],
      },
      promptHint: 'An ancient being who speaks in riddles',
      sampleUrl: '/voices/mysterious_oracle_sample.mp3',
    },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MOTION PRESETS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Motion presets for character animation
   */
  export const MOTION_PRESETS: Record<string, MotionPreset> = {
    cinematic: {
      id: 'cinematic',
      name: 'Cinematic',
      description: 'Film-quality motion with smooth, deliberate movements',
      fps: 24,
      motionModule: 'mm_sd_v15_v2',
      motionLora: 'cinematic_motion_lora',
      settings: {
        motionScale: 0.8,
        headMovement: 'natural',
        blinkRate: 0.2,
        breathing: true,
        cameraMotion: 'subtle_drift',
      },
      transitions: {
        in: 'fade',
        out: 'fade',
        duration: 0.5,
      },
      previewUrl: '/motion/cinematic_preview.mp4',
    },
  
    expressive: {
      id: 'expressive',
      name: 'Expressive',
      description: 'Dynamic, animated motion with personality',
      fps: 30,
      motionModule: 'mm_sd_v15_v2',
      motionLora: 'expressive_motion_lora',
      settings: {
        motionScale: 1.2,
        headMovement: 'dynamic',
        blinkRate: 0.25,
        breathing: true,
        cameraMotion: 'responsive',
      },
      transitions: {
        in: 'slide_up',
        out: 'fade',
        duration: 0.3,
      },
      previewUrl: '/motion/expressive_preview.mp4',
    },
  
    calm: {
      id: 'calm',
      name: 'Calm & Composed',
      description: 'Gentle, minimal motion for serene presence',
      fps: 24,
      motionModule: 'mm_sd_v15_v2',
      motionLora: 'subtle_motion_lora',
      settings: {
        motionScale: 0.5,
        headMovement: 'minimal',
        blinkRate: 0.15,
        breathing: true,
        cameraMotion: 'static',
      },
      transitions: {
        in: 'fade',
        out: 'fade',
        duration: 0.8,
      },
      previewUrl: '/motion/calm_preview.mp4',
    },
  
    professional: {
      id: 'professional',
      name: 'Professional',
      description: 'Subtle, business-appropriate motion',
      fps: 24,
      motionModule: 'mm_sd_v15_v2',
      motionLora: 'professional_motion_lora',
      settings: {
        motionScale: 0.6,
        headMovement: 'subtle',
        blinkRate: 0.2,
        breathing: true,
        cameraMotion: 'none',
      },
      transitions: {
        in: 'fade',
        out: 'fade',
        duration: 0.4,
      },
      previewUrl: '/motion/professional_preview.mp4',
    },
  
    engaging: {
      id: 'engaging',
      name: 'Engaging',
      description: 'Warm, inviting motion that connects with viewers',
      fps: 30,
      motionModule: 'mm_sd_v15_v2',
      motionLora: 'engaging_motion_lora',
      settings: {
        motionScale: 0.9,
        headMovement: 'natural',
        blinkRate: 0.22,
        breathing: true,
        cameraMotion: 'subtle_zoom',
      },
      transitions: {
        in: 'scale_up',
        out: 'fade',
        duration: 0.4,
      },
      previewUrl: '/motion/engaging_preview.mp4',
    },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CAMERA ANGLE PRESETS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const CAMERA_ANGLE_PRESETS = {
    front_center: {
      id: 'front_center',
      name: 'Front Center',
      description: 'Direct eye contact, neutral angle',
      prompt: 'front view, eye level, centered composition, direct gaze',
    },
    slight_angle: {
      id: 'slight_angle',
      name: 'Slight Angle',
      description: 'Natural 3/4 view, adds depth',
      prompt: 'three quarter view, slight angle, natural pose, slight turn',
    },
    dramatic_low: {
      id: 'dramatic_low',
      name: 'Dramatic Low',
      description: 'Low angle for powerful presence',
      prompt: 'low angle shot, looking up, dramatic pose, powerful presence',
    },
    intimate_close: {
      id: 'intimate_close',
      name: 'Intimate Close-up',
      description: 'Close framing for personal connection',
      prompt: 'close up portrait, intimate framing, soft focus background, personal',
    },
    professional_headshot: {
      id: 'professional_headshot',
      name: 'Professional Headshot',
      description: 'Standard business portrait framing',
      prompt: 'professional headshot, shoulders up, clean background, corporate',
    },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPRESSION PRESETS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const EXPRESSION_PRESETS = {
    neutral: {
      id: 'neutral',
      name: 'Neutral',
      prompt: 'neutral expression, calm, composed, attentive',
    },
    happy: {
      id: 'happy',
      name: 'Happy',
      prompt: 'happy expression, warm smile, friendly, joyful eyes',
    },
    thoughtful: {
      id: 'thoughtful',
      name: 'Thoughtful',
      prompt: 'thoughtful expression, contemplative, slight furrow, deep in thought',
    },
    confident: {
      id: 'confident',
      name: 'Confident',
      prompt: 'confident expression, assured smile, strong gaze, self-assured',
    },
    concerned: {
      id: 'concerned',
      name: 'Concerned',
      prompt: 'concerned expression, empathetic, caring look, attentive',
    },
    surprised: {
      id: 'surprised',
      name: 'Surprised',
      prompt: 'surprised expression, wide eyes, raised eyebrows, amazed',
    },
    serious: {
      id: 'serious',
      name: 'Serious',
      prompt: 'serious expression, focused, determined, intense gaze',
    },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Get visual style preset by ID
   */
  export function getVisualStylePreset(style: PersonaVisualStyle): VisualStylePreset {
    return VISUAL_STYLE_PRESETS[style] || VISUAL_STYLE_PRESETS.custom;
  }
  
  /**
   * Get voice preset by ID
   */
  export function getVoicePreset(presetId: string): VoicePreset | undefined {
    return VOICE_PRESETS[presetId];
  }
  
  /**
   * Get motion preset by ID
   */
  export function getMotionPreset(presetId: string): MotionPreset | undefined {
    return MOTION_PRESETS[presetId];
  }
  
  /**
   * List all visual style options
   */
  export function listVisualStyles(): Array<{ id: string; name: string; description: string }> {
    return Object.values(VISUAL_STYLE_PRESETS).map(({ id, name, description }) => ({
      id,
      name,
      description,
    }));
  }
  
  /**
   * List all voice preset options
   */
  export function listVoicePresets(): Array<{ id: string; name: string; description: string }> {
    return Object.values(VOICE_PRESETS).map(({ id, name, description }) => ({
      id,
      name,
      description,
    }));
  }
  
  /**
   * List all motion preset options
   */
  export function listMotionPresets(): Array<{ id: string; name: string; description: string }> {
    return Object.values(MOTION_PRESETS).map(({ id, name, description }) => ({
      id,
      name,
      description,
    }));
  }