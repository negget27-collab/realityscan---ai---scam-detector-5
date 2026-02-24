"""
Detector de voz sintética / deepfake de áudio.
wav2vec2 + modelo anti-deepfake (HuggingFace).
"""

import tempfile
from pathlib import Path

# Lazy load para não travar startup se deps não estiverem
_voice_model = None
_processor = None


def _ensure_voice_model():
    global _voice_model, _processor
    if _voice_model is not None:
        return _voice_model, _processor
    try:
        from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
        import torch
        model_name = "alexandreacff/wav2vec2-large-ft-fake-detection"
        try:
            _voice_model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)
            _processor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
        except Exception:
            model_name = "facebook/wav2vec2-base-960h"
            _voice_model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name, num_labels=2)
            _processor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
        _voice_model.eval()
        if torch.cuda.is_available():
            _voice_model = _voice_model.cuda()
        return _voice_model, _processor
    except ImportError:
        return None, None


def analyze_audio_synthetic(audio_path: str) -> dict:
    """
    Analisa áudio e retorna probabilidade de ser sintético/fake.
    Returns: { "synthetic": float 0-1, "real": float, "resultado": str }
    """
    import librosa
    import torch

    model, processor = _ensure_voice_model()
    if model is None or processor is None:
        return {"synthetic": 0.5, "real": 0.5, "resultado": "módulo de voz não disponível", "score_synthetic_pct": 50}

    try:
        audio, sr = librosa.load(audio_path, sr=16000, mono=True, duration=30)
        if len(audio) < 1600:
            return {"synthetic": 0.5, "real": 0.5, "resultado": "áudio muito curto", "score_synthetic_pct": 50}

        inputs = processor(audio, sampling_rate=16000, return_tensors="pt", padding=True, truncation=True, max_length=16000*30)
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]

        synthetic = float(probs[1]) if len(probs) > 1 else float(probs[0])
        real = 1.0 - synthetic

        if synthetic >= 0.7:
            resultado = "voz provavelmente sintética/IA"
        elif synthetic >= 0.5:
            resultado = "suspeito de voz sintética"
        elif synthetic >= 0.3:
            resultado = "indeterminado"
        else:
            resultado = "voz aparenta ser real"

        return {
            "synthetic": round(synthetic, 4),
            "real": round(real, 4),
            "resultado": resultado,
            "score_synthetic_pct": round(synthetic * 100, 1),
        }
    except Exception as e:
        return {"synthetic": 0.5, "real": 0.5, "resultado": f"erro: {str(e)}", "score_synthetic_pct": 50}
