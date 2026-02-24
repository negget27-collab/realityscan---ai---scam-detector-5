"""
SyncNet - detecta dessincronia entre boca e áudio (lip-sync).
Baixo score = suspeito de fake.
Requer: git clone joonson/syncnet_python + download_model.sh
"""

import os
import subprocess
import tempfile
from pathlib import Path

SYNCNET_DIR = os.environ.get("SYNCNET_DIR", "/app/syncnet_python")


def analyze_lipsync(video_path: str) -> dict:
    """
    Executa SyncNet no vídeo. Retorna offset, confidence, avg_distance.
    avg_distance baixo = boca não bate com áudio = suspeito fake.
    """
    if not os.path.isdir(SYNCNET_DIR):
        return {"ok": False, "avg_distance": 1.0, "resultado": "SyncNet não instalado", "suspicious": False}

    ref = "sentry_" + str(hash(video_path) % 10**8)
    data_dir = tempfile.mkdtemp(prefix="syncnet_")
    try:
        pipeline = Path(SYNCNET_DIR) / "run_pipeline.py"
        syncnet = Path(SYNCNET_DIR) / "run_syncnet.py"
        if not pipeline.exists() or not syncnet.exists():
            return {"ok": False, "avg_distance": 1.0, "resultado": "scripts SyncNet não encontrados", "suspicious": False}

        out1 = subprocess.run(
            ["python", str(pipeline), "--videofile", video_path, "--reference", ref, "--data_dir", data_dir],
            capture_output=True, text=True, timeout=120, cwd=SYNCNET_DIR
        )
        if out1.returncode != 0:
            return {"ok": False, "avg_distance": 1.0, "resultado": "pipeline falhou", "suspicious": False}

        out2 = subprocess.run(
            ["python", str(syncnet), "--videofile", video_path, "--reference", ref, "--data_dir", data_dir],
            capture_output=True, text=True, timeout=60, cwd=SYNCNET_DIR
        )

        pckl = Path(data_dir) / "pywork" / ref / "activesd.pckl"
        if pckl.exists():
            import pickle
            with open(pckl, "rb") as f:
                dists = pickle.load(f)
            avg_dist = sum(dists) / len(dists) if dists else 1.0
            suspicious = avg_dist > 0.5
            return {
                "ok": True,
                "avg_distance": round(avg_dist, 4),
                "resultado": "dessincronia detectada - suspeito" if suspicious else "lip-sync aparenta correto",
                "suspicious": suspicious,
            }
        return {"ok": False, "avg_distance": 1.0, "resultado": "sem dados", "suspicious": False}
    except subprocess.TimeoutExpired:
        return {"ok": False, "avg_distance": 1.0, "resultado": "timeout", "suspicious": False}
    except Exception as e:
        return {"ok": False, "avg_distance": 1.0, "resultado": str(e), "suspicious": False}
    finally:
        import shutil
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir, ignore_errors=True)
