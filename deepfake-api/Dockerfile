# RealityScan Deepfake API - EfficientNet B7
# Para RunPod ou Cloud Run com GPU
FROM nvidia/cuda:11.8-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip git wget \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone dfdc_deepfake_challenge
RUN git clone --depth 1 https://github.com/selimsef/dfdc_deepfake_challenge.git /app/dfdc_deepfake_challenge

# Pesos (1 modelo para menor imagem)
RUN mkdir -p /app/weights && cd /app/weights && \
    wget -q -O final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36 \
    https://github.com/selimsef/dfdc_deepfake_challenge/releases/download/0.0.1/final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36

# Deps Python
RUN pip install --no-cache-dir fastapi uvicorn python-multipart \
    torch torchvision --index-url https://download.pytorch.org/whl/cu118 && \
    pip install --no-cache-dir opencv-python-headless numpy Pillow albumentations facenet-pytorch timm pandas

ENV DFDCDIR=/app/dfdc_deepfake_challenge
ENV WEIGHTS_DIR=/app/weights
ENV PYTHONPATH=/app/dfdc_deepfake_challenge

COPY app.py .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
