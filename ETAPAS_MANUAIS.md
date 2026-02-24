# 📋 Etapas manuais pendentes – RealityScan (aplicativo completo)

Lista consolidada de tudo que você precisa configurar manualmente para o app funcionar de ponta a ponta.

---

## 🔥 1. Firebase

| # | Etapa | Descrição |
|---|-------|-----------|
| 1.1 | Criar projeto Firebase | Console: [firebase.google.com](https://console.firebase.google.com) |
| 1.2 | Ativar Auth (Email/Senha e anônimo) | Authentication → Sign-in method |
| 1.3 | Criar Firestore | Firestore Database → Criar banco |
| 1.4 | Configurar regras do Firestore | Regras de leitura/escrita conforme seu modelo |
| 1.5 | Gerar chave de serviço | Project Settings → Service accounts → Generate new private key |
| 1.6 | Salvar `firebase-key.json` | Colocar na raiz do projeto (não commitar) |

---

## 💳 2. Mercado Pago

| # | Etapa | Descrição |
|---|-------|-----------|
| 2.1 | Criar conta Mercado Pago | [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) |
| 2.2 | Obter Access Token | Credenciais → Produção ou Teste |
| 2.3 | Configurar webhook | URL de notificação: `https://SEU_DOMINIO/api/webhook/mercadopago` |
| 2.4 | Definir variável | `MP_ACCESS_TOKEN` no `.env.local` ou Firestore `config/apiKeys` |

---

## 🤖 3. IA (Gemini / OpenRouter)

| # | Etapa | Descrição |
|---|-------|-----------|
| 3.1 | Obter chave Gemini | [aistudio.google.com](https://aistudio.google.com) |
| 3.2 | (Opcional) Obter chave OpenRouter | [openrouter.ai](https://openrouter.ai) |
| 3.3 | Definir variáveis | `GEMINI_API_KEY` e/ou `OPENROUTER_KEY` no `.env.local` ou Firestore |

---

## 🖥️ 4. Servidor GPU (RunPod) – Deepfake + Voz + Lip-sync

| # | Etapa | Descrição |
|---|-------|-----------|
| 4.1 | Criar conta RunPod | [runpod.io](https://runpod.io) |
| 4.2 | Adicionar forma de pagamento | Cartão ou créditos |
| 4.3 | Deploy GPU Pod | RTX 3090 ou A5000, template PyTorch |
| 4.4 | SSH no pod | Acessar terminal |
| 4.5 | Clonar repositório | `git clone <seu-repo> realityscan` |
| 4.6 | Rodar `run_setup.sh` | `cd realityscan/deepfake-api && chmod +x run_setup.sh && ./run_setup.sh` |
| 4.7 | Instalar ffmpeg (lip-sync) | `sudo apt-get install -y ffmpeg` |
| 4.8 | Iniciar API | `DFDCDIR=/app/dfdc_... WEIGHTS_DIR=/app/weights python app.py` |
| 4.9 | Mapear porta 8000 | RunPod → TCP Port Mappings |
| 4.10 | Copiar URL pública | Ex: `https://xxxx-8000.proxy.runpod.net` |
| 4.11 | (Sentry com áudio) Marcar "Compartilhar áudio" | No diálogo do navegador ao compartilhar tela |

---

## 📁 5. Variáveis de ambiente (`.env.local`)

Criar/editar `.env.local` na raiz:

```env
# Obrigatório
DEEPFAKE_API_URL=https://SUA_URL_RUNPOD

# Opcional (se usar URL diferente para voz)
VOICE_API_URL=https://SUA_URL_RUNPOD

# IA
GEMINI_API_KEY=sua_chave
OPENROUTER_KEY=sua_chave

# Pagamento
MP_ACCESS_TOKEN=seu_token

# Deploy
APP_URL=https://seu-dominio.com
PORT=3001
```

---

## 🔄 6. Iniciar aplicação

| # | Etapa | Comando |
|---|-------|---------|
| 6.1 | Desenvolvimento (app + server) | `npm run dev:full` |
| 6.2 | Produção | `npm run build && npm run server` |
| 6.3 | Com PM2 | `npm run start:pm2` |

---

## ✅ 7. Verificações rápidas

| Check | Como verificar |
|-------|----------------|
| Firebase | App abre, login funciona |
| Mercado Pago | Assinatura/checkout completa |
| Deepfake API | `curl https://SUA_URL/health` → `{"status":"ok"}` |
| Sentry | Compartilhar tela (com áudio) e analisar |

---

## 📌 Resumo (ordem sugerida)

1. Firebase + `firebase-key.json`
2. `.env.local` com chaves IA e MP
3. RunPod: criar pod, rodar setup, iniciar API
4. `DEEPFAKE_API_URL` no `.env.local`
5. `npm run dev:full` ou deploy em produção
