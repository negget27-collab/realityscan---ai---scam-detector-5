# 🧠 Setup Deepfake Detector (EfficientNet B7) – RealityScan

Este guia descreve as **etapas manuais** para ativar o detector de deepfake em vídeos, usando EfficientNet B7 (modelo selimsef/dfdc_deepfake_challenge) rodando em RunPod ou Cloud Run.

---

## ✅ Última etapa manual (quando quiser ativar o GPU)

O sistema EfficientNet já está **reintegrado e preparado** no código. Para ativar:

1. **RunPod:** criar pod GPU (RTX 3090/A5000, PyTorch, Ubuntu 22.04) e abrir o terminal.
2. **No pod:** clonar o repo (ou enviar a pasta `deepfake-api`), depois:
   ```bash
   cd deepfake-api
   chmod +x run_setup.sh && ./run_setup.sh
   export DFDC_DIR=/app/dfdc_deepfake_challenge
   export WEIGHTS_DIR=/app/weights
   python app.py
   ```
3. **RunPod:** mapear porta 8000 (TCP Port Mappings) e copiar a URL pública (ex: `https://xxxx-8000.proxy.runpod.net`).
4. **No projeto:** no `.env.local` na raiz do RealityScan:
   ```env
   DEEPFAKE_API_URL=https://SUA_URL_RUNPOD
   ```
5. Reiniciar o backend. No log deve aparecer: `✔ Deepfake API acessível em ...`.

A partir daí: **upload de vídeo** e **Sentry** passam a usar EfficientNet B7 (e, no mesmo servidor, wav2vec2 para voz e SyncNet para lip-sync).

---

## ❌ Resolver erro "Deepfake API 404: Not Found"

Se o backend mostrar **Deepfake API 404** ou **Deepfake API inacessível**, a URL em `DEEPFAKE_API_URL` não está a responder. Duas formas de resolver:

### Opção A – API local (recomendado para desenvolvimento)

1. **Subir a Deepfake API em Docker (CPU)** — na raiz do projeto:
   ```bash
   npm run deepfake:up
   ```
   Na primeira vez o build pode demorar alguns minutos (download de modelos).

2. **Apontar o backend para a API local** — no `.env.local`:
   ```env
   DEEPFAKE_API_URL=http://localhost:8000
   ```

3. **Reiniciar o backend** (`npm run dev:full`). Deve aparecer: `✔ Deepfake API acessível em http://localhost:8000`.

Para parar a API local: `npm run deepfake:down`.

### Opção B – RunPod

Se preferir usar RunPod: confirme que o pod está **Running**, que a API está a correr no pod (`python app.py` ou via Docker na porta 8000) e que em `.env.local` está a **URL atual** do proxy RunPod (a URL muda se o pod for reiniciado). Ver secção "Etapas manuais" abaixo.

---

## Arquitetura

### Vídeo (upload direto)
```
Usuário clica "analisar vídeo"
        ↓
App envia vídeo → POST /api/scan (multipart)
        ↓
server.js detecta tipo video/* → chama DEEPFAKE_API_URL/analisar
        ↓
RunPod: extrai 32 frames → EfficientNet B7 → score fake 0-1
        ↓
Retorna resultado ao app
```

### Sentry Mini HUD (precisão total: visual + voz + lip-sync)
```
Usuário compartilha tela (com áudio) → Sentry captura 3 frames + áudio
        ↓
POST /api/scan com type=sentry, imagens[], audio (base64)
        ↓
server.js em paralelo:
  • EfficientNet B7 (analisar-frames) → análise principal visual (1 ou mais frames)
  • wav2vec2 (analisar-audio-base64) → voz sintética
  • SyncNet (analisar-lipsync-sentry) → lip-sync boca/áudio (2+ frames + áudio)
  • Agentes de texto (Gemini/etc.) → contexto e síntese
        ↓
Merge: risco final = max(agentes, EfficientNet, voz, lip-sync); EfficientNet é referência primária para risco visual.
        ↓
Resultado nível empresa
```

> **Módulos:** EfficientNet B7 (visual), wav2vec2 (voz sintética), SyncNet (lip-sync). Tudo roda no mesmo servidor GPU.

---

## Etapas manuais

**Checklist:** 1) Conta RunPod + pagamento → 2) Deploy GPU Pod (RTX 3090/A5000, PyTorch, Ubuntu 22.04) → 3) No terminal: clonar repo (ou upload `deepfake-api`) e rodar `./run_setup.sh` → 4) Iniciar API (`python app.py`) → 5) Expor porta 8000 e copiar URL → 6) Colocar URL em `DEEPFAKE_API_URL` no `.env.local`.

---

