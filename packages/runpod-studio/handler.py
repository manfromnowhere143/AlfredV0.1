"""
═══════════════════════════════════════════════════════════════════════════════════
PERSONAFORGE STUDIO POD - RunPod Handler
═══════════════════════════════════════════════════════════════════════════════════

This is the main RunPod serverless handler for PersonaForge's video studio.

Three endpoints in one pod:
1. /image/generate    - Fast diffusion image generation
2. /persona/build     - Generate base takes + persona pack
3. /video/render      - Full video pipeline (lip-sync + audio + captions)

Deploy with: runpodctl deploy --gpu L40S --volume 200GB

═══════════════════════════════════════════════════════════════════════════════════
"""

import runpod
import os
import json
import time
import base64
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import asyncio
import aiohttp
import aiofiles

# ═══════════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════════

# Paths (using network volume for persistence)
WORKSPACE = Path(os.getenv("WORKSPACE", "/workspace"))
MODELS_DIR = WORKSPACE / "models"
CACHE_DIR = WORKSPACE / "cache"
PERSONAS_DIR = WORKSPACE / "personas"
JOBS_DIR = WORKSPACE / "jobs"
OUTPUTS_DIR = WORKSPACE / "outputs"

# Model paths
LIPSYNC_MODEL_PATH = MODELS_DIR / "video" / "latentsync"
UPSCALER_MODEL_PATH = MODELS_DIR / "upscalers" / "realesrgan"
FACE_RESTORE_MODEL_PATH = MODELS_DIR / "upscalers" / "gfpgan"

# External API keys (from environment)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
CLOUDFLARE_R2_ENDPOINT = os.getenv("R2_ENDPOINT", "")
CLOUDFLARE_R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY", "")
CLOUDFLARE_R2_SECRET_KEY = os.getenv("R2_SECRET_KEY", "")
CLOUDFLARE_R2_BUCKET = os.getenv("R2_BUCKET", "personaforge-studio")

# ═══════════════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════════════

class JobType(str, Enum):
    IMAGE_GENERATE = "image_generate"
    PERSONA_BUILD = "persona_build"
    VIDEO_RENDER = "video_render"
    LIPSYNC_ONLY = "lipsync_only"
    AUDIO_MIX = "audio_mix"

@dataclass
class JobResult:
    success: bool
    output_urls: Dict[str, str]
    metadata: Dict[str, Any]
    duration_ms: int
    error: Optional[str] = None

# ═══════════════════════════════════════════════════════════════════════════════════
# MODEL LOADING (Happens once on startup)
# ═══════════════════════════════════════════════════════════════════════════════════

# Global model references (loaded once)
_lipsync_model = None
_upscaler_model = None
_face_restore_model = None

def load_models():
    """
    Preload all models on startup.
    This is the key to fast inference - no cold start per request.
    """
    global _lipsync_model, _upscaler_model, _face_restore_model

    print("[Studio] Loading models...")
    start = time.time()

    # Load LatentSync for lip-sync
    # Note: Actual implementation depends on the model's API
    # This is the structure - you'll fill in the actual loading code
    try:
        # Import and load LatentSync
        # from latentsync import LatentSyncPipeline
        # _lipsync_model = LatentSyncPipeline.from_pretrained(str(LIPSYNC_MODEL_PATH))
        # _lipsync_model.to("cuda")
        print("[Studio] LatentSync model loaded (placeholder)")
        _lipsync_model = "loaded"  # Placeholder
    except Exception as e:
        print(f"[Studio] Warning: Could not load LatentSync: {e}")

    # Load Real-ESRGAN for upscaling
    try:
        # from basicsr.archs.rrdbnet_arch import RRDBNet
        # from realesrgan import RealESRGANer
        # model = RRDBNet(...)
        # _upscaler_model = RealESRGANer(...)
        print("[Studio] Upscaler model loaded (placeholder)")
        _upscaler_model = "loaded"  # Placeholder
    except Exception as e:
        print(f"[Studio] Warning: Could not load upscaler: {e}")

    # Load GFPGAN for face restoration
    try:
        # from gfpgan import GFPGANer
        # _face_restore_model = GFPGANer(...)
        print("[Studio] Face restore model loaded (placeholder)")
        _face_restore_model = "loaded"  # Placeholder
    except Exception as e:
        print(f"[Studio] Warning: Could not load face restore: {e}")

    elapsed = time.time() - start
    print(f"[Studio] All models loaded in {elapsed:.2f}s")

