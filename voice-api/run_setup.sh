#!/bin/bash
# Setup Voice API - detector de voz sintética + SyncNet
# Roda no mesmo servidor GPU do deepfake API

set -e

echo "🐍 Instalando dependências de voz..."
pip install -q -r requirements.txt

echo "📦 Modelo Wav2Vec (HuggingFace)..."
# Baixa ao primeiro uso; ou especifique VOICE_MODEL
# nii-yamagishilab/wav2vec-large-anti-deepfake-nda (requer login)
# fallback: facebook/wav2vec2-base-960h
export VOICE_MODEL="${VOICE_MODEL:-facebook/wav2vec2-base-960h}"
python -c "
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import os
m = os.environ.get('VOICE_MODEL', 'facebook/wav2vec2-base-960h')
Wav2Vec2FeatureExtractor.from_pretrained(m)
print('Processor OK')
" 2>/dev/null || echo "Modelo será baixado no primeiro uso."

echo "📦 SyncNet (opcional - lip-sync)..."
SYNCNET_DIR="${SYNCNET_DIR:-/app/syncnet_python}"
if [ ! -d "$SYNCNET_DIR" ]; then
  git clone --depth 1 https://github.com/joonson/syncnet_python.git "$SYNCNET_DIR"
  cd "$SYNCNET_DIR" && bash download_model.sh 2>/dev/null || true && cd -
fi

echo "✅ Voice API pronta. Inicie: PORT=8001 python app.py"