### 1. Criar conta RunPod
- Acesse [https://runpod.io](https://runpod.io)
- Crie conta e adicione forma de pagamento

### 2. Deploy do pod GPU
- Deploy → GPU Pod
- GPU sugerida: **RTX 3090** ou **A5000** (≈ $0.20–0.50/hora)
- Template: **PyTorch** (ou Docker + Python 3.10+)
- Sistema: Ubuntu 22.04

### 3. Instalar ambiente no servidor
No terminal do RunPod (após o pod estar ativo):

**Opção A – Com repositório no GitHub**

1. Envie o projeto RealityScan para um repositório no GitHub (se ainda não tiver).
2. No terminal do RunPod:

```bash
cd /workspace   # ou /app
# Substitua pela URL do seu repositório (ex: https://github.com/SEU_USUARIO/realityscan-ai-scam-detector.git)
git clone https://github.com/SEU_USUARIO/SEU_REPO.git realityscan
cd realityscan/deepfake-api

chmod +x run_setup.sh
./run_setup.sh
```

**Opção B – Sem GitHub (só pasta deepfake-api)**

Se você tiver só a pasta `deepfake-api` (zip ou upload):

```bash
cd /workspace
# Crie a pasta e coloque app.py, run_setup.sh, requirements.txt aqui (upload ou unzip)
mkdir -p realityscan/deepfake-api
# Depois de colocar os arquivos:
cd realityscan/deepfake-api
chmod +x run_setup.sh
./run_setup.sh
```

Se preferir manual:

```bash
# Clone dfdc_deepfake_challenge
git clone --depth 1 https://github.com/selimsef/dfdc_deepfake_challenge.git /app/dfdc_deepfake_challenge

# Pesos EfficientNet B7 (1 modelo para começar)
mkdir -p /app/weights
cd /app/weights
wget -O final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36 \
  https://github.com/selimsef/dfdc_deepfake_challenge/releases/download/0.0.1/final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36

# Deps Python (visual + voz + lip-sync)
pip install fastapi uvicorn python-multipart torch torchvision opencv-python-headless numpy Pillow albumentations facenet-pytorch timm pandas transformers torchaudio librosa soundfile scenedetect scipy

# SyncNet (lip-sync) - opcional
git clone --depth 1 https://github.com/joonson/syncnet_python.git /app/syncnet_python
cd /app/syncnet_python && bash download_model.sh 2>/dev/null || true

# ffmpeg (necessário para mesclar vídeo+áudio no lip-sync)
# RunPod/Ubuntu: sudo apt-get install -y ffmpeg
```

### 4. Iniciar a API
No mesmo terminal (ajuste o caminho se usou `/workspace` em vez de `/app`):

```bash
cd /workspace/realityscan/deepfake-api   # ou /app/realityscan/deepfake-api
export DFDC_DIR=/app/dfdc_deepfake_challenge
export WEIGHTS_DIR=/app/weights
python app.py
# ou: uvicorn app:app --host 0.0.0.0 --port 8000
```

### 5. Expor a URL (RunPod)
- RunPod: Settings → TCP Port Mappings → mapear porta 8000
- Copiar a URL pública (ex: `https://xxxx-8000.proxy.runpod.net`)

### 6. Configurar o servidor Node (RealityScan)
No `.env.local` do projeto (na raiz do app):

```env
DEEPFAKE_API_URL=https://SUA_URL_RUNPOD
```

Exemplo:

```env
DEEPFAKE_API_URL=https://abc123-8000.proxy.runpod.net
```

> ⚠️ Use só a URL base, sem `/analisar`; o código adiciona `/analisar` automaticamente.

### 7. Reiniciar o servidor
```bash
npm run server
# ou
npm run start
```

---

## Variáveis de ambiente

| Variável | Onde | Descrição |
|----------|------|-----------|
| `DEEPFAKE_API_URL` ou `VOICE_API_URL` | server.js (.env.local) | URL base da API (RunPod ou Cloud Run). Voice/Lipsync usam a mesma URL. |
| `DFDC_DIR` | deepfake-api (RunPod) | Caminho do clone dfdc_deepfake_challenge |
| `WEIGHTS_DIR` | deepfake-api (RunPod) | Pasta dos pesos `.pth` |
| `MODEL_FILES` | deepfake-api (opcional) | Lista de modelos (vírgula). Default: 1 modelo |

---

## Teste rápido

```bash
# Health
curl https://SUA_URL/health

# Analisar vídeo
curl -X POST -F "video=@meu_video.mp4" https://SUA_URL/analisar

# Sentry: analisar frames (base64)
curl -X POST -H "Content-Type: application/json" -d '{"frames":["data:image/jpeg;base64,..."]}' https://SUA_URL/analisar-frames
```

Resposta esperada:
```json
{
  "fake": 0.23,
  "real": 0.77,
  "resultado": "aparenta ser conteúdo real",
  "score_fake_pct": 23.0
}
```

---

## Custo estimado (RunPod)

- GPU RTX 3090: ≈ $0.24/hora
- Com uso sob clique: ≈ $20–60/mês
- Gemini (fallback): conforme uso existente

---

## Alternativa: Cloud Run + GPU

1. Dockerfile em `deepfake-api/` (usar base PyTorch GPU)
2. `gcloud run deploy` com `--accelerator type=nvidia-tesla-t4`
3. Usar a URL do Cloud Run em `DEEPFAKE_API_URL`

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `WEIGHTS_DIR não encontrado` | Rodar `run_setup.sh` ou baixar pesos manualmente |
| `CUDA out of memory` | Reduzir batch ou usar GPU maior |
| Timeout 2 min | Vídeo muito longo; limite recomendado ~60s |
| Voice/Lipsync falha | Instalar transformers, torchaudio, librosa; ffmpeg para lip-sync |
| `DEEPFAKE_API_URL não configurada` | Adicionar no `.env.local` e reiniciar o server |

---

## 📋 Lista resumida de etapas manuais

1. **RunPod** – Criar conta e adicionar pagamento  
2. **RunPod** – Deploy GPU Pod (RTX 3090 ou A5000, PyTorch template)  
3. **RunPod** – Executar `./run_setup.sh` na pasta `deepfake-api` ou rodar comandos manuais do passo 3  
4. **RunPod** – Iniciar a API: `DFDCDIR=... WEIGHTS_DIR=... python app.py`  
5. **RunPod** – Configurar mapeamento da porta 8000 e obter URL pública  
6. **Projeto** – Adicionar `DEEPFAKE_API_URL=https://sua-url-runpod` em `.env.local`  
7. **Projeto** – Reiniciar o servidor Node (`npm run server` ou `npm start`)