# ═══════════════════════════════════════════════════════════════════════════════════
# STORAGE UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════════

async def upload_to_r2(local_path: Path, remote_key: str) -> str:
    """
    Upload file to Cloudflare R2 and return public URL.
    """
    if not CLOUDFLARE_R2_ENDPOINT:
        # Fallback: return base64 data URL
        async with aiofiles.open(local_path, 'rb') as f:
            data = await f.read()
        mime = "video/mp4" if local_path.suffix == ".mp4" else "image/png"
        return f"data:{mime};base64,{base64.b64encode(data).decode()}"

    import boto3
    from botocore.config import Config

    s3 = boto3.client(
        's3',
        endpoint_url=CLOUDFLARE_R2_ENDPOINT,
        aws_access_key_id=CLOUDFLARE_R2_ACCESS_KEY,
        aws_secret_access_key=CLOUDFLARE_R2_SECRET_KEY,
        config=Config(signature_version='s3v4')
    )

    content_type = "video/mp4" if local_path.suffix == ".mp4" else "image/png"
    s3.upload_file(
        str(local_path),
        CLOUDFLARE_R2_BUCKET,
        remote_key,
        ExtraArgs={'ContentType': content_type}
    )

    # Return public URL
    return f"https://{CLOUDFLARE_R2_BUCKET}.r2.dev/{remote_key}"

async def download_file(url: str, local_path: Path) -> Path:
    """
    Download file from URL to local path.
    """
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            async with aiofiles.open(local_path, 'wb') as f:
                await f.write(await response.read())
    return local_path

def decode_base64_to_file(data: str, path: Path) -> Path:
    """
    Decode base64 string to file.
    """
    # Handle data URLs
    if data.startswith("data:"):
        data = data.split(",", 1)[1]

    with open(path, 'wb') as f:
        f.write(base64.b64decode(data))
    return path

# ═══════════════════════════════════════════════════════════════════════════════════
# LIPSYNC PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════════

async def run_lipsync(
    image_path: Path,
    audio_path: Path,
    output_path: Path,
    quality: str = "standard"
) -> Path:
    """
    Generate lip-synced video using LatentSync.

    This is the core video generation step.
    """
    global _lipsync_model

    print(f"[LipSync] Generating video...")
    print(f"[LipSync] Image: {image_path}")
    print(f"[LipSync] Audio: {audio_path}")
    print(f"[LipSync] Quality: {quality}")

    start = time.time()

    # Quality settings
    quality_settings = {
        "fast": {"inference_steps": 10, "guidance_scale": 1.0},
        "standard": {"inference_steps": 20, "guidance_scale": 1.5},
        "high": {"inference_steps": 30, "guidance_scale": 2.0},
    }
    settings = quality_settings.get(quality, quality_settings["standard"])

    # Run LatentSync inference
    # This is where you'd call the actual model
    # Example with a hypothetical API:
    #
    # result = _lipsync_model(
    #     image=str(image_path),
    #     audio=str(audio_path),
    #     num_inference_steps=settings["inference_steps"],
    #     guidance_scale=settings["guidance_scale"],
    # )
    # result.save(str(output_path))

    # Placeholder: Use ffmpeg to create a simple video from image + audio
    # In production, this would be replaced with actual LatentSync inference
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(image_path),
        "-i", str(audio_path),
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        str(output_path)
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {stderr.decode()}")

    elapsed = time.time() - start
    print(f"[LipSync] Generated in {elapsed:.2f}s")

    return output_path

# ═══════════════════════════════════════════════════════════════════════════════════
# AUDIO MIXING PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════════

