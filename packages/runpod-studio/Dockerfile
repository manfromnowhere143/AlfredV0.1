# ═══════════════════════════════════════════════════════════════════════════════════
# PERSONAFORGE STUDIO POD - Docker Image
# ═══════════════════════════════════════════════════════════════════════════════════
#
# Build: docker build -t personaforge-studio .
# Push:  docker push your-registry/personaforge-studio:latest
#
# GPU: Requires L40S (48GB) or A40 (48GB) or H100 (80GB)
# ═══════════════════════════════════════════════════════════════════════════════════

FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Hugging Face cache (uses network volume)
ENV HF_HOME=/workspace/cache/hf
ENV TORCH_HOME=/workspace/cache/torch
ENV TRANSFORMERS_CACHE=/workspace/cache/transformers

# ═══════════════════════════════════════════════════════════════════════════════════
# SYSTEM DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════════

RUN apt-get update && apt-get install -y \
    # ffmpeg (critical for video processing)
    ffmpeg \
    # Additional video tools
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    # Image processing
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # Build tools
    build-essential \
    cmake \
    ninja-build \
    # Utilities
    curl \
    wget \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# ═══════════════════════════════════════════════════════════════════════════════════
# PYTHON DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════════

WORKDIR /app

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ═══════════════════════════════════════════════════════════════════════════════════
# INSTALL VIDEO/LIP-SYNC MODELS
# ═══════════════════════════════════════════════════════════════════════════════════

# Install LatentSync dependencies
# Note: The actual model weights are downloaded to network volume on first run
RUN pip install --no-cache-dir \
    einops \
    omegaconf \
    av \
    decord \
    mediapipe

# Install face restoration (GFPGAN, Real-ESRGAN)
RUN pip install --no-cache-dir \
    basicsr \
    facexlib \
    gfpgan \
    realesrgan

# ═══════════════════════════════════════════════════════════════════════════════════
# COPY APPLICATION CODE
# ═══════════════════════════════════════════════════════════════════════════════════

COPY handler.py .
COPY download_models.py .

# Create workspace directories (will be overlaid by network volume)
RUN mkdir -p /workspace/models/video \
    /workspace/models/upscalers \
    /workspace/cache/hf \
    /workspace/cache/torch \
    /workspace/personas \
    /workspace/jobs \
    /workspace/outputs

# ═══════════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK & ENTRY
# ═══════════════════════════════════════════════════════════════════════════════════

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start handler
CMD ["python", "-u", "handler.py"]
