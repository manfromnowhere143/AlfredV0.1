# Persona 3D Architecture

## Overview

All Persona 3D rendering now uses a **unified WebGL canvas** to prevent duplication and improve performance.

## The Problem (Before)

Previously, we had multiple Three.js Canvas instances:

```
AwakeningScene.tsx → Canvas → WebGL context #1 ❌
LiveAvatar3D.tsx → Canvas → WebGL context #2 ❌
```

This caused:
- Duplicate GPU contexts
- Duplicate render loops
- Higher VRAM usage
- Worse performance
- Potential layering conflicts

## The Solution (After)

**PersonaStage3D** - One unified canvas for all Persona 3D rendering:

```
PersonaStage3D (one Canvas)
 ├── LiveAvatar3DStaged (lip-sync avatar)
 ├── AwakeningScene (birth animation)
 ├── Future: Environments
 └── Future: Effects
```

Benefits:
- ✅ Single WebGL context
- ✅ Shared camera and lighting
- ✅ Better performance
- ✅ Composable scenes
- ✅ Consistent rendering quality

## Components

### PersonaStage3D

**Location**: `/components/PersonaStage3D.tsx`

**Purpose**: The eternal avatar studio - unified canvas for all Persona 3D

**Props**:
- `children` - 3D scene components to render
- `cameraPosition` - Camera position [x, y, z]
- `cameraFov` - Field of view
- `lightingPreset` - "studio" | "sunset" | "dawn" | etc.
- `performanceMode` - "low" | "medium" | "high"
- `enableControls` - Debug camera controls

**Example**:
```tsx
<PersonaStage3D cameraPosition={[0, 0, 5]} lightingPreset="studio">
  <LiveAvatarScene imageUrl={...} />
  <ParticleEffects />
</PersonaStage3D>
```

### LiveAvatar3DStaged

**Location**: `/components/LiveAvatar3DStaged.tsx`

**Purpose**: Avatar with lip-sync, uses PersonaStage3D

**Current Mode**: CSS fallback (default, most stable)

**Future**: Will use full 3D rendering inside PersonaStage3D

**Props**:
- `imageUrl` - Avatar image
- `name` - Persona name
- `audioData` - Base64 audio for lip-sync
- `onAudioEnd` - Callback when audio finishes
- `force3D` - Force 3D mode (default: false)

## Rendering Modes

### 1. CSS Mode (Current Default)

- Pure CSS transforms and animations
- No WebGL required
- Works on all devices
- Amplitude-driven mouth animation
- Breathing, blinking, head tilt

**Performance**: Excellent (always 60fps)
**Quality**: Good (2D only)

### 2. 3D Mode (Future)

- Full Three.js rendering
- 3D avatar meshes with blend shapes
- Realistic lighting and shadows
- Advanced lip-sync with viseme mapping
- Post-processing effects

**Performance**: Very good (60fps on modern devices)
**Quality**: Excellent (cinema-quality)

## Migration Path

### Phase 1: Architecture (✅ Complete)
- [x] Create PersonaStage3D unified canvas
- [x] Create LiveAvatar3DStaged wrapper
- [x] Update EngageView to use staged version

### Phase 2: 3D Scene Components (TODO)
- [ ] Extract AnimatedAvatar from LiveAvatar3D
- [ ] Extract Avatar2D from LiveAvatar3D
- [ ] Extract GlowRing from LiveAvatar3D
- [ ] Make them work inside PersonaStage3D (no Canvas)

### Phase 3: Enable 3D Mode (TODO)
- [ ] Add 3D avatar rendering to LiveAvatar3DStaged
- [ ] Add device capability detection
- [ ] Graceful fallback to CSS on low-end devices
- [ ] Performance monitoring

### Phase 4: AwakeningScene (TODO)
- [ ] Refactor AwakeningScene to use PersonaStage3D
- [ ] Remove its internal Canvas
- [ ] Compose with LiveAvatar3DStaged

## Why Not Use Alfred's Renderer?

Alfred's "Preview" system (`Message.tsx`) is an **iframe-based code execution sandbox**:

```
Message.tsx → <iframe> → generated HTML → execute user code
```

**Purpose**: Execute untrusted user-generated code safely

**Not suitable for Personas because**:
- iframes block WebAudio (breaks lip-sync)
- iframes block microphone access
- iframes add latency
- iframes are for security isolation, not graphics

**Verdict**: Correctly separated. Alfred and Personas need different renderers.

## Performance Targets

| Mode | Target FPS | Memory | GPU Load |
|------|-----------|---------|----------|
| CSS  | 60        | < 50MB  | Minimal  |
| 3D   | 60        | < 200MB | Moderate |

## Browser Support

- **CSS Mode**: All browsers (IE11+)
- **3D Mode**: Modern browsers with WebGL 2.0
  - Chrome 56+
  - Firefox 51+
  - Safari 15+
  - Edge 79+

## Debug Mode

Enable camera controls for development:

```tsx
<PersonaStage3D enableControls={true}>
  {/* Your 3D content */}
</PersonaStage3D>
```

This adds:
- Orbit controls (mouse drag to rotate)
- Zoom (scroll wheel)
- Pan (right-click drag)

**IMPORTANT**: Never enable in production!

## Future Enhancements

1. **Dynamic LOD** - Adjust quality based on device performance
2. **Multi-persona** - Multiple avatars in the same scene
3. **Environments** - 3D backgrounds and props
4. **Interactions** - Touch/click interactions with avatars
5. **AR/VR** - WebXR support for immersive experiences

## Questions?

This architecture follows industry-standard practices used by:
- Unity (one renderer, multiple scenes)
- Unreal Engine (one viewport, composable actors)
- Three.js examples (Canvas + multiple objects)
- VTuber apps (single WebGL context)
- Meta's avatars (unified rendering pipeline)

The goal: **One canvas. One camera. One GPU. Multiple scenes.**
