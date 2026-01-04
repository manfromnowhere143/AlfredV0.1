# @alfred/persona

PersonaForge - AI Character Engine for Alfred

## Overview

PersonaForge enables creation of intelligent, visually consistent AI characters with voice synthesis and video generation capabilities.

## Features

- 🎨 **Visual Generation** - SDXL + InstantID for consistent character identity
- 🎤 **Voice Synthesis** - ElevenLabs or self-hosted Coqui
- 🧠 **Brain Engine** - Persistent memory and emotion detection
- 🎬 **Motion & Video** - AnimateDiff + LivePortrait
- 📱 **Embed Widget** - Embeddable on external websites

## Installation

```bash
pnpm add @alfred/persona
```

## Usage

### Creating a Persona

```typescript
import { PersonaService } from '@alfred/persona';

const service = new PersonaService(db);

const { persona, wizardSessionId } = await service.create({
  name: 'Queen Medusa',
  description: 'A wise and elegant queen',
});
```

### Visual Generation

```typescript
import { VisualEngine } from '@alfred/persona/visual';

const engine = new VisualEngine();

const images = await engine.generateBaseCharacter(
  'A wise queen with flowing hair',
  'pixar_3d',
);
```

### Voice Synthesis

```typescript
import { VoiceEngine } from '@alfred/persona/voice';

const engine = new VoiceEngine('elevenlabs');

const audio = await engine.synthesize(
  'Welcome to my realm.',
  voiceProfile,
  'confident',
);
```

### Chat with Persona

```typescript
import { BrainEngine } from '@alfred/persona/brain';

const brain = new BrainEngine(llm, memoryStore);

const responseStream = brain.processInput(
  persona,
  'What advice do you have?',
  context,
);

for await (const chunk of responseStream) {
  console.log(chunk.text);
}
```

## Module Structure

```
@alfred/persona
├── /creation     # Creation wizard and presets
├── /visual       # Image generation engine
├── /voice        # Voice synthesis engine
├── /brain        # Intelligence and memory engine
└── /realtime     # Voice/video call handling
```

## API Reference

See the [API Documentation](../../docs/api/persona.md) for detailed reference.

## License

MIT