"""
RealityScan Voice API - Detector de voz sintética (wav2vec / WavLM).
Roda no mesmo servidor GPU do deepfake API.
Endpoints: /analisar-audio (voz), /analisar-lipsync (SyncNet - opcional).
"""

import base64
import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np

from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware

from voice_detector import predict_synthetic

app = FastAPI(title="RealityScan Voice API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SYNCNET_DIR = os.environ.get("SYNCNET_DIR", "/app/syncnet_python")


def _ensure_wav(audio_path: str, content: bytes, suffix: str) -> str:
    """Converte áudio para WAV 16kHz se necessário."""
    if suffix.lower() in (".wav",):
        with open(audio_path, "wb") as f:
            f.write(content)
        return audio_path
    # Converter com ffmpeg
    out_path = audio_path + ".wav"
    with open(audio_path, "wb") as f:
        f.write(content)
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", audio_path, "-ac", "1", "-ar", "16000", out_path],
        capture_output=True,
        timeout=30,
    )
    if r.returncode != 0:
        raise ValueError("Áudio inválido ou formato não suportado.")
    return out_path


@app.get("/health")
def health():
    return {"status": "ok", "voice": "ready"}


@app.post("/analisar-audio")
async def analisar_audio(audio: UploadFile = File(...)):
    """
    Analisa áudio para detectar voz sintética/IA.
    Aceita: wav, mp3, webm, ogg, flac.
    """
    if not audio.content_type or not (
        audio.content_type.startswith("audio/") or "video" in audio.content_type  # webm pode ter áudio
    ):
        if "webm" not in (audio.filename or "").lower():
            raise HTTPException(400, "Envie um arquivo de áudio (wav, mp3, webm, etc).")

    content = await audio.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(400, "Áudio muito grande. Máximo 50MB.")

    ext = Path(audio.filename or "audio.wav").suffix or ".wav"
    if "webm" in (audio.filename or "").lower():
        ext = ".webm"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
            f.write(content)
            tmp_path = f.name

        wav_path = _ensure_wav(tmp_path, content, ext)
        result = predict_synthetic(wav_path)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro na análise de voz: {str(e)}")
    finally:
        for p in (tmp_path, (tmp_path + ".wav") if tmp_path else None):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


@app.post("/analisar-audio-base64")
async def analisar_audio_base64(body: dict = Body(...)):
    """
    Recebe áudio em base64 (Sentry com compartilhamento de áudio).
    body: { "audio": "data:audio/webm;base64,..." }
    """
    audio_b64 = body.get("audio")
    if not audio_b64 or not isinstance(audio_b64, str):
        raise HTTPException(400, "Campo 'audio' obrigatório (data URL ou base64).")

    if "base64," in audio_b64:
        audio_b64 = audio_b64.split("base64,", 1)[1]
    raw = base64.b64decode(audio_b64)
    if len(raw) < 1000:
        raise HTTPException(400, "Áudio muito curto.")

    ext = ".webm"  # Sentry grava webm
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
            f.write(raw)
            tmp_path = f.name
        wav_path = _ensure_wav(tmp_path, raw, ext)
        result = predict_synthetic(wav_path)
        return result
    except Exception as e:
        raise HTTPException(500, f"Erro na análise de voz: {str(e)}")
    finally:
        for p in (tmp_path, (tmp_path + ".wav") if tmp_path else None):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


def _run_syncnet(video_path: str) -> dict:
    """Executa SyncNet no vídeo. Retorna { lip_sync_ok, confidence, distance }."""
    if not os.path.exists(os.path.join(SYNCNET_DIR, "run_syncnet.py")):
        return {"lip_sync_ok": None, "confidence": None, "distance": None, "resultado": "SyncNet não instalado"}

    ref = "sentry"
    data_dir = tempfile.mkdtemp()
    try:
        # run_pipeline extrai faces e crops
        r1 = subprocess.run(
            ["python", "run_pipeline.py", "--videofile", video_path, "--reference", ref, "--data_dir", data_dir],
            cwd=SYNCNET_DIR,
            capture_output=True,
            timeout=120,
        )
        if r1.returncode != 0:
            return {"lip_sync_ok": None, "confidence": None, "distance": None, "resultado": "SyncNet pipeline falhou"}

        r2 = subprocess.run(
            ["python", "run_syncnet.py", "--videofile", video_path, "--reference", ref, "--data_dir", data_dir],
            cwd=SYNCNET_DIR,
            capture_output=True,
            timeout=60,
        )
        if r2.returncode != 0:
            return {"lip_sync_ok": None, "confidence": None, "distance": None, "resultado": "SyncNet falhou"}

        # Ler activesd.pckl com distâncias (baixo = bom sync)
        import pickle
        pckl = os.path.join(data_dir, "pywork", ref, "activesd.pckl")
        if os.path.exists(pckl):
            with open(pckl, "rb") as f:
                dists = pickle.load(f)
            avg_dist = float(np.mean(dists)) if dists else 0.5
            # Distância típica: < 0.3 = bom sync, > 0.5 = suspeito
            lip_sync_ok = avg_dist < 0.4
            return {
                "lip_sync_ok": lip_sync_ok,
                "confidence": 1.0 - min(avg_dist, 1.0),
                "distance": round(avg_dist, 4),
                "resultado": "boca sincronizada" if lip_sync_ok else "boca possivelmente dessincronizada (suspeito)",
            }
    except Exception as e:
        return {"lip_sync_ok": None, "confidence": None, "distance": None, "resultado": str(e)}
    finally:
        import shutil
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir, ignore_errors=True)


@app.post("/analisar-lipsync")
async def analisar_lipsync(video: UploadFile = File(...)):
    """
    Analisa se a boca está sincronizada com o áudio (SyncNet).
    Aceita vídeo com áudio (mp4, webm).
    """
    content = await video.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(400, "Vídeo muito grande. Máximo 100MB.")

    ext = ".mp4"
    if "webm" in (video.filename or "").lower():
        ext = ".webm"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
            f.write(content)
            tmp_path = f.name
        return _run_syncnet(tmp_path)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
