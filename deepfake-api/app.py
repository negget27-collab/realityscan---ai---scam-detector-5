"""
RealityScan Deepfake API - EfficientNet B7 (selimsef/dfdc_deepfake_challenge)
Serviço para rodar em RunPod ou Cloud Run com GPU.
Suporta: vídeo (upload) e frames base64 (Sentry Mini HUD).
"""
import os

# Força CPU antes de importar torch (ex.: RunPod com GPU sm_120 não suportada pelo PyTorch)
if os.environ.get("FORCE_CPU"):
    os.environ["CUDA_VISIBLE_DEVICES"] = ""

import base64
import re
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
import torch
torch.set_default_device("cpu")
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware

# Importa após clone do dfdc_deepfake_challenge em DFDCDIR
DFDCDIR = os.environ.get("DFDC_DIR", "/app/dfdc_deepfake_challenge")
sys_path = os.environ.get("PYTHONPATH", "")
if DFDCDIR not in sys_path:
    os.environ["PYTHONPATH"] = f"{DFDCDIR}:{sys_path}"

app = FastAPI(title="RealityScan Deepfake API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Modelos carregados uma vez no startup
models = []
# GPU ou CPU: só usa CUDA se houver pelo menos uma GPU (evita "No CUDA GPUs are available")
def _resolve_device():
    if os.environ.get("FORCE_CPU"):
        return "cpu"
    dev = os.environ.get("DEVICE", "").strip().lower()
    if dev in ("cpu", "cuda"):
        return dev
    if torch.cuda.is_available() and torch.cuda.device_count() > 0:
        return "cuda"
    return "cpu"

DEVICE = _resolve_device()
WEIGHTS_DIR = os.environ.get("WEIGHTS_DIR", "/app/weights")
MODEL_FILES = os.environ.get("MODEL_FILES", "final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36").split(",")


def load_models():
    """Carrega EfficientNet B7 do selimsef/dfdc_deepfake_challenge."""
    global models, DEVICE
    if models:
        return

    # Garante dispositivo válido (CPU se não houver GPU disponível)
    DEVICE = _resolve_device()
    if DEVICE != "cuda":
        print(f"ℹ️ Usando dispositivo: {DEVICE} (inferência mais lenta que GPU).")

    sys.path.insert(0, DFDCDIR)
    from kernel_utils import VideoReader, FaceExtractor, confident_strategy
    from training.zoo.classifiers import DeepFakeClassifier

    weights_path = Path(WEIGHTS_DIR)
    if not weights_path.exists():
        raise RuntimeError(f"WEIGHTS_DIR não encontrado: {WEIGHTS_DIR}. Execute run_setup.sh primeiro.")

    use_half = DEVICE == "cuda"
    for fname in MODEL_FILES:
        fpath = weights_path / fname.strip()
        if not fpath.exists():
            print(f"⚠️ Peso não encontrado: {fpath}, pulando.")
            continue
        try:
            model = DeepFakeClassifier(encoder="tf_efficientnet_b7_ns").to(DEVICE)
            ckpt = torch.load(fpath, map_location="cpu", weights_only=True)
            state = ckpt.get("state_dict", ckpt)
            model.load_state_dict({re.sub(r"^module\.", "", k): v for k, v in state.items()}, strict=True)
            model.eval()
            if use_half:
                model = model.half()
            models.append(model)
            del ckpt
        except RuntimeError as e:
            err_msg = str(e).lower()
            if "cuda" in DEVICE and ("no kernel image" in err_msg or "cuda" in err_msg or "no cuda gpus" in err_msg):
                print(f"⚠️ GPU indisponível ({e}). Usando CPU (inferência mais lenta).")
                DEVICE = "cpu"
                use_half = False
                model = DeepFakeClassifier(encoder="tf_efficientnet_b7_ns").to("cpu")
                ckpt = torch.load(fpath, map_location="cpu", weights_only=True)
                state = ckpt.get("state_dict", ckpt)
                model.load_state_dict({re.sub(r"^module\.", "", k): v for k, v in state.items()}, strict=True)
                model.eval()
                models.append(model)
                del ckpt
            else:
                raise

    if not models:
        raise RuntimeError("Nenhum modelo carregado. Verifique WEIGHTS_DIR e MODEL_FILES.")


def predict_video(video_path: str) -> float:
    """Retorna probabilidade de fake (0-1) para um vídeo."""
    # Quando rodamos em CPU, o dfdc_deepfake_challenge ainda chama .cuda() internamente.
    # Patch para .cuda() não falhar ("No CUDA GPUs are available").
    _patched = False
    if DEVICE == "cpu":
        _orig_cuda_available = torch.cuda.is_available
        _orig_tensor_cuda = torch.Tensor.cuda
        _orig_module_cuda = torch.nn.Module.cuda
        torch.cuda.is_available = lambda: False
        def _tensor_cuda_noop(self, device=None):
            return self.to("cpu")
        def _module_cuda_noop(self, device=None):
            return self.to("cpu")
        torch.Tensor.cuda = _tensor_cuda_noop
        torch.nn.Module.cuda = _module_cuda_noop
        _patched = True
    try:
        if DFDCDIR not in sys.path:
            sys.path.insert(0, DFDCDIR)
        from kernel_utils import (
            VideoReader,
            FaceExtractor,
            confident_strategy,
            predict_on_video,
        )

        frames_per_video = 32
        video_reader = VideoReader()
        video_read_fn = lambda x: video_reader.read_frames(x, num_frames=frames_per_video)
        face_extractor = FaceExtractor(video_read_fn)
        input_size = 380

        pred = predict_on_video(
            face_extractor=face_extractor,
            video_path=video_path,
            batch_size=frames_per_video,
            input_size=input_size,
            models=models,
            strategy=confident_strategy,
            apply_compression=False,
        )
        return float(pred)
    finally:
        if _patched:
            torch.cuda.is_available = _orig_cuda_available
            torch.Tensor.cuda = _orig_tensor_cuda
            torch.nn.Module.cuda = _orig_module_cuda


@app.on_event("startup")
def startup():
    load_models()
    print(f"✅ RealityScan Deepfake API pronta. Modelos EfficientNet B7 carregados ({DEVICE.upper()}).")


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": len(models)}


@app.post("/analisar")
async def analisar(video: UploadFile = File(...)):
    """
    Recebe vídeo (mp4, webm, etc) e retorna score de deepfake.
    fake: 0-1 (probabilidade de ser fake)
    real: 1 - fake
    resultado: descrição em português
    """
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(400, "Envie um arquivo de vídeo (mp4, webm, etc).")

    ext = ".mp4"
    if ".webm" in (video.filename or "").lower():
        ext = ".webm"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
            content = await video.read()
            if len(content) > 200 * 1024 * 1024:  # 200MB
                raise HTTPException(400, "Vídeo muito grande. Máximo 200MB.")
            f.write(content)
            tmp_path = f.name

        fake = predict_video(tmp_path)
        real = 1.0 - fake

        if fake >= 0.7:
            resultado = "provável deepfake"
        elif fake >= 0.5:
            resultado = "suspeito - recomenda-se validação"
        elif fake >= 0.3:
            resultado = "indeterminado"
        else:
            resultado = "aparenta ser conteúdo real"

        return {
            "fake": round(fake, 4),
            "real": round(real, 4),
            "resultado": resultado,
            "score_fake_pct": round(fake * 100, 1),
        }
    except Exception as e:
        raise HTTPException(500, f"Erro na análise: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


def _resultado_from_fake(fake: float) -> str:
    if fake >= 0.7:
        return "provável deepfake"
    if fake >= 0.5:
        return "suspeito - recomenda-se validação"
    if fake >= 0.3:
        return "indeterminado"
    return "aparenta ser conteúdo real"


def _frames_to_video(frames_b64: list) -> str:
    """Converte frames base64 em arquivo de vídeo temporário. Retorna path."""
    if not frames_b64 or len(frames_b64) > 32:
        raise ValueError("Envie entre 1 e 32 frames.")
    decoded = []
    for i, s in enumerate(frames_b64):
        if not s or not isinstance(s, str):
            continue
        if "base64," in s:
            s = s.split("base64,", 1)[1]
        raw = base64.b64decode(s)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is not None:
            decoded.append(img)
    if not decoded:
        raise ValueError("Nenhum frame válido.")
    h, w = decoded[0].shape[:2]
    out = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    out.close()
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(out.name, fourcc, 2.0, (w, h))
    for img in decoded:
        writer.write(img)
    writer.release()
    return out.name


def _save_audio_from_base64(audio_b64: str) -> str:
    """Salva áudio base64 em arquivo temporário. Retorna path."""
    orig = audio_b64
    if "base64," in str(audio_b64):
        audio_b64 = audio_b64.split("base64,", 1)[1]
    raw = base64.b64decode(audio_b64)
    ext = ".webm" if "webm" in str(orig).lower() else ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
        f.write(raw)
        return f.name


@app.post("/analisar-audio-base64")
async def analisar_audio_base64(body: dict = Body(...)):
    """Recebe áudio em base64 (Sentry). body: { "audio": "data:audio/webm;base64,..." }"""
    audio = body.get("audio") or body.get("audioBase64")
    if not audio or not isinstance(audio, str):
        raise HTTPException(400, "Campo 'audio' obrigatório.")
    tmp_path = None
    try:
        tmp_path = _save_audio_from_base64(audio)
        from voice_detector import analyze_audio_synthetic
        return analyze_audio_synthetic(tmp_path)
    except Exception as e:
        raise HTTPException(500, f"Erro na análise de áudio: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@app.post("/analisar-audio")
async def analisar_audio(audio: UploadFile = File(...)):
    """
    Analisa áudio (wav, mp3, webm) com wav2vec2 para detectar voz sintética.
    body: multipart audio file
    """
    if not audio.content_type or not any(x in (audio.content_type or "") for x in ["audio/", "video/", "application/octet"]):
        raise HTTPException(400, "Envie um arquivo de áudio (wav, mp3, webm, etc).")
    tmp_path = None
    try:
        content = await audio.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(400, "Áudio muito grande. Máximo 50MB.")
        suffix = ".wav"
        if "webm" in (audio.filename or "").lower() or "webm" in (audio.content_type or ""):
            suffix = ".webm"
        elif "mp3" in (audio.filename or "").lower():
            suffix = ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(content)
            tmp_path = f.name
        from voice_detector import analyze_audio_synthetic
        return analyze_audio_synthetic(tmp_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erro na análise de áudio: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@app.post("/analisar-lipsync-sentry")
async def analisar_lipsync_sentry(body: dict = Body(...)):
    """
    Lip-sync para Sentry: frames + áudio base64.
    Cria vídeo temporário, mescla áudio, executa SyncNet.
    """
    frames = body.get("frames")
    audio_b64 = body.get("audio") or body.get("audioBase64")
    if not frames or not audio_b64 or "base64," not in str(audio_b64):
        raise HTTPException(400, "Envie 'frames' (lista) e 'audio' (data URL base64).")
    video_path = None
    audio_path = None
    out_path = None
    try:
        video_path = _frames_to_video(frames)
        b64 = audio_b64.split("base64,", 1)[1].strip()
        raw = base64.b64decode(b64)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as f:
            f.write(raw)
            audio_path = f.name
        out_path = tempfile.mktemp(suffix=".mp4")
        import subprocess
        subprocess.run([
            "ffmpeg", "-y", "-i", video_path, "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-shortest", out_path
        ], capture_output=True, timeout=30, check=False)
        if not os.path.exists(out_path) or os.path.getsize(out_path) < 1000:
            return {"ok": False, "avg_distance": 1.0, "resultado": "ffmpeg merge falhou", "suspicious": False}
        from lipsync_detector import analyze_lipsync
        return analyze_lipsync(out_path)
    except Exception as e:
        raise HTTPException(500, f"Erro lip-sync: {str(e)}")
    finally:
        for p in (video_path, audio_path, out_path):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


@app.post("/analisar-lipsync")
async def analisar_lipsync_endpoint(video: UploadFile = File(...)):
    """
    Executa SyncNet para verificar lip-sync (boca vs áudio).
    Vídeo deve conter áudio.
    """
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(400, "Envie um arquivo de vídeo com áudio.")
    tmp_path = None
    try:
        content = await video.read()
        if len(content) > 200 * 1024 * 1024:
            raise HTTPException(400, "Vídeo muito grande. Máximo 200MB.")
        ext = ".mp4"
        if "webm" in (video.filename or "").lower():
            ext = ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
            f.write(content)
            tmp_path = f.name
        from lipsync_detector import analyze_lipsync
        return analyze_lipsync(tmp_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erro na análise lip-sync: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@app.post("/analisar-frames")
async def analisar_frames(body: dict = Body(...)):
    """
    Recebe frames base64 (Sentry Mini HUD) e retorna score de deepfake.
    body: { "frames": ["data:image/jpeg;base64,...", ...] }
    """
    frames = body.get("frames")
    if not isinstance(frames, list):
        raise HTTPException(400, "Campo 'frames' deve ser uma lista de imagens base64.")
    tmp_path = None
    try:
        tmp_path = _frames_to_video(frames)
        fake = predict_video(tmp_path)
        real = 1.0 - fake
        return {
            "fake": round(fake, 4),
            "real": round(real, 4),
            "resultado": _resultado_from_fake(fake),
            "score_fake_pct": round(fake * 100, 1),
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro na análise de frames: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
