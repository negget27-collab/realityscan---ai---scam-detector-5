"""
Módulo de detecção de voz sintética / deepfake para RealityScan.
wav2vec2 + modelo anti-deepfake (HuggingFace).
Roda no mesmo servidor GPU do deepfake.
"""

import os
import tempfile
from typing import Optional

# Lazy load
_voice_model = None
_processor = None


def _load_voice_model():
    """Carrega wav2vec2 anti-deepfake. Modelo: nii-yamagishilab ou facebook/wav2vec2-base."""
    global _voice_model, _processor
    if _voice_model is not None:
        return

    try:
        from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
        import torch
    except ImportError:
        raise RuntimeError("Instale: pip install transformers torchaudio")

    # Modelo anti-deepfake (se disponível) ou wav2vec base para análise
    model_name = os.environ.get("VOICE_MODEL", "facebook/wav2vec2-base-960h")
    # Alternativa treinada em deepfake: nii-yamagishilab/wav2vec-large-anti-deepfake-nda (requer NDA)
    # Usamos wav2vec-base como base; fine-tune ou outro modelo pode ser configurado

    _processor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
    try:
        _voice_model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)
    except Exception:
        _voice_model = Wav2Vec2ForSequenceClassification.from_pretrained(
            "facebook/wav2vec2-base-960h",
            num_labels=2,
        )
    _voice_model.eval()
    if hasattr(_voice_model, "to"):
        _voice_model = _voice_model.to("cuda" if __import__("torch").cuda.is_available() else "cpu")


def analyze_audio(audio_path: str) -> dict:
    """
    Analisa áudio com wav2vec2.
    Retorna: { synthetic_prob: float, real_prob: float, result: str }
    """
    import torch
    import librosa

    _load_voice_model()
    audio, sr = librosa.load(audio_path, sr=16000, mono=True)
    if len(audio) < 1600:  # < 0.1s
        return {"synthetic_prob": 0.5, "real_prob": 0.5, "result": "áudio muito curto"}

    inputs = _processor(audio, sampling_rate=16000, return_tensors="pt", padding=True)
    device = next(_voice_model.parameters()).device
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = _voice_model(**inputs).logits
    probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]

    # Assume: índice 0 = real, 1 = synthetic (ajustar conforme modelo)
    real_prob = float(probs[0])
    synthetic_prob = float(probs[1]) if len(probs) > 1 else 1.0 - real_prob

    if synthetic_prob >= 0.7:
        result = "provável voz sintética"
    elif synthetic_prob >= 0.5:
        result = "suspeito"
    else:
        result = "aparenta voz real"

    return {
        "synthetic_prob": round(synthetic_prob, 4),
        "real_prob": round(real_prob, 4),
        "result": result,
        "score_synthetic_pct": round(synthetic_prob * 100, 1),
    }