async def mix_audio(
    voice_path: Path,
    music_path: Optional[Path],
    ambience_path: Optional[Path],
    sfx_tracks: List[Dict[str, Any]],
    output_path: Path,
    total_duration: float,
    ducking_config: Dict[str, Any]
) -> Path:
    """
    Mix audio tracks with ducking using ffmpeg.

    This creates the "cinematic" sound by:
    1. Voice at full volume (center)
    2. Music ducked under voice (sidechain compression)
    3. Ambience (wide, reverb)
    4. SFX hits at timestamps
    """
    print(f"[AudioMix] Mixing audio...")
    start = time.time()

    # Build ffmpeg filter complex
    inputs = ["-i", str(voice_path)]
    filter_parts = ["[0:a]volume=1.0[voice]"]
    mix_inputs = ["[voice]"]
    input_idx = 1

    # Add music with ducking
    if music_path and music_path.exists():
        inputs.extend(["-i", str(music_path)])
        base_vol = ducking_config.get("base_volume", 0.15)

        # Sidechain compression for ducking
        filter_parts.append(
            f"[{input_idx}:a]aloop=loop=-1:size=2e+09,atrim=0:{total_duration},"
            f"volume={base_vol}[music_raw];"
            f"[music_raw][voice]sidechaincompress=threshold=0.02:ratio=10:"
            f"attack={ducking_config.get('attack_ms', 50)}:"
            f"release={ducking_config.get('release_ms', 300)}[music]"
        )
        mix_inputs.append("[music]")
        input_idx += 1

    # Add ambience
    if ambience_path and ambience_path.exists():
        inputs.extend(["-i", str(ambience_path)])
        filter_parts.append(
            f"[{input_idx}:a]aloop=loop=-1:size=2e+09,atrim=0:{total_duration},"
            f"volume=0.08[ambience]"
        )
        mix_inputs.append("[ambience]")
        input_idx += 1

    # Add SFX tracks
    for i, sfx in enumerate(sfx_tracks):
        if "path" in sfx and Path(sfx["path"]).exists():
            inputs.extend(["-i", sfx["path"]])
            delay_ms = int(sfx.get("start_time", 0) * 1000)
            volume = sfx.get("volume", 0.5)
            filter_parts.append(
                f"[{input_idx}:a]adelay={delay_ms}|{delay_ms},volume={volume}[sfx{i}]"
            )
            mix_inputs.append(f"[sfx{i}]")
            input_idx += 1

    # Final mix
    filter_parts.append(
        f"{''.join(mix_inputs)}amix=inputs={len(mix_inputs)}:duration=first:dropout_transition=2[out]"
    )

    filter_complex = ";".join(filter_parts)

    # Run ffmpeg
    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:a", "aac",
        "-b:a", "192k",
        str(output_path)
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        print(f"[AudioMix] Warning: ffmpeg error: {stderr.decode()}")
        # Fallback: just use voice
        shutil.copy(voice_path, output_path)

    elapsed = time.time() - start
    print(f"[AudioMix] Mixed in {elapsed:.2f}s")

    return output_path

# ═══════════════════════════════════════════════════════════════════════════════════
# CAPTION BURNING PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════════

async def burn_captions(
    video_path: Path,
    captions: List[Dict[str, Any]],
    caption_style: Dict[str, Any],
    output_path: Path
) -> Path:
    """
    Burn captions into video using ffmpeg drawtext.
    """
    print(f"[Captions] Burning {len(captions)} captions...")
    start = time.time()

    if not captions:
        shutil.copy(video_path, output_path)
        return output_path

    # Build drawtext filters
    drawtext_filters = []

    font_size = caption_style.get("font_size", 48)
    font_color = caption_style.get("color", "white")
    stroke_color = caption_style.get("stroke_color", "black")
    stroke_width = caption_style.get("stroke_width", 2)
    position_y = caption_style.get("position_y", 0.75)

    for caption in captions:
        text = caption["text"].replace("'", "'\\''").replace(":", "\\:")
        start_time = caption["start"]
        end_time = caption["end"]

        filter_str = (
            f"drawtext=text='{text}':"
            f"fontsize={font_size}:"
            f"fontcolor={font_color}:"
            f"borderw={stroke_width}:"
            f"bordercolor={stroke_color}:"
            f"x=(w-tw)/2:"
            f"y=h*{position_y}:"
            f"enable='between(t,{start_time},{end_time})'"
        )
        drawtext_filters.append(filter_str)

    filter_complex = ",".join(drawtext_filters)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vf", filter_complex,
        "-c:a", "copy",
        str(output_path)
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        print(f"[Captions] Warning: ffmpeg error: {stderr.decode()}")
        shutil.copy(video_path, output_path)

    elapsed = time.time() - start
    print(f"[Captions] Burned in {elapsed:.2f}s")

    return output_path

