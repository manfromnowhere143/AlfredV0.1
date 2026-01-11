"""
═══════════════════════════════════════════════════════════════════════════════════
MODEL DOWNLOADER - Pre-download models to Network Volume
═══════════════════════════════════════════════════════════════════════════════════

Run this ONCE after attaching your network volume to download all models.
This ensures fast startup (no cold start delays).

Usage:
    python download_models.py --all
    python download_models.py --lipsync
    python download_models.py --upscalers
    python download_models.py --diffusion

═══════════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import argparse
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download
from tqdm import tqdm

# Paths
WORKSPACE = Path(os.getenv("WORKSPACE", "/workspace"))
MODELS_DIR = WORKSPACE / "models"

# Model configurations
MODELS = {
    "lipsync": {
        "latentsync": {
            "repo_id": "ByteDance/LatentSync",
            "local_dir": MODELS_DIR / "video" / "latentsync",
            "files": None,  # Download entire repo
        },
        "musetalk": {
            "repo_id": "TMElyralab/MuseTalk",
            "local_dir": MODELS_DIR / "video" / "musetalk",
            "files": None,
        },
        "wav2lip": {
            "repo_id": "numz/wav2lip_studio",
            "local_dir": MODELS_DIR / "video" / "wav2lip",
            "files": ["wav2lip_gan.pth", "wav2lip.pth"],
        },
    },
    "upscalers": {
        "realesrgan": {
            "repo_id": "sberbank-ai/Real-ESRGAN",
            "local_dir": MODELS_DIR / "upscalers" / "realesrgan",
            "files": ["RealESRGAN_x4plus.pth", "RealESRGAN_x4plus_anime_6B.pth"],
        },
        "gfpgan": {
            "repo_id": "TencentARC/GFPGAN",
            "local_dir": MODELS_DIR / "upscalers" / "gfpgan",
            "files": ["GFPGANv1.4.pth"],
        },
    },
    "diffusion": {
        # Add your image generation models here
        "sdxl": {
            "repo_id": "stabilityai/stable-diffusion-xl-base-1.0",
            "local_dir": MODELS_DIR / "diffusion" / "sdxl",
            "files": None,  # Download entire repo
        },
    },
    "face": {
        "face_detection": {
            "repo_id": "ybelkada/face-parse-bisent",
            "local_dir": MODELS_DIR / "face" / "detection",
            "files": None,
        },
    },
}


def download_model(category: str, name: str, config: dict):
    """Download a single model."""
    print(f"\n{'='*60}")
    print(f"Downloading: {category}/{name}")
    print(f"From: {config['repo_id']}")
    print(f"To: {config['local_dir']}")
    print(f"{'='*60}")

    local_dir = config["local_dir"]
    local_dir.mkdir(parents=True, exist_ok=True)

    try:
        if config.get("files"):
            # Download specific files
            for filename in tqdm(config["files"], desc="Files"):
                hf_hub_download(
                    repo_id=config["repo_id"],
                    filename=filename,
                    local_dir=str(local_dir),
                    local_dir_use_symlinks=False,
                )
        else:
            # Download entire repo
            snapshot_download(
                repo_id=config["repo_id"],
                local_dir=str(local_dir),
                local_dir_use_symlinks=False,
            )
        print(f"✅ {name} downloaded successfully")
    except Exception as e:
        print(f"❌ Failed to download {name}: {e}")


def download_category(category: str):
    """Download all models in a category."""
    if category not in MODELS:
        print(f"Unknown category: {category}")
        return

    for name, config in MODELS[category].items():
        download_model(category, name, config)


def download_all():
    """Download all models."""
    for category in MODELS:
        download_category(category)


def download_external_models():
    """
    Download models from external sources (not on HuggingFace).
    """
    import urllib.request

    # face_alignment models
    print("\n" + "="*60)
    print("Downloading face_alignment models...")
    print("="*60)

    # These are downloaded automatically by face_alignment on first use
    # Just trigger the download
    try:
        import face_alignment
        fa = face_alignment.FaceAlignment(
            face_alignment.LandmarksType.TWO_D,
            device="cpu"  # Use CPU for download only
        )
        del fa
        print("✅ face_alignment models ready")
    except Exception as e:
        print(f"⚠️ face_alignment will download on first use: {e}")


def verify_models():
    """Verify all models are present."""
    print("\n" + "="*60)
    print("VERIFYING MODELS")
    print("="*60)

    all_good = True

    for category, models in MODELS.items():
        print(f"\n{category.upper()}:")
        for name, config in models.items():
            local_dir = config["local_dir"]
            if local_dir.exists() and any(local_dir.iterdir()):
                print(f"  ✅ {name}")
            else:
                print(f"  ❌ {name} - MISSING")
                all_good = False

    return all_good


def main():
    parser = argparse.ArgumentParser(description="Download models for PersonaForge Studio")
    parser.add_argument("--all", action="store_true", help="Download all models")
    parser.add_argument("--lipsync", action="store_true", help="Download lip-sync models")
    parser.add_argument("--upscalers", action="store_true", help="Download upscaler models")
    parser.add_argument("--diffusion", action="store_true", help="Download diffusion models")
    parser.add_argument("--face", action="store_true", help="Download face models")
    parser.add_argument("--external", action="store_true", help="Download external models")
    parser.add_argument("--verify", action="store_true", help="Verify models are present")

    args = parser.parse_args()

    # If no args, show help
    if len(sys.argv) == 1:
        parser.print_help()
        return

    if args.verify:
        success = verify_models()
        sys.exit(0 if success else 1)

    if args.all:
        download_all()
        download_external_models()
    else:
        if args.lipsync:
            download_category("lipsync")
        if args.upscalers:
            download_category("upscalers")
        if args.diffusion:
            download_category("diffusion")
        if args.face:
            download_category("face")
        if args.external:
            download_external_models()

    print("\n" + "="*60)
    print("DOWNLOAD COMPLETE")
    print("="*60)
    verify_models()


if __name__ == "__main__":
    main()
