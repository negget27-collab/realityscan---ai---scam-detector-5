#!/bin/bash
# Setup Voice API + SyncNet - mesmo servidor GPU do deepfake
set -e

echo "📦 Instalando deps de voz..."
pip install transformers torchaudio librosa soundfile

echo "📥 SyncNet (opcional)..."
SYNCDIR="${SYNCNET_DIR:-/app/syncnet_python}"
mkdir -p /app
if [ ! -d "$SYNCDIR" ]; then
  git clone --depth 1 https://github.com/joonson/syncnet_python.git "$SYNCDIR"
  cd "$SYNCDIR" && bash download_model.sh 2>/dev/null || true && cd -
fi

echo "✅ Voice API pronta. Inicie: python app.py (porta 8001)"