# ═══════════════════════════════════════════════════════════════════════════════════
# FINAL RENDER PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════════

async def final_render(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    format_spec: Dict[str, Any],
    quality: str
) -> Path:
    """
    Combine video + audio into final output with proper encoding.
    """
    print(f"[Render] Final render...")
    start = time.time()

    width = format_spec.get("width", 1080)
    height = format_spec.get("height", 1920)
    fps = format_spec.get("fps", 30)

    # Quality presets
    quality_presets = {
        "draft": {"crf": 28, "preset": "ultrafast"},
        "standard": {"crf": 23, "preset": "medium"},
        "premium": {"crf": 18, "preset": "slow"},
        "cinematic": {"crf": 15, "preset": "veryslow"},
    }
    preset = quality_presets.get(quality, quality_presets["standard"])

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "libx264",
        "-preset", preset["preset"],
        "-crf", str(preset["crf"]),
        "-c:a", "aac",
        "-b:a", "192k",
        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
               f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-r", str(fps),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(output_path)
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"Final render failed: {stderr.decode()}")

    elapsed = time.time() - start
    print(f"[Render] Completed in {elapsed:.2f}s")

    return output_path

# ═══════════════════════════════════════════════════════════════════════════════════
# JOB HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════════

async def handle_lipsync_only(job_input: Dict[str, Any]) -> JobResult:
    """
    Handle lip-sync only job (fastest path).
    Input: image + audio -> Output: talking video
    """
    start = time.time()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)

        # Get inputs
        image_data = job_input.get("image")  # base64 or URL
        audio_data = job_input.get("audio")  # base64 or URL
        quality = job_input.get("quality", "standard")
        job_id = job_input.get("job_id", f"job_{int(time.time())}")

        # Download/decode inputs
        image_path = tmpdir / "input.png"
        audio_path = tmpdir / "input.mp3"
        output_path = tmpdir / "output.mp4"

        if image_data.startswith("http"):
            await download_file(image_data, image_path)
        else:
            decode_base64_to_file(image_data, image_path)

        if audio_data.startswith("http"):
            await download_file(audio_data, audio_path)
        else:
            decode_base64_to_file(audio_data, audio_path)

        # Run lip-sync
        await run_lipsync(image_path, audio_path, output_path, quality)

        # Upload result
        remote_key = f"videos/{job_id}/lipsync.mp4"
        video_url = await upload_to_r2(output_path, remote_key)

        duration_ms = int((time.time() - start) * 1000)

        return JobResult(
            success=True,
            output_urls={"video": video_url},
            metadata={"quality": quality, "job_id": job_id},
            duration_ms=duration_ms
        )

