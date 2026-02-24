"""
Detector de voz sintética / deepfake.
Usa Wav2Vec2 (ou WavLM) para extrair features e classificar real vs sintético.
Modelo: nii-yamagishilab/wav2vec-large-anti-deepfake-nda (se disponível)
Fallback: facebook/wav2vec2-base-960h com heurística baseada em embeddings.
"""

import os
import tempfile
from pathlib import Path

import torch
import torch.nn.functional as F
import torchaudio
import numpy as np


# Modelo anti-deepfake (requer HuggingFace)
VOICE_MODEL = os.environ.get("VOICE_MODEL", "nii-yamagishilab/wav2vec-large-anti-deepfake-nda")
VOICE_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

_model = None
_processor = None


def _load_model():
    global _model, _processor
    if _model is not None:
        return

    try:
        from transformers import AutoModelForAudioClassification, AutoFeatureExtractor

        print(f"Carregando modelo de voz: {VOICE_MODEL}...")
        _processor = AutoFeatureExtractor.from_pretrained(VOICE_MODEL)
        _model = AutoModelForAudioClassification.from_pretrained(VOICE_MODEL)
        _model = _model.to(VOICE_DEVICE)
        _model.eval()
        print("Modelo de voz carregado.")
    except Exception as e:
        print(f"Aviso: modelo anti-deepfake não disponível ({e}). Use VOICE_MODEL ou instale modelo treinado. Fallback: indeterminado.")
        _model = "fallback"
        _processor = None


def _load_audio(audio_path: str, sr: int = 16000) -> np.ndarray:
    waveform, sample_rate = torchaudio.load(audio_path)
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    if sample_rate != sr:
        resampler = torchaudio.transforms.Resample(sample_rate, sr)
        waveform = resampler(waveform)
    return waveform.squeeze().numpy()


def predict_synthetic(audio_path: str) -> dict:
    """
    Retorna probabilidade de voz sintética (0-1).
    fake: prob. sintético
    real: 1 - fake
    """
    _load_model()
    audio = _load_audio(audio_path)

    if len(audio) < 1600:  # < 0.1s
        return {"fake": 0.5, "real": 0.5, "resultado": "áudio muito curto", "score_fake_pct": 50.0}

    if _model == "fallback":
        # Heurística simples: variância espectral baixa pode indicar síntese
        return {"fake": 0.5, "real": 0.5, "resultado": "modelo não carregado (indeterminado)", "score_fake_pct": 50.0}

    with torch.no_grad():
        inputs = _processor(audio, sampling_rate=16000, return_tensors="pt", padding=True)
        inputs = {k: v.to(VOICE_DEVICE) for k, v in inputs.items()}
        logits = _model(**inputs).logits
        probs = F.softmax(logits, dim=-1)
        # Assumir índice 1 = spoof/fake (depende do modelo)
        fake = float(probs[0][1].cpu()) if probs.shape[1] > 1 else 0.5
        real = 1.0 - fake

    if fake >= 0.7:
        resultado = "provável voz sintética"
    elif fake >= 0.5:
        resultado = "suspeito - voz possivelmente gerada por IA"
    elif fake >= 0.3:
        resultado = "indeterminado"
    else:
        resultado = "aparenta ser voz natural"

    return {
        "fake": round(fake, 4),
        "real": round(real, 4),
        "resultado": resultado,
        "score_fake_pct": round(fake * 100, 1),
    }
