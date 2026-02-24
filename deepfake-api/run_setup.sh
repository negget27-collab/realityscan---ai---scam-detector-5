#!/bin/bash
# Setup do ambiente Deepfake API para RunPod / servidor GPU
# Executar UMA VEZ após criar o pod

set -e

echo "📦 Clonando dfdc_deepfake_challenge..."
DFDC_DIR="${DFDC_DIR:-/app/dfdc_deepfake_challenge}"
mkdir -p /app
if [ ! -d "$DFDC_DIR" ]; then
  git clone --depth 1 https://github.com/selimsef/dfdc_deepfake_challenge.git "$DFDC_DIR"
fi

echo "📥 Baixando pesos EfficientNet B7..."
WEIGHTS_DIR="${WEIGHTS_DIR:-/app/weights}"
mkdir -p "$WEIGHTS_DIR"
cd "$WEIGHTS_DIR"
tag=0.0.1
for name in final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36; do
  [ -f "$name" ] && continue
  wget -q -O "$name" "https://github.com/selimsef/dfdc_deepfake_challenge/releases/download/$tag/$name" || true
done
cd -

echo "🐍 Instalando dependências Python..."
pip install -q fastapi uvicorn python-multipart
pip install -q -r "$DFDC_DIR/requirements.txt" 2>/dev/null || pip install torch torchvision opencv-python-headless numpy Pillow albumentations facenet-pytorch timm pandas

echo "📦 Instalando voz (wav2vec2) e lip-sync..."
pip install -q transformers torchaudio librosa soundfile scenedetect scipy 2>/dev/null || true

echo "📦 ffmpeg (necessário para lip-sync)..."
command -v ffmpeg >/dev/null 2>&1 || (sudo apt-get update -qq && sudo apt-get install -y ffmpeg 2>/dev/null) || echo "   Instale ffmpeg manualmente: sudo apt-get install ffmpeg"

echo "📦 Clone SyncNet (opcional, para lip-sync)..."
SYNCNET_DIR="${SYNCNET_DIR:-/app/syncnet_python}"
if [ ! -d "$SYNCNET_DIR" ]; then
  git clone --depth 1 https://github.com/joonson/syncnet_python.git "$SYNCNET_DIR" 2>/dev/null || true
  [ -f "$SYNCNET_DIR/download_model.sh" ] && bash "$SYNCNET_DIR/download_model.sh" 2>/dev/null || true
fi

echo "✅ Setup concluído. Inicie com: python app.py"
echo "   ou: DFDCDIR=$DFDC_DIR WEIGHTS_DIR=$WEIGHTS_DIR uvicorn app:app --host 0.0.0.0 --port 8000"