async def handle_video_render(job_input: Dict[str, Any]) -> JobResult:
    """
    Handle full video render job.

    Input:
    - image: base64 or URL
    - audio: base64 or URL (voice)
    - music_url: optional background music
    - ambience_url: optional ambience
    - sfx_tracks: list of {url, start_time, volume}
    - captions: list of {text, start, end}
    - caption_style: {font_size, color, stroke_color, ...}
    - format: {width, height, fps}
    - quality: draft | standard | premium | cinematic
    - ducking_config: {base_volume, attack_ms, release_ms}

    Output:
    - video_url: final rendered video
    - thumbnail_url: thumbnail image
    """
    start = time.time()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        job_id = job_input.get("job_id", f"job_{int(time.time())}")

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 1: Download/decode all inputs
        # ═══════════════════════════════════════════════════════════════════════
        print(f"[VideoRender] Starting job {job_id}")

        image_path = tmpdir / "image.png"
        voice_path = tmpdir / "voice.mp3"

        image_data = job_input.get("image")
        audio_data = job_input.get("audio")

        if image_data.startswith("http"):
            await download_file(image_data, image_path)
        else:
            decode_base64_to_file(image_data, image_path)

        if audio_data.startswith("http"):
            await download_file(audio_data, voice_path)
        else:
            decode_base64_to_file(audio_data, voice_path)

        # Optional: download music and ambience
        music_path = None
        if job_input.get("music_url"):
            music_path = tmpdir / "music.mp3"
            await download_file(job_input["music_url"], music_path)

        ambience_path = None
        if job_input.get("ambience_url"):
            ambience_path = tmpdir / "ambience.mp3"
            await download_file(job_input["ambience_url"], ambience_path)

        # Download SFX tracks
        sfx_tracks = []
        for i, sfx in enumerate(job_input.get("sfx_tracks", [])):
            sfx_path = tmpdir / f"sfx_{i}.mp3"
            await download_file(sfx["url"], sfx_path)
            sfx_tracks.append({
                "path": str(sfx_path),
                "start_time": sfx.get("start_time", 0),
                "volume": sfx.get("volume", 0.5)
            })

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 2: Generate lip-synced video
        # ═══════════════════════════════════════════════════════════════════════
        quality = job_input.get("quality", "standard")
        lipsync_output = tmpdir / "lipsync.mp4"
        await run_lipsync(image_path, voice_path, lipsync_output, quality)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 3: Mix audio
        # ═══════════════════════════════════════════════════════════════════════
        mixed_audio_path = tmpdir / "mixed.aac"

        # Get duration from voice
        duration_cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(voice_path)
        ]
        proc = await asyncio.create_subprocess_exec(
            *duration_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        total_duration = float(stdout.decode().strip() or 10)

        ducking_config = job_input.get("ducking_config", {
            "base_volume": 0.15,
            "attack_ms": 50,
            "release_ms": 300
        })

        await mix_audio(
            voice_path,
            music_path,
            ambience_path,
            sfx_tracks,
            mixed_audio_path,
            total_duration,
            ducking_config
        )

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 4: Burn captions
        # ═══════════════════════════════════════════════════════════════════════
        captions = job_input.get("captions", [])
        caption_style = job_input.get("caption_style", {})
        captioned_video = tmpdir / "captioned.mp4"

        if captions:
            await burn_captions(lipsync_output, captions, caption_style, captioned_video)
        else:
            captioned_video = lipsync_output

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 5: Final render
        # ═══════════════════════════════════════════════════════════════════════
        format_spec = job_input.get("format", {
            "width": 1080,
            "height": 1920,
            "fps": 30
        })

        final_output = tmpdir / "final.mp4"
        await final_render(
            captioned_video,
            mixed_audio_path,
            final_output,
            format_spec,
            quality
        )

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 6: Generate thumbnail
        # ═══════════════════════════════════════════════════════════════════════
        thumbnail_path = tmpdir / "thumbnail.jpg"
        thumb_cmd = [
            "ffmpeg", "-y",
            "-i", str(final_output),
            "-ss", "0",
            "-vframes", "1",
            "-q:v", "2",
            str(thumbnail_path)
        ]
        proc = await asyncio.create_subprocess_exec(*thumb_cmd)
        await proc.communicate()

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 7: Upload results
        # ═══════════════════════════════════════════════════════════════════════
        video_url = await upload_to_r2(final_output, f"videos/{job_id}/final.mp4")
        thumbnail_url = await upload_to_r2(thumbnail_path, f"videos/{job_id}/thumbnail.jpg")

        duration_ms = int((time.time() - start) * 1000)

        return JobResult(
            success=True,
            output_urls={
                "video": video_url,
                "thumbnail": thumbnail_url
            },
            metadata={
                "job_id": job_id,
                "quality": quality,
                "duration": total_duration,
                "format": format_spec
            },
            duration_ms=duration_ms
        )

async def handle_persona_build(job_input: Dict[str, Any]) -> JobResult:
    """
    Build persona pack (base takes).

    Input:
    - persona_id: string
    - primary_image: base64 or URL
    - archetype: string
    - takes_to_generate: list of {emotion, angle, intensity}

    Output:
    - base_takes: list of {id, emotion, angle, video_url, thumbnail_url}
    """
    start = time.time()

    persona_id = job_input.get("persona_id")
    archetype = job_input.get("archetype", "sage")
    takes_to_generate = job_input.get("takes_to_generate", [
        {"emotion": "neutral", "angle": "front", "intensity": 0.5},
        {"emotion": "neutral", "angle": "three_quarter", "intensity": 0.5},
        {"emotion": "happy", "angle": "three_quarter", "intensity": 0.7},
    ])

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)

        # Download primary image
        image_path = tmpdir / "primary.png"
        image_data = job_input.get("primary_image")

        if image_data.startswith("http"):
            await download_file(image_data, image_path)
        else:
            decode_base64_to_file(image_data, image_path)

        # Generate base takes
        # In production, this would:
        # 1. Generate a short idle audio (or use silence)
        # 2. Run lip-sync to create a looping idle video
        # 3. Store in persistent persona directory

        base_takes = []
        for i, take_spec in enumerate(takes_to_generate):
            take_id = f"{persona_id}_take_{i}"
            emotion = take_spec.get("emotion", "neutral")
            angle = take_spec.get("angle", "front")

            # Placeholder: create a simple video from image
            take_output = tmpdir / f"take_{i}.mp4"

            # Generate 5-second idle video
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(image_path),
                "-c:v", "libx264",
                "-t", "5",
                "-pix_fmt", "yuv420p",
                "-r", "30",
                str(take_output)
            ]
            proc = await asyncio.create_subprocess_exec(*cmd)
            await proc.communicate()

            # Upload
            video_url = await upload_to_r2(
                take_output,
                f"personas/{persona_id}/takes/{take_id}.mp4"
            )

            base_takes.append({
                "id": take_id,
                "emotion": emotion,
                "angle": angle,
                "intensity": take_spec.get("intensity", 0.5),
                "video_url": video_url,
                "duration": 5
            })

        duration_ms = int((time.time() - start) * 1000)

        return JobResult(
            success=True,
            output_urls={},
            metadata={
                "persona_id": persona_id,
                "archetype": archetype,
                "base_takes": base_takes
            },
            duration_ms=duration_ms
        )

# ═══════════════════════════════════════════════════════════════════════════════════
# MAIN HANDLER
# ═══════════════════════════════════════════════════════════════════════════════════

async def handler(job: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main RunPod handler.

    Routes to the appropriate job handler based on job_type.
    """
    job_input = job.get("input", {})
    job_type = job_input.get("job_type", JobType.LIPSYNC_ONLY)

    print(f"[Studio] Received job: {job_type}")
    print(f"[Studio] Input keys: {list(job_input.keys())}")

    try:
        if job_type == JobType.LIPSYNC_ONLY or job_type == "lipsync_only":
            result = await handle_lipsync_only(job_input)
        elif job_type == JobType.VIDEO_RENDER or job_type == "video_render":
            result = await handle_video_render(job_input)
        elif job_type == JobType.PERSONA_BUILD or job_type == "persona_build":
            result = await handle_persona_build(job_input)
        else:
            raise ValueError(f"Unknown job type: {job_type}")

        return {
            "success": result.success,
            "output": result.output_urls,
            "metadata": result.metadata,
            "duration_ms": result.duration_ms
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

# ═══════════════════════════════════════════════════════════════════════════════════
# RUNPOD ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════════

# Load models on startup (warm start)
load_models()

# Start the RunPod serverless handler
runpod.serverless.start({
    "handler": handler
})
