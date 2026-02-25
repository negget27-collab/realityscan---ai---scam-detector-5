import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import fetch from "node-fetch";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pLimit from "p-limit";
import admin from "firebase-admin";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

import { MercadoPagoConfig, Preference } from "mercadopago";
import { analyzeVideoDeepfake, analyzeFramesDeepfake } from "./services/deepfakeService.js";
import { analyzeAudioVoice, analyzeLipsyncSentry } from "./services/voiceService.js";

import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Necessário quando o app está atrás de proxy (Vite, nginx, load balancer) - evita ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none'); // same-origin-allow-popups bloqueava popup OAuth (Firebase)
  next();
});
app.use(express.json({ limit: '15mb' })); // Sentry envia 3 frames base64; padrão 100kb é insuficiente

// ============================================================
// 🏥 HEALTH / READINESS - para load balancer e monitoramento (sem rate limit)
// ============================================================
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/ready", async (req, res) => {
  try {
    if (db) await db.collection("system").doc("ping").get();
    res.json({ ready: true, db: !!db });
  } catch (e) {
    res.status(503).json({ ready: false, error: e.message });
  }
});

// ============================================================
// 🛡️ RATE LIMITING - proteção contra abuso e sobrecarga
// ============================================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Limite de análises por minuto atingido. Aguarde um momento." },
  standardHeaders: true,
  legacyHeaders: false,
});
// Rate limit por IP nas rotas de API (evita abuso por um único IP)
const apiByIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Muitas requisições deste IP. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);
// Limiter específico para /api/scan aplicado na rota

// Limitador de concorrência para chamadas de IA (evita saturar OpenRouter/Gemini)
const AI_CONCURRENCY = parseInt(process.env.AI_CONCURRENCY_LIMIT || "15", 10);
const aiConcurrencyLimiter = pLimit(AI_CONCURRENCY);

// ============================================================
// 🔐 API CONFIG - Carregada do Firestore (prioridade) ou .env
// Nunca commitar chaves no Git. Firestore: config/apiKeys
// ============================================================
const apiConfig = {
  mp_access_token: process.env.MP_ACCESS_TOKEN || "TEST-8717969129960621-020913-145f88e9ccaf70f36b0b9446741e3bbb-426439355",
  paypal_client_id: process.env.PAYPAL_CLIENT_ID || "",
  paypal_client_secret: process.env.PAYPAL_CLIENT_SECRET || "",
  paypal_sandbox: process.env.PAYPAL_SANDBOX !== "false",
  openrouter_key: process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY || "",
  gemini_api_key: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_KEY || process.env.API_KEY || "",
};

let mpClient = null; // Inicializado após carregar config do Firestore

function getPayPalBase() {
  return apiConfig.paypal_sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

// Preços em USD para PayPal
const PRICES_USD = {
  advanced: 3.99, business: 6.39,
  advanced_annual: 39.99, business_annual: 69.99,
  credits_5: 1.49, credits_20: 4.99, credits_50: 9.99,
  api_basic: 9.99, api_pro: 29.99, api_enterprise: 99.99,
};

// Preços em BRL para cálculo de receita no admin (fallback quando amount=0 nas purchases)
const PLAN_PRICES_BRL = {
  advanced: 21.90, business: 34.90,
  advanced_annual: 219, business_annual: 349,
  credits_5: 8, credits_20: 28, credits_50: 58,
  api_basic: 55, api_pro: 165, api_enterprise: 550,
};

// URL do servidor (definida ao iniciar)
let BASE_URL = process.env.APP_URL || process.env.BASE_URL || "http://localhost:3000";
let FRONTEND_URL = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";

console.log("🚀 BACKEND REALITYSCAN INICIADO");

// Verifica se a Deepfake API está acessível (evita 404 em runtime)
const deepfakeBase = process.env.DEEPFAKE_API_URL || "";
if (deepfakeBase) {
  const healthUrl = deepfakeBase.replace(/\/$/, "") + "/health";
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  fetch(healthUrl, { method: "GET", signal: ac.signal })
    .then((res) => {
      clearTimeout(t);
      if (res.ok) {
        console.log("✔ Deepfake API acessível em", deepfakeBase);
      } else {
        console.error(
          "❌ Deepfake API devolveu",
          res.status,
          "em",
          healthUrl,
          "\n  Para resolver: (1) Subir API local: npm run deepfake:up e no .env.local use DEEPFAKE_API_URL=http://localhost:8000  (2) Ou iniciar o pod RunPod e colocar a URL correta em DEEPFAKE_API_URL."
        );
      }
    })
    .catch((err) => {
      clearTimeout(t);
      console.error(
        "❌ Deepfake API inacessível:",
        err.message || err,
        "\n  Para resolver: (1) Subir API local: npm run deepfake:up e no .env.local use DEEPFAKE_API_URL=http://localhost:8000  (2) Ou iniciar o pod RunPod e colocar a URL correta em DEEPFAKE_API_URL."
      );
    });
}

//////////////////////////////
// FIREBASE ADMIN
//////////////////////////////
let db;
try {
  const serviceAccountPath = "./firebase-key.json";
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ ERRO: firebase-key.json ausente!");
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
  console.log("✅ Firebase Admin conectado.");
} catch (err) {
  console.error("❌ Erro Firebase Admin:", err.message);
}

/** Registra compra em users/{uid}/purchases para histórico */
async function savePurchaseRecord(userId, planId, type, amount = 0) {
  if (!db || !userId) return;
  try {
    const ref = db.collection("users").doc(userId).collection("purchases");
    await ref.add({
      planId,
      type: type || (planId.includes("credits") ? "credits" : "subscription"),
      amount: amount || 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Erro ao salvar histórico de compra:", e.message);
  }
}

/** Carrega API keys do Firestore (config/apiKeys). Prioridade: Firestore > .env
 *  Regras Firestore negam acesso a clientes; apenas Admin SDK lê. */
async function loadApiConfigFromFirestore() {
  if (!db) return;
  try {
    const snap = await db.collection("config").doc("apiKeys").get();
    if (!snap.exists) return;
    const data = snap.data();
    if (data.mp_access_token) apiConfig.mp_access_token = data.mp_access_token;
    if (data.paypal_client_id) apiConfig.paypal_client_id = data.paypal_client_id;
    if (data.paypal_client_secret) apiConfig.paypal_client_secret = data.paypal_client_secret;
    if (typeof data.paypal_sandbox === "boolean") apiConfig.paypal_sandbox = data.paypal_sandbox;
    if (data.openrouter_key) apiConfig.openrouter_key = data.openrouter_key;
    if (data.gemini_api_key) apiConfig.gemini_api_key = data.gemini_api_key;
    if (data.app_url) {
      BASE_URL = data.app_url;
      FRONTEND_URL = data.app_url;
    }
    console.log("🔐 API keys carregadas do Firestore (config/apiKeys)");
  } catch (err) {
    console.warn("⚠️ Firestore config não disponível, usando .env:", err.message);
  }
}




// ================================
// 🤖 ROTA IA OPENROUTER REALITYSCAN
// ================================

// ================================
// 🔒 BLINDAGEM FREE USAGE (device + IP + global)
// ================================
const MAX_FREE_PER_DEVICE = 3;
const MAX_FREE_PER_IP = 10;
const MAX_FREE_GLOBAL_DAILY = 500;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

function hashForFirestoreKey(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return 'k' + Math.abs(h).toString(36);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function checkFreeScan(deviceId, ip) {
  if (!deviceId) return { allowed: false, reason: 'deviceId obrigatório' };
  const today = todayKey();
  const ipKey = hashForFirestoreKey(ip);

  const [deviceRef, ipRef, globalRef] = [
    db.collection('free_usage').doc(deviceId),
    db.collection('free_usage_ip').doc(ipKey),
    db.collection('free_usage_global').doc(today)
  ];

  const [deviceSnap, ipSnap, globalSnap] = await Promise.all([
    deviceRef.get(),
    ipRef.get(),
    globalRef.get()
  ]);

  const deviceData = deviceSnap.exists ? deviceSnap.data() : {};
  const ipData = ipSnap.exists ? ipSnap.data() : {};
  const globalData = globalSnap.exists ? globalSnap.data() : {};

  const deviceScansToday = (deviceData.date === today ? (deviceData.scansToday || 0) : 0);
  const ipScansToday = (ipData.date === today ? (ipData.scansToday || 0) : 0);
  const globalScansToday = globalData.totalScans || 0;

  if (deviceScansToday >= MAX_FREE_PER_DEVICE) {
    return { allowed: false, reason: 'LIMIT_DEVICE', remaining: 0 };
  }
  if (ipScansToday >= MAX_FREE_PER_IP) {
    return { allowed: false, reason: 'LIMIT_IP', remaining: 0 };
  }
  if (globalScansToday >= MAX_FREE_GLOBAL_DAILY) {
    return { allowed: false, reason: 'LIMIT_GLOBAL', remaining: 0 };
  }

  return { allowed: true, remaining: MAX_FREE_PER_DEVICE - deviceScansToday - 1 };
}

app.get("/api/check-free-usage", async (req, res) => {
  try {
    const deviceId = req.query.deviceId || req.headers['x-device-id'];
    const ip = getClientIP(req);
    if (!deviceId) {
      return res.json({ allowed: false, remaining: 0, reason: 'NO_DEVICE' });
    }
    const check = await checkFreeScan(deviceId, ip);
    return res.json({
      allowed: check.allowed,
      remaining: check.remaining ?? (check.allowed ? MAX_FREE_PER_DEVICE - 0 : 0),
      reason: check.reason
    });
  } catch (err) {
    console.error("check-free-usage err:", err);
    return res.json({ allowed: false, remaining: 0 });
  }
});

// 1 free reasoning session per day for visitors (session = open+close)
async function checkFreeReasoningSession(deviceId) {
  if (!deviceId || !db) return { allowed: false };
  const today = todayKey();
  const ref = db.collection('free_usage_reasoning').doc(deviceId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const usedToday = data.date === today && data.used === true;
  return { allowed: !usedToday };
}

async function markReasoningSessionUsed(deviceId) {
  if (!deviceId || !db) return;
  const today = todayKey();
  const ref = db.collection('free_usage_reasoning').doc(deviceId);
  await ref.set({ date: today, used: true, lastUsed: new Date().toISOString() }, { merge: true });
}

app.get("/api/check-free-reasoning", async (req, res) => {
  try {
    const deviceId = req.query.deviceId || req.headers['x-device-id'];
    if (!deviceId) return res.json({ allowed: false });
    const check = await checkFreeReasoningSession(deviceId);
    return res.json({ allowed: check.allowed });
  } catch (err) {
    console.error("check-free-reasoning err:", err);
    return res.json({ allowed: false });
  }
});

app.post("/api/mark-reasoning-session-used", async (req, res) => {
  try {
    const deviceId = req.body?.deviceId || req.headers['x-device-id'];
    if (!deviceId) return res.status(400).json({ ok: false });
    await markReasoningSessionUsed(deviceId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("mark-reasoning-session-used err:", err);
    return res.status(500).json({ ok: false });
  }
});

// 1 free media chat session per day for visitors (session = open+close, 1 free analysis within)
async function checkFreeMediaSession(deviceId) {
  if (!deviceId || !db) return { allowed: false };
  const today = todayKey();
  const ref = db.collection('free_usage_media').doc(deviceId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const usedToday = data.date === today && data.used === true;
  return { allowed: !usedToday };
}

async function markMediaSessionUsed(deviceId) {
  if (!deviceId || !db) return;
  const today = todayKey();
  const ref = db.collection('free_usage_media').doc(deviceId);
  await ref.set({ date: today, used: true, lastUsed: new Date().toISOString() }, { merge: true });
}

app.get("/api/check-free-media", async (req, res) => {
  try {
    const deviceId = req.query.deviceId || req.headers['x-device-id'];
    if (!deviceId) return res.json({ allowed: false });
    const check = await checkFreeMediaSession(deviceId);
    return res.json({ allowed: check.allowed });
  } catch (err) {
    console.error("check-free-media err:", err);
    return res.json({ allowed: false });
  }
});

app.post("/api/mark-media-session-used", async (req, res) => {
  try {
    const deviceId = req.body?.deviceId || req.headers['x-device-id'];
    if (!deviceId) return res.status(400).json({ ok: false });
    await markMediaSessionUsed(deviceId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("mark-media-session-used err:", err);
    return res.status(500).json({ ok: false });
  }
});

async function incrementFreeUsage(deviceId, ip) {
  const today = todayKey();
  const ipKey = hashForFirestoreKey(ip);
  const deviceRef = db.collection('free_usage').doc(deviceId);
  const ipRef = db.collection('free_usage_ip').doc(ipKey);
  const globalRef = db.collection('free_usage_global').doc(today);

  const [deviceSnap, ipSnap, globalSnap] = await Promise.all([
    deviceRef.get(), ipRef.get(), globalRef.get()
  ]);
  const deviceScansToday = (deviceSnap.exists && deviceSnap.data().date === today) ? (deviceSnap.data().scansToday || 0) : 0;
  const ipScansToday = (ipSnap.exists && ipSnap.data().date === today) ? (ipSnap.data().scansToday || 0) : 0;
  const globalScansToday = (globalSnap.exists ? globalSnap.data().totalScans || 0 : 0);

  const batch = db.batch();
  batch.set(deviceRef, { scansToday: deviceScansToday + 1, date: today, lastUsed: new Date().toISOString() }, { merge: true });
  batch.set(ipRef, { scansToday: ipScansToday + 1, date: today }, { merge: true });
  batch.set(globalRef, { totalScans: globalScansToday + 1, date: today }, { merge: true });
  await batch.commit();
}

async function isUserBlocked(userId) {
  if (!userId || userId === "guest") return false;
  try {
    const snap = await db.collection('users').doc(userId).get();
    if (!snap.exists) return false;
    const d = snap.data();
    return d?.status === 'blocked' || d?.status === 'bloqueado';
  } catch {
    return false;
  }
}

async function isUserPaid(userId) {
  if (!userId) return false;
  try {
    const snap = await db.collection('users').doc(userId).get();
    if (!snap.exists) return false;
    const d = snap.data();
    if (d?.status === 'blocked' || d?.status === 'bloqueado') return false;
    const plan = (d.planId || d.plan || 'community');
    const monthlyCredits = Number(d.monthlyCredits || 0);
    const credits = Number(d.credits || 0);
    if (plan.startsWith('advanced') || plan.startsWith('business')) return true;
    if (monthlyCredits > 0 || credits > 0) return true;
    return false;
  } catch {
    return false;
  }
}

// ================================
// 🤖 ROTA IA - OPENROUTER + GEMINI FALLBACK
// ================================

async function callOpenRouter(messages, model = "google/gemini-2.0-flash-001") {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiConfig.openrouter_key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://realityscan.app",
      "X-Title": "NGT"
    },
    body: JSON.stringify({ model, messages })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error?.message || "OpenRouter error");
  return data.choices?.[0]?.message?.content || "";
}

async function callGeminiDirect(prompt, imageDataUrl, model = "gemini-2.0-flash") {
  if (!apiConfig.gemini_api_key) throw new Error("GEMINI_API_KEY não configurada");

  const parts = [];
  if (imageDataUrl) {
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : "image/jpeg";
    const base64Data = match ? match[2] : imageDataUrl;
    parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
  }
  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }]
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiConfig.gemini_api_key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error?.message || "Gemini error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/** Modelo Gemini exclusivo para relatório Sentry — compatível com API v1beta */
const SENTRY_GEMINI_MODEL = "gemini-2.0-flash";

/** Serviço exclusivo Gemini para Sentry — gera explicação detalhada e profissional dos indicadores em conteúdos IA */
async function generateSentryIndicatorsDetail(imageDataUrl, synthesisResult, prompt) {
  if (!apiConfig.gemini_api_key) return null;
  const geminiPrompt = `Você é o perito forense digital do RealityScan SENTRY. O conteúdo foi classificado como tendo presença de IA.

ANÁLISE PRÉVIA:
${synthesisResult}

OBSERVAÇÃO ESPECIAL — PESSOAS FAMOSAS: Identifique IMEDIATAMENTE celebridades, políticos, atores, influenciadores, atletas ou qualquer figura pública visível. Cite TODAS em MAIÚSCULAS no início do relatório (ex: "Pessoas reconhecidas: NOME 1, NOME 2."). Isso é prioritário para deepfakes e conteúdo enganoso.

Sua tarefa: produza uma EXPLICAÇÃO DETALHADA E PROFISSIONAL dos indicadores que sugerem geração ou manipulação por IA neste conteúdo.

FORMATO (obrigatório, em português Brasil):
**Pessoas reconhecidas:** (liste TODAS as figuras públicas em MAIÚSCULAS; se nenhuma, diga "Nenhuma identificada")
**Indicadores visuais:** (artefatos, inconsistências, texturas, bordas, olhos, mãos, iluminação, perspectivas impossíveis)
**Indicadores contextuais:** (cenas impossíveis, elementos surreais, legenda/conta suspeitos)
**Grau de confiança:** (baixo/médio/alto) e justificativa breve
**Conclusão forense:** (1-2 frases profissionais que reforcem o relatório)

Seja técnico mas acessível. O relatório deve convencer e embasar a classificação de conteúdo IA.`;
  try {
    const detail = await aiConcurrencyLimiter(() =>
      callGeminiDirect(geminiPrompt, imageDataUrl, SENTRY_GEMINI_MODEL)
    );
    return detail?.trim() || null;
  } catch (err) {
    console.warn("⚠️ Gemini indicadores Sentry falhou:", err?.message);
    return null;
  }
}

async function _analyzeWithAICore(messages, imageDataUrl, options = {}) {
  let texto = "";
  let provider = "";

  const openRouterModels = options.models || ["google/gemini-2.0-flash-001", "google/gemini-flash-1.5", "anthropic/claude-3-haiku"];
  if (apiConfig.openrouter_key) {
    for (const model of openRouterModels) {
      try {
        texto = await callOpenRouter(messages, model);
        provider = `OpenRouter (${model})`;
        break;
      } catch (err) {
        console.warn(`⚠️ OpenRouter ${model} falhou:`, err.message);
      }
    }
  }

  if (!texto && !options.openRouterOnly && apiConfig.gemini_api_key) {
    try {
      const userMsg = messages.find(m => m.role === "user")?.content;
      let textPart = "Analise esta imagem e identifique se é IA, deepfake ou golpe. Seja técnico.";
      let imgData = imageDataUrl;
      if (Array.isArray(userMsg)) {
        const text = userMsg.find(p => p.type === "text");
        const img = userMsg.find(p => p.image_url);
        if (text) textPart = text.text;
        if (img) imgData = img.image_url?.url;
      } else if (typeof userMsg === "string") {
        textPart = userMsg;
      }
      texto = await callGeminiDirect(textPart, imgData);
      provider = "Gemini";
    } catch (err) {
      console.warn("⚠️ Gemini falhou:", err.message);
    }
  }

  if (!texto) throw new Error(options.openRouterOnly
    ? "Nenhum modelo gratuito OpenRouter disponível. Tente novamente."
    : "Nenhum provedor de IA disponível (OpenRouter e Gemini falharam ou não configurados)");
  if (provider) console.log(`✅ Análise via ${provider}`);
  return texto;
}

/** Análise com limitador de concorrência (evita saturar OpenRouter/Gemini) */
async function analyzeWithAI(messages, imageDataUrl, options = {}) {
  return aiConcurrencyLimiter(() => _analyzeWithAICore(messages, imageDataUrl, options));
}

/** Modelos GRATUITOS OpenRouter — APENAS para scans de compartilhamento (Sentry) de usuários free */
const SENTRY_FREE_MODELS = [
  "openrouter/free",
  "qwen/qwen3-vl-235b-a22b-thinking",
  "qwen/qwen3-vl-30b-a3b-thinking",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-3-27b-it:free"
];

/** Modelos premium (Advanced, Business, API) — Sentry, scanner principal, câmera */
const PREMIUM_MODELS = [
  "google/gemini-2.0-flash-001",
  "google/gemini-flash-1.5",
  "anthropic/claude-3-haiku",
  "mistralai/pixtral-large-2411",
  "openai/gpt-4o-mini"
];

/** Pipeline Sentry: EfficientNet B7 (análise principal visual) + Agente 1 detecta IA/scam + Agente 2 síntese final.
 *  options.efficientNetResult = resultado do /analisar-frames (EfficientNet) — usado como referência principal de risco visual.
 *  options.voiceResult / options.lipsyncResult = opcionais para voz e lip-sync. */
async function analyzeSentryWithAgents(prompt, imageDataUrl, options = {}) {
  const usePremiumModels = options.usePremiumModels === true;
  const models = usePremiumModels ? PREMIUM_MODELS : SENTRY_FREE_MODELS;
  const openRouterOnly = !usePremiumModels;
  const efficientNetResult = options.efficientNetResult || null;
  const voiceResult = options.voiceResult || null;
  const lipsyncResult = options.lipsyncResult || null;

  const detectionMessages = [
    {
      role: "system",
      content: `Você é um agente de DETECÇÃO DE IA E CONTEÚDO ENGANOSO. Analise a imagem e responda APENAS:
1. O conteúdo é criado ou adulterado por IA? (SIM/NÃO) — Seja conservador: vídeos normais (cozinha, música, pessoas reais, cenas cotidianas, gravações de câmera) SEM artefatos visuais óbvios (mãos estranhas, olhos, texturas) = NÃO.
2. Há discurso pseudocientífico, conspiratório ou de "controle mental/reprogramação"? (SIM/NÃO)
3. Indicadores técnicos: cena fisicamente impossível? Conta com "AI" explícito no nome? Legenda declara "made with AI" ou "criado com IA"? Textos como "seus pensamentos não são seus", "reprogramação"?
REGRA: Conteúdo ordinário de redes sociais (post de cozinha, música, decoração, selfie) = NÃO marcar como IA só por existir legenda ou nome de conta. Só marque SIM se houver EVIDÊNCIA TÉCNICA ou VISUAL clara de geração/manipulação por IA.`
    },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ];

  const detectionResult = await analyzeWithAI(detectionMessages, imageDataUrl, { models, openRouterOnly });
  // Só considera "presença de IA" quando a detecção é EXPLÍCITA e POSITIVA — evita falsos positivos (ex: "não parece IA" não deve dar match)
  const hasAI = /\b(sim|yes)\b.*(IA|gerado|artificial|deepfake)|(há|tem|possui|indica)\s+(presença\s+de\s+)?IA|impossível|impossivel|unfolded|pseudocientífico|conspira|controle mental|reprograma|artefatos?\s+(de\s+)?IA/i.test(detectionResult)
    && !/não\s+(há|tem|possui|indica|parece|é)\s*(presença\s+de\s+)?IA|sem\s+IA|não\s+é\s+IA|conteúdo\s+real|autêntico/i.test(detectionResult);

  const efficientNetBlock = efficientNetResult
    ? `\n\n--- ANÁLISE PRINCIPAL (EfficientNet B7 - detector de deepfake visual) ---\nResultado: ${efficientNetResult.resultado}. Probabilidade de fake: ${(efficientNetResult.score_fake_pct ?? (efficientNetResult.fake != null ? efficientNetResult.fake * 100 : 0)).toFixed(1)}%.\nUse este resultado como REFERÊNCIA PRINCIPAL para o risco visual: se ≥ 40% fake, considere risco elevado e inclua "Há presença de IA neste conteúdo." se coerente com a descrição.`
    : "";
  const voiceBlock = voiceResult && (voiceResult.score_synthetic_pct ?? voiceResult.synthetic * 100) >= 20
    ? `\n\n--- Voz (wav2vec2) ---\n${voiceResult.resultado || "indeterminado"}. Prob. sintética: ${(voiceResult.score_synthetic_pct ?? (voiceResult.synthetic != null ? voiceResult.synthetic * 100 : 0)).toFixed(1)}%.`
    : "";
  const lipsyncBlock = lipsyncResult && lipsyncResult.ok && lipsyncResult.suspicious
    ? `\n\n--- Lip-sync (SyncNet) ---\n${lipsyncResult.resultado || "Dessincronia boca/áudio suspeita."}`
    : "";

  const synthesisMessages = [
    {
      role: "system",
      content: `Você é o analista forense do RealityScan SENTRY. Produza a análise final para o usuário.
RESPONDA EM PORTUGUÊS (BRASIL). Linguagem clara para leigos.

REGRAS:
- Quando fornecida a "ANÁLISE PRINCIPAL (EfficientNet B7)", use-a como referência PRIMÁRIA para o risco visual de deepfake. Se EfficientNet indicar ≥ 40% probabilidade de fake, inclua "Há presença de IA neste conteúdo." e **Nível de Risco** ≥ 50%, salvo se a descrição do conteúdo for claramente real.
- Se o Agente de Detecção indicar presença CLARA de IA ou pseudociência → inclua "Há presença de IA neste conteúdo." e **Nível de Risco** ≥ 50%.
- Se NÃO houver IA (conteúdo ordinário, dúvida) → NÃO inclua "Há presença de IA", risco BAIXO (0-30%). Evite falsos positivos.
- PESSOAS FAMOSAS: cite TODAS em MAIÚSCULAS. Descreva exatamente o que vê. Nunca invente legendas.

FORMATO:
**Análise:** (descreva. Inclua "Há presença de IA neste conteúdo." quando EfficientNet ou agente indicar evidência clara.)
**Nível de Risco:** XX%
**Motivo:** (por que é seguro ou suspeito)
**Orientação:** (o que fazer, se aplicável)`
    },
    {
      role: "user",
      content: [
        { type: "text", text: `${prompt}${efficientNetBlock}${voiceBlock}${lipsyncBlock}\n\n--- Resultado do Agente de Detecção ---\n${detectionResult}\n${hasAI ? "\n⚠️ O agente detectou presença de IA. Sua análise DEVE incluir: 'Há presença de IA neste conteúdo.'" : ""}\n\n--- Com base nisso (e na análise EfficientNet quando presente), produza a análise final completa. ---` },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ];

  return analyzeWithAI(synthesisMessages, imageDataUrl, { models, openRouterOnly });
}

/** Pipeline Câmera Forense: Agentes de raciocínio para leitura da situação gravada */
async function analyzeCameraWithAgents(prompt, imageDataUrl, isVideoFrames = false, options = {}) {
  const usePremiumModels = options.usePremiumModels === true;
  const models = usePremiumModels ? PREMIUM_MODELS : undefined;
  const opts = models ? { models } : {};
  const situationMessages = [
    {
      role: "system",
      content: `Você é um agente de LEITURA DE SITUAÇÃO. Analise a cena capturada pela câmera forense.
Responda em 2-4 frases: O que está acontecendo? Quem ou o quê aparece? Há elementos suspeitos (IA, deepfake, manipulação)?
Seja direto. Ex: "Pessoa em ambiente interno. Rosto visível. Sem indicadores óbvios de IA."`
    },
    {
      role: "user",
      content: [
        { type: "text", text: isVideoFrames ? "Analise os frames deste vídeo. Descreva a situação geral." : prompt },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ];

  const situationResult = await analyzeWithAI(situationMessages, imageDataUrl, opts);
  const hasAI = /sim|SIM|IA|gerado|artificial|deepfake|manipula/i.test(situationResult);

  const synthesisMessages = [
    {
      role: "system",
      content: `Você é o analista forense do RealityScan CAPTURA FORENSE. Produza a análise final da situação gravada.
RESPONDA EM PORTUGUÊS (BRASIL). Linguagem clara para leigos.

OBRIGATÓRIO: Se o Agente de Situação indicar presença de IA/deepfake/manipulação, inclua: "Há presença de IA neste conteúdo."

PESSOAS FAMOSAS: PRIORIDADE — cite TODAS que reconhecer, em MAIÚSCULAS. Quantas forem, todas devem ser citadas.

FORMATO:
**Análise:** (cite pessoas famosas em MAIÚSCULAS + descreva a situação + SE HOUVER IA: "Há presença de IA neste conteúdo.")
**Nível de Risco:** XX%
**Motivo:** (por que é seguro ou suspeito)
**Orientação:** (o que o usuário deve fazer, se aplicável)`
    },
    {
      role: "user",
      content: [
        { type: "text", text: `${prompt}\n\n--- Leitura da Situação ---\n${situationResult}\n${hasAI ? "\n⚠️ O agente detectou possível IA/manipulação." : ""}\n\n--- Produza a análise final completa. ---` },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ];

  return analyzeWithAI(synthesisMessages, imageDataUrl, opts);
}

/** Extrai % de risco do texto. Prioriza "Nível de Risco:" ou "Risco:" para evitar pegar número errado. */
function extractRiskFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const riskLine = text.match(/\*\*N[íi]vel de Risco:\*\*\s*(\d{1,3})\s*%?/i) || text.match(/\*\*Risco:\*\*\s*(\d{1,3})\s*%?/i) || text.match(/risco[:\s]+(\d{1,3})\s*%?/i);
  if (riskLine) return parseInt(riskLine[1], 10);
  const anyPercent = text.match(/(\d{1,3})\s*%/);
  return anyPercent ? parseInt(anyPercent[1], 10) : null;
}

/** Extrai a primeira URL encontrada em um texto (http/https). */
function extractFirstUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  return m ? m[0].replace(/[.,;:)]+$/, '') : null;
}

const formatAnalysisResponse = (text, risk) => {
  const score = parseInt(risk, 10) || 0;
  const isAI = score > 50;
  const confidence = score > 80 || score < 20 ? 'HIGH' : score > 40 ? 'MEDIUM' : 'LOW';

  // Extrair findings: bullets (- ou *) OU conteúdo de **Análise:**, **Motivo:**, **Orientação:**
  let findings = text.split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map(line => line.replace(/^[-*]\s*/, '').trim());

  if (findings.length === 0) {
    const analise = text.match(/\*\*An[áa]lise:\*\*\s*([^\n*]+)/i);
    const motivo = text.match(/\*\*Motivo:\*\*\s*([^\n*]+)/i);
    const orientacao = text.match(/\*\*Orienta[çc][ãa]o:\*\*\s*([^\n*]+)/i);
    if (analise && analise[1].trim()) findings.push(analise[1].trim());
    if (motivo && motivo[1].trim()) findings.push(motivo[1].trim());
    if (orientacao && orientacao[1].trim()) findings.push(orientacao[1].trim());
  }
  if (findings.length === 0) {
    findings.push("Análise vetorial de artefatos concluída.");
    findings.push("Verificação de metadados e compressão.");
  }

  return {
    score,
    isAI,
    confidence,
    findings,
    verdict: text,
    analysis: text,
    scamAlert: score > 70 ? {
      type: "ALERTA CRÍTICO",
      riskLevel: "CRITICAL",
      description: "Padrões de fraude detectados com alta probabilidade."
    } : null
  };
};

app.post("/api/scan", scanLimiter, upload.single("file"), async (req, res) => {
  try {
    if (!(await isAIGloballyEnabled())) {
      return res.status(503).json({ error: "IA temporariamente desativada. Tente mais tarde." });
    }
    const userId = req.body?.userId || req.query?.userId;
    if (userId && await isUserBlocked(userId)) {
      return res.status(403).json({ error: "Sua conta foi bloqueada. Entre em contato com o suporte.", code: "BLOCKED" });
    }
    const deviceId = req.body?.deviceId || req.headers['x-device-id'];
    const ip = getClientIP(req);

    const paid = await isUserPaid(userId);
    const isFreeScan = !paid;

    if (isFreeScan) {
      if (!deviceId) {
        return res.status(403).json({ error: 'Limite gratuito: deviceId obrigatório.', code: 'NO_DEVICE' });
      }
      const check = await checkFreeScan(deviceId, ip);
      if (!check.allowed) {
        const msg = check.reason === 'LIMIT_GLOBAL'
          ? 'Limite gratuito atingido hoje. Tente amanhã.'
          : check.reason === 'LIMIT_IP'
            ? 'Limite por rede atingido. Assine para continuar.'
            : 'Você usou seus 3 scans gratuitos. Assine para continuar.';
        return res.status(403).json({ error: msg, code: check.reason });
      }
    }

    let prompt = "";
    let mediaData = null;

    if (req.file) {
      // Video → Deepfake API (EfficientNet) quando DEEPFAKE_API_URL configurada
      const isVideo = (req.file.mimetype || "").startsWith("video/");
      if (isVideo && process.env.DEEPFAKE_API_URL) {
        try {
          const df = await analyzeVideoDeepfake(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname || "video.mp4"
          );
          if (df) {
            const score = Math.round(df.fake * 100);
            const isAI = df.fake >= 0.5;
            const confidence = df.fake >= 0.8 || df.fake <= 0.2 ? "HIGH" : df.fake >= 0.4 ? "MEDIUM" : "LOW";
            const texto = `**Análise:** Detecção EfficientNet B7.\n**Nível de Risco:** ${score}%\n**Motivo:** ${df.resultado}\n**Orientação:** ${isAI ? "Conteúdo suspeito de manipulação. Evite compartilhar ou confiar sem verificação adicional." : "Análise concluída. Sem sinais fortes de deepfake."}`;
            const result = formatAnalysisResponse(texto, String(score));
            if (isFreeScan && deviceId) {
              try { await incrementFreeUsage(deviceId, ip); } catch (e) { console.warn("⚠️ incrementFreeUsage failed:", e.message); }
            }
            return res.json(result);
          }
        } catch (err) {
          console.warn("⚠️ Deepfake API falhou, usando IA padrão:", err.message);
        }
      }
      // Áudio → agente de voz (wav2vec2), mesmo sistema do Sentry
      const isAudio = (req.file.mimetype || "").startsWith("audio/");
      const voiceApiUrl = process.env.VOICE_API_URL || process.env.DEEPFAKE_API_URL;
      if (isAudio && voiceApiUrl) {
        try {
          const audioBase64 = req.file.buffer.toString("base64");
          const dataUrl = `data:${req.file.mimetype};base64,${audioBase64}`;
          const voiceResult = await analyzeAudioVoice(dataUrl, req.file.mimetype);
          if (voiceResult) {
            const pct = voiceResult.score_synthetic_pct ?? (voiceResult.synthetic != null ? voiceResult.synthetic * 100 : (voiceResult.fake != null ? voiceResult.fake * 100 : 0));
            const score = Math.round(Number(pct));
            const texto = `**Análise:** Detecção wav2vec2 (voz sintética/clonada).\n**Nível de Risco:** ${score}%\n**Motivo:** ${voiceResult.resultado || "Análise de áudio concluída."}\n**Orientação:** ${score >= 50 ? "Voz suspeita de ser sintética ou clonada. Evite confiar sem verificação adicional." : "Análise concluída. Sem sinais fortes de voz sintética."}`;
            const result = formatAnalysisResponse(texto, String(score));
            if (isFreeScan && deviceId) {
              try { await incrementFreeUsage(deviceId, ip); } catch (e) { console.warn("⚠️ incrementFreeUsage failed:", e.message); }
            }
            return res.json(result);
          }
        } catch (err) {
          console.warn("⚠️ Voice API (VoiceScan) falhou:", err.message);
        }
        if (isAudio) {
          return res.status(503).json({
            error: "Análise de voz temporariamente indisponível. Tente mais tarde.",
            verdict: "O serviço de detecção de voz sintética (wav2vec2) não está disponível.",
            score: 0,
            isAI: false,
            confidence: "LOW",
            findings: []
          });
        }
      }
      // Multipart upload (imagem ou fallback)
      const base64 = req.file.buffer.toString("base64");
      mediaData = {
        type: "image_url",
        image_url: { url: `data:${req.file.mimetype};base64,${base64}` }
      };
      prompt = "Analise este arquivo enviado pelo usuário. Identifique se é IA, deepfake ou golpe. Seja técnico.";
    } else {
      // JSON body
      const { texto, imagem, imagens, type, metadata, fileName, fileSize, fileType } = req.body;
      prompt = texto || "Analise esta situação.";
      // Layer 2 — Metadados EXIF: enriquece análise para detectar manipulação, software suspeito, ausência de dados
      if (metadata && typeof metadata === "object" && Object.keys(metadata).length > 0) {
        prompt += `\n\n--- METADADOS EXIF (analise para suspeitas) ---\n${JSON.stringify(metadata, null, 0)}`;
      }
      if (fileName || fileSize || fileType) {
        prompt += `\nArquivo: ${fileName || "?"} | ${fileSize || "?"} bytes | ${fileType || "?"}`;
      }
      if (Array.isArray(imagens) && imagens.length > 0) {
        mediaData = imagens.map((img) => ({
          type: "image_url",
          image_url: { url: img }
        }));
      } else if (imagem) {
        mediaData = {
          type: "image_url",
          image_url: { url: imagem }
        };
      }
    }

    const isSentry = req.body?.type === "sentry";
    const isCamera = req.body?.type === "camera";
    const hasVideoFrames = Array.isArray(req.body?.imagens) && req.body.imagens.length > 1;

    const videoFrameNote = hasVideoFrames
      ? "MODO VÍDEO: Você recebeu múltiplos frames de um VÍDEO. Analise o conteúdo como VÍDEO em reprodução, não como imagens estáticas isoladas. Descreva o que acontece no vídeo.\n\n"
      : "";

    const systemContent = isSentry
      ? `${videoFrameNote}Você é o analista forense do RealityScan SENTRY. Analise capturas de tela de redes sociais (feed, posts, vídeos).
RESPONDA SEMPRE EM PORTUGUÊS (BRASIL). Use linguagem CLARA para usuários leigos.

=== REGRA PRINCIPAL — EVITE FALSOS POSITIVOS ===
Conteúdo ORDINÁRIO (cozinha, decoração, música, selfie, pessoas reais em ambiente normal, gravação de câmera sem artefatos) = NÃO é IA. Risco baixo (0-30%). Não inclua "Há presença de IA" nesses casos.
Só marque IA quando houver EVIDÊNCIA TÉCNICA: artefatos visuais (mãos/olhos estranhos, texturas), cenas fisicamente impossíveis, conta declaradamente com "AI"/"Generated", ou legenda explícita "made with AI"/"criado com IA".

=== INDICADORES QUE SUGEREM IA ===
- Cenas impossíveis (gato levantando peso, animais em poses humanas)
- Artefatos visuais: mãos com dedos extras, olhos dessincronizados, texturas incoerentes
- Nome da conta com "AI", "Unfolded", "Generated" (não apenas "api" ou siglas comuns)
- Legenda explícita: "made with AI", "criado com IA", "humor/paródia com IA"

=== REGRAS ===
1. PRESENÇA DE IA: Inclua "Há presença de IA neste conteúdo." APENAS quando houver evidência clara. Conteúdo cotidiano sem sinais técnicos = risco baixo, NÃO incluir essa frase.

2. PESSOAS FAMOSAS: Cite TODAS que reconhecer em MAIÚSCULAS.

3. Descreva exatamente o que está visível. Nunca invente legendas.

FORMATO:
**Análise:** (cite pessoas famosas em MAIÚSCULAS, contexto. SE HOUVER IA com evidência: "Há presença de IA neste conteúdo." Caso contrário, descreva sem essa frase.)
**Nível de Risco:** XX% (0-30 para conteúdo ordinário/real, 50+ só com evidência de IA)
**Motivo:** (por que é seguro ou suspeito)
**Orientação:** (o que o usuário deve fazer, se aplicável)

Sempre inclua a porcentagem de risco (0-100%).`
      : `Você é a IA oficial do NGT. RESPONDA SEMPRE EM PORTUGUÊS (BRASIL).
Sua função é analisar mensagens, prints e situações digitais e identificar golpes, fraudes e engenharia social.
Sempre responda neste formato:
**Análise:** (explicação técnica clara)
**Nível de Risco:** XX%
**Motivo:** (por que é golpe ou seguro)
**Orientação:** (o que o usuário deve fazer)
REGRAS:
- PESSOAS FAMOSAS: Cite TODAS que reconhecer em MAIÚSCULAS. Quantas forem, todas devem ser citadas.
- Sempre calcular risco de 0 a 100%
- Nunca responder sem porcentagem
- Seja direto, profissional e perito digital`;

    const userContent = mediaData
      ? [ { type: "text", text: prompt }, ...(Array.isArray(mediaData) ? mediaData : [mediaData]) ]
      : prompt;

    const messages = [
      { role: "system", content: systemContent },
      { role: "user", content: userContent }
    ];

    const imageDataUrl = Array.isArray(mediaData)
      ? (mediaData[0]?.image_url?.url || null)
      : (mediaData?.image_url?.url || null);

    let texto;
    let sentryDfScore = 0; // EfficientNet score para merge com risco (Sentry)
    const useVideoFrames = (isSentry || isCamera) && Array.isArray(mediaData) && mediaData.length > 1;
    if (isCamera && imageDataUrl && !useVideoFrames) {
      try {
        texto = await analyzeCameraWithAgents(prompt, imageDataUrl, false, { usePremiumModels: paid });
      } catch (err) {
        console.warn("⚠️ Pipeline Câmera falhou, usando análise única:", err.message);
        texto = await analyzeWithAI(messages, imageDataUrl, paid ? { models: PREMIUM_MODELS } : {});
      }
    } else if (isCamera && useVideoFrames && mediaData?.[0]?.image_url?.url) {
      try {
        texto = await analyzeCameraWithAgents(prompt, mediaData[0].image_url.url, true, { usePremiumModels: paid });
      } catch (err) {
        console.warn("⚠️ Pipeline Câmera (vídeo) falhou:", err.message);
        texto = await analyzeWithAI(messages, mediaData[0].image_url.url, paid ? { models: PREMIUM_MODELS } : {});
      }
    } else if (isSentry && (imageDataUrl || mediaData?.[0]?.image_url?.url)) {
      const sentryImg = imageDataUrl || mediaData?.[0]?.image_url?.url;
      const sentryOpts = { usePremiumModels: paid };
      const sentryFrames = Array.isArray(mediaData) ? mediaData.map((m) => m?.image_url?.url).filter(Boolean) : [];
      // EfficientNet como análise principal: usar com 1 ou mais frames (antes só 2+)
      const framesForEfficientNet = sentryFrames.length >= 1 ? sentryFrames : (sentryImg ? [sentryImg] : []);
      const hasEfficientNetInput = framesForEfficientNet.length >= 1;

      // EfficientNet (análise principal visual) + Voice (wav2vec) + SyncNet (lip-sync) em paralelo
      const sentryAudio = req.body?.audio;
      const hasSentryAudio = sentryAudio && typeof sentryAudio === "string" && sentryAudio.includes("base64,");
      const apiUrl = process.env.VOICE_API_URL || process.env.DEEPFAKE_API_URL;
      if (hasEfficientNetInput && !apiUrl) {
        console.warn("⚠️ [Sentry] DEEPFAKE_API_URL não configurada no .env.local — EfficientNet não será chamado.");
      }
      const [dfResult, voiceResult, lipsyncResult] = await Promise.all([
        hasEfficientNetInput && apiUrl
          ? analyzeFramesDeepfake(framesForEfficientNet).catch((err) => {
              console.warn("⚠️ [Sentry] Deepfake API falhou:", err.message);
              return null;
            })
          : Promise.resolve(null),
        hasSentryAudio && apiUrl
          ? analyzeAudioVoice(sentryAudio, "audio/webm").catch((err) => {
              console.warn("⚠️ [Sentry] Voice API falhou:", err.message);
              return null;
            })
          : Promise.resolve(null),
        sentryFrames.length >= 2 && hasSentryAudio && apiUrl
          ? analyzeLipsyncSentry(sentryFrames, sentryAudio).catch((err) => {
              console.warn("⚠️ [Sentry] Lipsync API falhou:", err.message);
              return null;
            })
          : Promise.resolve(null),
      ]);

      try {
        texto = await analyzeSentryWithAgents(prompt, sentryImg, {
          ...sentryOpts,
          efficientNetResult: dfResult,
          voiceResult,
          lipsyncResult,
        });
      } catch (err) {
        console.warn("⚠️ Pipeline Sentry falhou, usando análise única:", err.message);
        const m = paid ? PREMIUM_MODELS : SENTRY_FREE_MODELS;
        texto = await analyzeWithAI(messages, sentryImg, { models: m, openRouterOnly: !paid });
      }

      // Integra EfficientNet + Voz (wav2vec) na precisão do Sentry (score final)
      if (dfResult && (dfResult.score_fake_pct != null || dfResult.fake != null)) {
        const pct = dfResult.score_fake_pct ?? (dfResult.fake != null ? dfResult.fake * 100 : 0);
        sentryDfScore = Math.max(sentryDfScore, pct);
        const dfNote = `\n\n--- Validação EfficientNet B7 ---\nDetector de deepfake: ${dfResult.resultado || 'N/A'} (${Number(pct).toFixed(1)}% prob. fake).`;
        texto = texto + dfNote;
      }
      if (voiceResult && (voiceResult.score_synthetic_pct ?? voiceResult.synthetic * 100) >= 30) {
        const vPct = voiceResult.score_synthetic_pct ?? (voiceResult.synthetic != null ? voiceResult.synthetic * 100 : 0);
        sentryDfScore = Math.max(sentryDfScore, vPct);
        const vNote = `\n\n--- Validação wav2vec2 (voz) ---\nDetector de voz sintética: ${voiceResult.resultado || 'indeterminado'} (${vPct.toFixed(1)}% prob. sintética).`;
        texto = texto + vNote;
      }
      if (lipsyncResult && lipsyncResult.ok && lipsyncResult.suspicious) {
        sentryDfScore = Math.max(sentryDfScore, 60);
        const lsNote = `\n\n--- Validação SyncNet (lip-sync) ---\n${lipsyncResult.resultado || 'Dessincronia boca/áudio detectada - suspeito de manipulação.'}`;
        texto = texto + lsNote;
      }
    } else {
      const scanOpts = paid ? { models: PREMIUM_MODELS } : {};
      texto = await analyzeWithAI(messages, imageDataUrl, scanOpts);
    }
    
    const extractedRisk = extractRiskFromText(texto);
    let riskNum = extractedRisk != null ? extractedRisk : 0;
    // Só força 50% quando a IA afirmar CONCLUSIVAMENTE presença de IA e o risco extraído for baixo
    const afirmaIA = /Há presença de IA neste conteúdo|presença de IA neste conteúdo/i.test(texto);
    if (afirmaIA && riskNum < 50) {
      riskNum = 50;
    }
    let risco = String(riskNum);

    // Sentry: combina com EfficientNet para maior precisão
    if (isSentry && sentryDfScore > 0 && sentryDfScore > riskNum) {
      riskNum = Math.round(sentryDfScore);
      risco = String(riskNum);
    }

    const result = formatAnalysisResponse(texto, risco);

    if (isSentry && riskNum >= 50) {
      const sentryImg = imageDataUrl || mediaData?.[0]?.image_url?.url;
      if (sentryImg) {
        const indicatorsDetail = await generateSentryIndicatorsDetail(sentryImg, texto, prompt);
        if (indicatorsDetail) result.indicatorsDetail = indicatorsDetail;
      }
      // Enviar imediatamente ao database quando marcado como IA
      if (userId && userId !== "guest" && db) {
        try {
          const sanitized = { ...result };
          delete sanitized.mediaUrl;
          const videoLink = req.body?.videoLink && typeof req.body.videoLink === 'string' && req.body.videoLink.trim()
            ? req.body.videoLink.trim()
            : extractFirstUrl(result.verdict || result.analysis);
          if (videoLink) {
            sanitized.videoLink = videoLink;
            result.videoLink = videoLink;
          }
          Object.keys(sanitized).forEach(k => { if (sanitized[k] === undefined) delete sanitized[k]; });
          const now = new Date();
          await db.collection("users").doc(userId).collection("analyses").add({
            ...sanitized,
            isAI: true,
            source: "Terminal Sentry",
            timestamp: now.toISOString(),
            date: now.toLocaleDateString("pt-BR"),
            time: now.toLocaleTimeString("pt-BR")
          });
          console.log(`📥 [Sentry] Análise com IA salva para user ${userId}`);
        } catch (e) {
          console.warn("⚠️ [Sentry] Falha ao salvar análise:", e.message);
        }
      }
    }

    if (isFreeScan && deviceId) {
      try {
        await incrementFreeUsage(deviceId, ip);
      } catch (e) {
        console.warn("⚠️ incrementFreeUsage failed:", e.message);
      }
    }

    res.json(result);

  } catch (err) {
    console.error("❌ ERRO SCAN:", err);
    res.status(500).json({ verdict: "Erro na análise forense", score: 0, isAI: false, confidence: 'LOW', findings: [] });
  }
});

// ================================
// 🔑 API PÚBLICA v1 - Desenvolvedores (x-api-key)
// ================================
const API_PLANS = {
  free: { requestsPerDay: 50, requestsPerMonth: 50, billingCycle: 'daily', trialRequests: 500, trialDays: 7 },
  basic: { requestsPerMonth: 5000, billingCycle: 'monthly' },
  pro: { requestsPerMonth: 20000, billingCycle: 'monthly' },
  enterprise: { requestsPerMonth: -1, custom: true, billingCycle: 'monthly' },
};

async function getApiUserByKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('sk_live_') || !db) return null;
  const snap = await db.collection('api_users').where('apiKey', '==', apiKey).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

async function checkAndIncrementApiUsage(apiUser) {
  if (!apiUser || !db) return { allowed: false };
  const plan = apiUser.plan || 'free';
  const config = API_PLANS[plan] || API_PLANS.free;
  const ref = db.collection('api_users').doc(apiUser.id);
  const snap = await ref.get();
  if (!snap.exists) return { allowed: false };
  const data = snap.data();
  const now = new Date();

  // Trial: plano free nos primeiros 7 dias = 500 requests grátis
  const trialDays = (config.trialDays ?? 0);
  const trialRequests = (config.trialRequests ?? 0);
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
  const trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : (createdAt && trialDays ? new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000) : null);
  const inTrial = trialEndsAt && now < trialEndsAt && trialRequests > 0;
  if (inTrial) {
    const trialUsed = (data.trialRequestsUsed || 0) + 1;
    if (trialUsed > trialRequests) return { allowed: false, remaining: 0 };
    await ref.update({
      trialRequestsUsed: admin.firestore.FieldValue.increment(1),
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { allowed: true, remaining: trialRequests - trialUsed };
  }

  const limitVal = config.requestsPerDay ?? config.requestsPerMonth;
  if (limitVal < 0) return { allowed: true };
  const billingCycle = data.billingCycle || 'daily';
  const renewDate = data.renewDate || '';
  const today = new Date().toISOString().slice(0, 10);
  const renew = renewDate ? new Date(renewDate) : now;
  const needsReset = billingCycle === 'daily'
    ? renewDate !== today
    : renew.getMonth() !== now.getMonth() || renew.getFullYear() !== now.getFullYear();
  if (needsReset) {
    const nextRenew = billingCycle === 'daily'
      ? today
      : new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
    await ref.update({ requestsUsed: 1, renewDate: nextRenew });
    return { allowed: true, remaining: limitVal - 1 };
  }
  const used = (data.requestsUsed || 0) + 1;
  if (used > limitVal) return { allowed: false, remaining: 0 };
  await ref.update({ requestsUsed: admin.firestore.FieldValue.increment(1) });
  return { allowed: true, remaining: limitVal - used };
}

async function logApiRequest(apiKeyId, endpoint, opts = {}) {
  if (!db) return;
  try {
    await db.collection('api_logs').add({
      apiKeyId,
      apiUserId: apiKeyId,
      userId: apiKeyId,
      endpoint,
      model: opts.model,
      tokensInput: opts.tokensInput,
      tokensOutput: opts.tokensOutput,
      costEstimated: opts.costEstimated,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[API] logApiRequest:', e.message);
  }
}

async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'x-api-key header required' });
  }
  const apiUser = await getApiUserByKey(apiKey);
  if (!apiUser) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  if (!apiUser.active) {
    return res.status(403).json({ error: 'API key inactive' });
  }
  const usage = await checkAndIncrementApiUsage(apiUser);
  if (!usage.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Upgrade your plan.' });
  }
  req.apiUser = apiUser;
  req.apiUsage = usage;
  next();
}

// POST /api/v1/generate - Geração de texto
app.post("/api/v1/generate", apiByIpLimiter, apiKeyMiddleware, async (req, res) => {
  try {
    if (!(await isAIGloballyEnabled())) {
      return res.status(503).json({ error: 'AI temporarily disabled' });
    }
    const { prompt, model = 'google/gemini-2.0-flash-001' } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const messages = [
      { role: 'system', content: 'You are a helpful assistant. Respond concisely.' },
      { role: 'user', content: prompt.trim() }
    ];
    const texto = await callOpenRouter(messages, model);
    await logApiRequest(req.apiUser.id, '/api/v1/generate', { model });
    res.json({ text: texto, model });
  } catch (err) {
    console.error('[API v1 generate]', err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// POST /api/v1/analyze - Análise de imagem/vídeo (forense)
app.post("/api/v1/analyze", apiByIpLimiter, apiKeyMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!(await isAIGloballyEnabled())) {
      return res.status(503).json({ error: 'AI temporarily disabled' });
    }
    let imageDataUrl = null;
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      imageDataUrl = `data:${req.file.mimetype};base64,${base64}`;
    } else if (req.body?.image) {
      imageDataUrl = req.body.image;
    } else if (req.body?.imagens?.[0]) {
      imageDataUrl = req.body.imagens[0];
    }
    if (!imageDataUrl) {
      return res.status(400).json({ error: 'image, file or imagens[0] required' });
    }
    const prompt = req.body?.prompt || 'Analise esta imagem. Identifique IA, deepfake ou golpe. Seja técnico.';
    const mediaData = [{ type: 'image_url', image_url: { url: imageDataUrl } }];
    const messages = [
      { role: 'system', content: 'Você é analista forense. Analise a imagem e responda em português. Formato: **Análise:** ... **Nível de Risco:** XX% **Motivo:** ... **Orientação:** ...' },
      { role: 'user', content: [{ type: 'text', text: prompt }, ...mediaData] }
    ];
    const texto = await analyzeWithAI(messages, imageDataUrl, { models: PREMIUM_MODELS });
    const match = texto.match(/(\d{1,3})%/);
    const score = match ? parseInt(match[1]) : 0;
    await logApiRequest(req.apiUser.id, '/api/v1/analyze', { model: 'forensic' });
    res.json({ verdict: texto, score, isAI: score >= 50 });
  } catch (err) {
    console.error('[API v1 analyze]', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// POST /api/v1/voice - Placeholder (TTS/stt futuro)
app.post("/api/v1/voice", apiByIpLimiter, apiKeyMiddleware, async (req, res) => {
  try {
    await logApiRequest(req.apiUser.id, '/api/v1/voice');
    res.json({ message: 'Voice API coming soon', endpoint: '/api/v1/voice' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================
// 👤 API Users - Gestão (requer Firebase ID token)
// ================================
async function requireFirebaseAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization: Bearer <idToken> required' });
  }
  const idToken = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.get("/api/api-users/me", requireFirebaseAuth, async (req, res) => {
  try {
    const ref = db.collection('api_users').doc(`u_${req.uid}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.json({ exists: false, apiKey: null, plan: 'free', requestsUsed: 0, requestLimit: 50 });
    }
    const d = snap.data();
    const key = d.apiKey ? `${d.apiKey.slice(0, 12)}...${d.apiKey.slice(-4)}` : null;
    return res.json({
      exists: true,
      apiKeyMasked: key,
      apiKey: d.apiKey,
      plan: d.plan || 'free',
      requestsUsed: d.requestsUsed || 0,
      requestLimit: d.requestLimit || 50,
      renewDate: d.renewDate,
      active: d.active !== false,
    });
  } catch (err) {
    console.error('[api-users/me]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/api-users/init", requireFirebaseAuth, async (req, res) => {
  try {
    const ref = db.collection('api_users').doc(`u_${req.uid}`);
    const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data();
      return res.json({
        created: false,
        apiKey: d.apiKey,
        plan: d.plan || 'free',
        requestsUsed: d.requestsUsed || 0,
        requestLimit: d.requestLimit || 50,
      });
    }
    const apiKey = 'sk_live_' + require('crypto').randomBytes(24).toString('hex').slice(0, 32);
    const today = new Date().toISOString().slice(0, 10);
    await ref.set({
      email: req.email || '',
      apiKey,
      plan: 'free',
      requestsUsed: 0,
      requestLimit: 50,
      billingCycle: 'daily',
      renewDate: today,
      createdAt: new Date().toISOString(),
      active: true,
      userId: req.uid,
    });
    return res.json({
      created: true,
      apiKey,
      plan: 'free',
      requestsUsed: 0,
      requestLimit: 50,
    });
  } catch (err) {
    console.error('[api-users/init]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/api-users/regenerate", requireFirebaseAuth, async (req, res) => {
  try {
    const ref = db.collection('api_users').doc(`u_${req.uid}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'API user not found. Call init first.' });
    }
    const apiKey = 'sk_live_' + require('crypto').randomBytes(24).toString('hex').slice(0, 32);
    await ref.update({ apiKey, apiKeyUpdatedAt: new Date().toISOString() });
    return res.json({ apiKey });
  } catch (err) {
    console.error('[api-users/regenerate]', err);
    res.status(500).json({ error: err.message });
  }
});

// System prompts for Reasoning Agent (sincere, truthful, realistic, human flow)
const REASONING_AGENT_BASE = {
  PT: `Você é o Agente de Raciocínio NGT. Suas características fundamentais:
- SINCERO: Nunca mente. Se não souber, diga "Não tenho certeza" ou "Preciso de mais informações".
- VERDADEIRO: Baseie respostas em fatos e análise lógica. Não invente dados.
- REALISTA: Seja pragmático. Evite exageros ou dramatização.
- CONVERSAS REAIS: Fale como um perito humano, natural e direto.

ESTILO E TAMANHO:
- Prefira respostas curtas a médias (2-4 parágrafos no máximo). Evite laudos ou relatórios longos.
- Converse como um humano. Não use formatação excessiva nem pareça artificial ou burocrático.
- Pode explicar detalhes quando necessário, mas saiba quando parar. Fluxo natural, não robótico.
- Evite listas longas e repetição. Seja direto ao ponto sem perder o essencial.

Sua função: analisar suspeitas digitais, golpes, fraudes e engenharia social.
PESSOAS FAMOSAS: Ao analisar imagens ou menções, cite TODAS as celebridades/políticos/atores que reconhecer, em MAIÚSCULAS.
RESPONDA SEMPRE EM PORTUGUÊS (BRASIL).`,
  EN: `You are the NGT Reasoning Agent. Your core traits:
- SINCERE: Never lie. If unsure, say "I'm not certain" or "I need more information".
- TRUTHFUL: Base answers on facts and logical analysis. Do not invent data.
- REALISTIC: Be pragmatic. Avoid exaggeration or dramatization.
- REAL CONVERSATIONS: Speak like a human expert, natural and direct.

STYLE AND LENGTH:
- Prefer short to medium responses (2-4 paragraphs max). Avoid long reports or formal briefs.
- Converse like a human. Don't over-format or sound artificial or bureaucratic.
- You can elaborate when needed, but know when to stop. Natural flow, not robotic.
- Avoid long lists and repetition. Get to the point without losing the essentials.

Your function: analyze digital suspicions, scams, fraud and social engineering.
ALWAYS RESPOND IN ENGLISH.`,
  ES: `Eres el Agente de Razonamiento NGT. Tus rasgos fundamentales:
- SINCERO: Nunca mientas. Si no sabes, di "No estoy seguro" o "Necesito más información".
- VERAZ: Basa respuestas en hechos y análisis lógico. No inventes datos.
- REALISTA: Sé pragmático. Evita exageraciones.
- CONVERSACIONES REALES: Habla como un experto humano, natural y directo.

ESTILO Y EXTENSIÓN:
- Prefiere respuestas cortas a medianas (2-4 párrafos máximo). Evita informes largos o formales.
- Conversa como un humano. No uses formato excesivo ni suenes artificial o burocrático.
- Puedes explicar detalles cuando haga falta, pero sabe cuándo parar. Flujo natural, no robótico.
- Evita listas largas y repetición. Ve al grano sin perder lo esencial.

Tu función: analizar sospechas digitales, estafas y ingeniería social.
RESPONDE SIEMPRE EN ESPAÑOL.`
};

const REASONING_AGENT_ADVANCED = {
  PT: "Modo Advanced: Pode aprofundar quando o tema exigir, mas mantenha o tom conversacional. Evite parecer relatório.",
  EN: "Advanced mode: You can go deeper when the topic demands it, but keep a conversational tone. Avoid sounding like a report.",
  ES: "Modo Advanced: Puedes profundizar cuando el tema lo exija, pero mantén el tono conversacional. Evita parecer informe."
};

const REASONING_AGENT_BUSINESS = {
  PT: "Modo Business: Linguagem profissional mas ainda humana. Estruture quando fizer sentido, sem exagerar em formalidade.",
  EN: "Business mode: Professional but still human language. Structure when it makes sense, without overdoing formality.",
  ES: "Modo Business: Lenguaje profesional pero aún humano. Estructura cuando tenga sentido, sin exagerar la formalidad."
};

// ================================
// 🏢 IA CORPORATIVA - Base de conhecimento por empresa (plano Business)
// ================================
app.get("/api/corporate-knowledge", requireFirebaseAuth, async (req, res) => {
  try {
    const userSnap = await db.collection("users").doc(req.uid).get();
    const plan = userSnap.exists ? (userSnap.data()?.planId || "").toLowerCase() : "";
    if (!plan.startsWith("business")) {
      return res.status(403).json({ error: "Acesso exclusivo ao plano Business." });
    }
    const knowledge = userSnap.exists ? (userSnap.data()?.corporateKnowledge || "") : "";
    res.json({ knowledge });
  } catch (e) {
    console.error("[corporate-knowledge GET]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/corporate-knowledge", requireFirebaseAuth, async (req, res) => {
  try {
    const userSnap = await db.collection("users").doc(req.uid).get();
    const plan = userSnap.exists ? (userSnap.data()?.planId || "").toLowerCase() : "";
    if (!plan.startsWith("business")) {
      return res.status(403).json({ error: "Acesso exclusivo ao plano Business." });
    }
    const { knowledge = "" } = req.body;
    const text = (typeof knowledge === "string" ? knowledge : "").slice(0, 50000); // limite 50k caracteres
    await db.collection("users").doc(req.uid).set(
      { corporateKnowledge: text, corporateKnowledgeUpdatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("[corporate-knowledge POST]", e);
    res.status(500).json({ error: e.message });
  }
});

const REASONING_AGENT_CORPORATE = {
  PT: "Modo Corporativo: Você é a IA interna exclusiva da empresa. Use a base de conhecimento abaixo para responder com precisão sobre processos, políticas e dados da empresa. Mantenha tom profissional e confidencial.",
  EN: "Corporate mode: You are the company's exclusive internal AI. Use the knowledge base below to answer accurately about processes, policies and company data. Maintain a professional and confidential tone.",
  ES: "Modo Corporativo: Eres la IA interna exclusiva de la empresa. Usa la base de conocimiento abajo para responder con precisión sobre procesos, políticas y datos de la empresa. Mantén tono profesional y confidencial."
};

app.post("/api/ai", async (req, res) => {
  try {
    if (!(await isAIGloballyEnabled())) {
      return res.status(503).json({ resposta: "IA temporariamente desativada. Tente mais tarde." });
    }
    console.log("🧠 Enviando para OpenRouter...");

    const { prompt, agentMode = "advanced", chatLang = "PT", messages: history = [] } = req.body;
    const userPrompt = (typeof prompt === "string" && prompt.trim()) ? prompt.trim() : null;

    let systemContent;
    if (agentMode === "corporate") {
      const decoded = await verifyUserToken(req);
      if (!decoded?.uid) {
        return res.status(401).json({ resposta: "Faça login para usar o Agente Corporativo." });
      }
      const userSnap = await db.collection("users").doc(decoded.uid).get();
      const plan = userSnap.exists ? (userSnap.data()?.planId || "").toLowerCase() : "";
      if (!plan.startsWith("business")) {
        return res.status(403).json({ resposta: "O Agente Corporativo é exclusivo do plano Business. Faça upgrade para acessar." });
      }
      const knowledge = userSnap.exists ? (userSnap.data()?.corporateKnowledge || "") : "";
      const corpPrompt = REASONING_AGENT_CORPORATE[chatLang] || REASONING_AGENT_CORPORATE.PT;
      systemContent = knowledge.trim()
        ? `${corpPrompt}\n\n--- BASE DE CONHECIMENTO DA EMPRESA ---\n${knowledge.trim()}\n--- FIM DA BASE ---\n\nResponda sempre com base nessa base quando relevante.`
        : `${corpPrompt}\n\nNenhuma base de conhecimento configurada ainda. Sugira ao usuário configurar em Perfil > Base Corporativa.`;
    } else {
      const basePrompt = REASONING_AGENT_BASE[chatLang] || REASONING_AGENT_BASE.PT;
      const modePrompt = agentMode === "business"
        ? (REASONING_AGENT_BUSINESS[chatLang] || REASONING_AGENT_BUSINESS.PT)
        : (REASONING_AGENT_ADVANCED[chatLang] || REASONING_AGENT_ADVANCED.PT);
      systemContent = `${basePrompt}\n\n${modePrompt}\n\nQuando analisar golpe/fraude, inclua de forma natural: análise breve, risco (XX%), motivo e orientação. Sem formatação rígida — fluxo de conversa.`;
    }

    const historyMapped = (Array.isArray(history) ? history : [])
      .filter(m => m && (m.text || m.content))
      .map(m => ({
        role: (m.role === "model" || m.role === "assistant") ? "assistant" : "user",
        content: m.text || m.content
      }));

    const apiMessages = [
      { role: "system", content: systemContent },
      ...historyMapped,
      ...(userPrompt ? [{ role: "user", content: userPrompt }] : [])
    ];

    if (apiMessages.length < 2) {
      return res.status(400).json({ resposta: "Mensagem vazia." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiConfig.openrouter_key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://realityscan.app", 
        "X-Title": "NGT"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: apiMessages



      })
    });




    const data = await response.json();

    console.log("🔥 RESPOSTA OPENROUTER COMPLETA:", data);

    let texto = "Erro na resposta da IA";

    // formato 1
    if (data.choices?.[0]?.message?.content) {
      texto = data.choices[0].message.content;
    }

    // formato 2 fallback
    if (data.choices?.[0]?.text) {
      texto = data.choices[0].text;
    }

    

// formato 1
if (data.choices?.[0]?.message?.content) {
  texto = data.choices[0].message.content;
}

// fallback
if (data.choices?.[0]?.text) {
  texto = data.choices[0].text;
}

// ===== NOVO BLOCO =====
let risco = null;

const match = texto.match(/(\d{1,3})%/);
if (match) risco = match[1];

res.json({
  resposta: texto,
  risco: risco || "0"
});


  } catch (err) {
    console.log("❌ ERRO OPENROUTER:", err);
    res.status(500).json({ resposta: "Erro na IA" });
  }
});


          

    
    
    
    
    

/* =========================
   PAGAMENTO MERCADO PAGO
   back_urls e notification_url usam MP_BASE (ou APP_URL no .env)
 ========================= */
const MP_BASE = process.env.APP_URL || "https://unfractured-jayne-nonhyperbolically.ngrok-free.dev";
const REFERRAL_REWARD_CREDITS = 5;

async function getReferrerIdByCode(referralCode) {
  if (!referralCode || !db) return null;
  const snap = await db.collection("users").where("referralCode", "==", String(referralCode).trim()).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function creditReferrer(referrerId, referredUserId, planId, purchaseType) {
  if (!referrerId || !referredUserId || referrerId === referredUserId || !db) return;
  try {
    const existing = await db.collection("referrals").where("referrerId", "==", referrerId).where("referredUserId", "==", referredUserId).limit(1).get();
    if (!existing.empty) return;
    const userRef = db.collection("users").doc(referrerId);
    await userRef.set({
      credits: admin.firestore.FieldValue.increment(REFERRAL_REWARD_CREDITS),
      referralCount: admin.firestore.FieldValue.increment(1),
      referralCreditsEarned: admin.firestore.FieldValue.increment(REFERRAL_REWARD_CREDITS),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await db.collection("referrals").add({
      referrerId,
      referredUserId,
      rewardCredits: REFERRAL_REWARD_CREDITS,
      status: "completed",
      planId: planId || null,
      purchaseType: purchaseType || "subscription",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`🎁 [Referral] +${REFERRAL_REWARD_CREDITS} scans para ${referrerId} (indicou ${referredUserId})`);
  } catch (e) {
    console.error("[Referral] Erro ao creditar:", e.message);
  }
}

app.post("/api/criar-pagamento", async (req, res) => {
  try {
    const { userId, planId, type, amount, referralCode } = req.body;
    
    if (!userId || userId === 'guest') {
      return res.status(400).json({ erro: "Login necessário para upgrade." });
    }
    if (await isUserBlocked(userId)) {
      return res.status(403).json({ erro: "Sua conta foi bloqueada. Entre em contato com o suporte." });
    }

    const effectivePlanId = planId || (type === 'credits' && amount ? `credits_${amount}` : 'advanced');
    
    const prices = {
  // planos mensais (app)
  advanced: 21.90,
  advanced_annual: 240.90,
  business: 34.90,
  business_annual: 383.90,

  // créditos
  credits_5: 8,
  credits_20: 28,
  credits_50: 58,

  // planos API (desenvolvedores)
  api_basic: 49.90,
  api_pro: 149.90,
  api_enterprise: 499.90
};

    const unitPrice = prices[effectivePlanId] ?? 21.90;
    const preference = new Preference(mpClient);

    const mpBase = MP_BASE || BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const result = await preference.create({
      body: {
        items: [{
          id: effectivePlanId,
          title: effectivePlanId.startsWith('api_')
            ? `RealityScan API - ${(effectivePlanId.replace('api_', '') || 'plan').toUpperCase()}`
            : `RealityScan - ${(effectivePlanId || 'plan').toUpperCase()}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: unitPrice
        }],
        back_urls: {
          success: `${mpBase.replace(/\/$/, '')}/pagamento-aprovado`,
          failure: `${mpBase.replace(/\/$/, '')}/`,
          pending: `${mpBase.replace(/\/$/, '')}/`
        },
        auto_return: "approved",
        external_reference: referralCode ? `${userId}::${effectivePlanId}::${referralCode}` : `${userId}::${effectivePlanId}`,
        metadata: {
          user_id: userId,
          plan_id: effectivePlanId,
          referral_code: referralCode || ""
        },
        notification_url: `${mpBase.replace(/\/$/, '')}/api/webhook`
      }
    });

    console.log(`💳 Preferência criada para ${userId} (${effectivePlanId})`);
    res.json({ init_point: result.init_point });
  } catch (error) {
    console.error("❌ Erro ao criar preferência:", error);
    res.status(500).json({ erro: error.message });
  }
});

/* =========================
   PAGAMENTO PAYPAL
 ========================= */
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${apiConfig.paypal_client_id}:${apiConfig.paypal_client_secret}`).toString("base64");
  const r = await fetch(`${getPayPalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await r.json();
  if (!data.access_token) throw new Error(data.error_description || "Falha ao obter token PayPal");
  return data.access_token;
}

app.post("/api/criar-pagamento-paypal", async (req, res) => {
  try {
    if (!apiConfig.paypal_client_id || !apiConfig.paypal_client_secret) {
      return res.status(503).json({ erro: "PayPal não configurado. Defina no Firestore (config/apiKeys) ou .env.local" });
    }
    const { userId, planId, type, amount, referralCode } = req.body;
    if (!userId || userId === "guest") {
      return res.status(400).json({ erro: "Login necessário para upgrade." });
    }
    if (await isUserBlocked(userId)) {
      return res.status(403).json({ erro: "Sua conta foi bloqueada. Entre em contato com o suporte." });
    }
    const effectivePlanId = planId || (type === "credits" && amount ? `credits_${amount}` : "advanced");
    const unitPrice = PRICES_USD[effectivePlanId] ?? PRICES_USD.advanced;
    const token = await getPayPalAccessToken();
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: effectivePlanId,
        description: `RealityScan - ${(effectivePlanId || "plan").toUpperCase()}`,
        custom_id: userId,
        amount: {
          currency_code: "USD",
          value: String(unitPrice.toFixed(2)),
        },
      }],
      application_context: {
        brand_name: "RealityScan",
        landing_page: "NO_PREFERENCE",
        return_url: `${BASE_URL}/api/paypal-return`,
        cancel_url: `${FRONTEND_URL}/`,
      },
    };
    const createRes = await fetch(`${getPayPalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await createRes.json();
    if (!orderData.id) {
      console.error("PayPal create order error:", orderData);
      return res.status(500).json({ erro: orderData.message || "Erro ao criar ordem PayPal" });
    }
    if (referralCode && db) {
      try {
        await db.collection("pending_referrals").doc(orderData.id).set({ referralCode, userId, planId: effectivePlanId, createdAt: new Date().toISOString() });
      } catch (e) { console.warn("[Referral] Falha ao salvar pending:", e.message); }
    }
    console.log(`💳 Ordem PayPal criada: ${orderData.id} para ${userId} (${effectivePlanId})`);
    // URL para o usuário aprovar no PayPal (redirect flow)
    const approveUrl = orderData.links?.find((l) => l.rel === "approve")?.href;
    res.json({
      orderId: orderData.id,
      approveUrl,
      clientId: apiConfig.paypal_client_id,
      sandbox: apiConfig.paypal_sandbox,
    });
  } catch (err) {
    console.error("❌ Erro PayPal criar ordem:", err);
    res.status(500).json({ erro: err.message || "Erro ao criar pagamento PayPal" });
  }
});

app.post("/api/capturar-paypal", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ erro: "orderId obrigatório" });
    const token = await getPayPalAccessToken();
    const captureRes = await fetch(`${getPayPalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const captureData = await captureRes.json();
    if (captureData.status !== "COMPLETED") {
      return res.status(400).json({ erro: captureData.message || "Pagamento não aprovado" });
    }
    const purchaseUnit = captureData.purchase_units?.[0];
    const planId = purchaseUnit?.reference_id || "advanced";
    const userId = purchaseUnit?.custom_id;
    if (!userId || !db) {
      return res.status(500).json({ erro: "Dados do pagamento incompletos" });
    }
    if (planId.startsWith("api_")) {
      const apiPlan = planId.replace("api_", "");
      const snap = await db.collection("api_users").where("firebaseUid", "==", userId).limit(1).get();
      if (!snap.empty) {
        const apiPlanLimits = { basic: 5000, pro: 20000, enterprise: -1 };
        const limit = apiPlanLimits[apiPlan] ?? 5000;
        await snap.docs[0].ref.update({
          plan: apiPlan,
          requestsUsed: 0,
          billingCycle: "monthly",
          renewDate: new Date().toISOString().slice(0, 7) + "-01",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await savePurchaseRecord(userId, planId, "subscription");
        console.log(`🔑 [PayPal] Plano API ${apiPlan} ativado para ${userId}`);
      } else {
        console.warn(`[PayPal] api_users não encontrado para ${userId} (crie a API key primeiro)`);
      }
    } else {
      const userRef = db.collection("users").doc(userId);
      if (planId.includes("credits")) {
        const creditAmount = parseInt(planId.split("_")[1]) || 0;
        await userRef.set({
          credits: admin.firestore.FieldValue.increment(creditAmount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await savePurchaseRecord(userId, planId, "credits", creditAmount);
        console.log(`💰 [PayPal] Créditos adicionados: ${creditAmount} para ${userId}`);
      } else {
        const monthlyCredits = planId.startsWith("business") ? 200 : 80;
        await userRef.set({
          premium: true,
          planId,
          monthlyCredits,
          subscriptionActive: true,
          status: "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await savePurchaseRecord(userId, planId, "subscription");
        console.log(`👑 [PayPal] Assinatura ativada: ${planId} para ${userId} com ${monthlyCredits} créditos`);
      }
    }
    if (db) {
      try {
        const pendingSnap = await db.collection("pending_referrals").doc(orderId).get();
        if (pendingSnap.exists) {
          const { referralCode: refCode } = pendingSnap.data() || {};
          if (refCode) {
            const referrerId = await getReferrerIdByCode(refCode);
            await creditReferrer(referrerId, userId, planId, planId.includes("credits") ? "credits" : "subscription");
            await pendingSnap.ref.delete();
          }
        }
      } catch (e) { console.warn("[Referral] PayPal:", e.message); }
    }
    res.json({ success: true, redirect: `${FRONTEND_URL}/?status=approved&source=paypal` });
  } catch (err) {
    console.error("❌ Erro ao capturar PayPal:", err);
    res.status(500).json({ erro: err.message || "Erro ao capturar pagamento" });
  }
});

// PayPal: após aprovação, captura e redireciona
app.get("/api/paypal-return", async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect(`${FRONTEND_URL}/?status=error&msg=paypal_no_token`);
  }
  try {
    const captureRes = await fetch(`${getPayPalBase()}/v2/checkout/orders/${token}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getPayPalAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const data = await captureRes.json();
      if (data.status === "COMPLETED") {
      const planId = data.purchase_units?.[0]?.reference_id || "advanced";
      const userId = data.purchase_units?.[0]?.custom_id;
      if (userId && db) {
        if (planId.startsWith("api_")) {
          const apiPlan = planId.replace("api_", "");
          const snap = await db.collection("api_users").where("firebaseUid", "==", userId).limit(1).get();
          if (!snap.empty) {
            await snap.docs[0].ref.update({
              plan: apiPlan,
              requestsUsed: 0,
              billingCycle: "monthly",
              renewDate: new Date().toISOString().slice(0, 7) + "-01",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await savePurchaseRecord(userId, planId, "subscription");
            console.log(`🔑 [PayPal Return] Plano API ${apiPlan} ativado para ${userId}`);
          }
        } else {
          const userRef = db.collection("users").doc(userId);
          if (planId.includes("credits")) {
            const creditAmount = parseInt(planId.split("_")[1]) || 0;
            await userRef.set({ credits: admin.firestore.FieldValue.increment(creditAmount), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            await savePurchaseRecord(userId, planId, "credits", creditAmount);
          } else {
            const monthlyCredits = planId.startsWith("business") ? 200 : 80;
            await userRef.set({ premium: true, plan: planId, planId, monthlyCredits, subscriptionActive: true, status: "active", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            await savePurchaseRecord(userId, planId, "subscription");
            console.log(`👑 [PayPal Return] Assinatura: ${planId} para ${userId} (${monthlyCredits} créditos/mês)`);
          }
        }
        const pendingSnap = await db.collection("pending_referrals").doc(token).get();
        if (pendingSnap.exists) {
          const { referralCode: refCode } = pendingSnap.data() || {};
          if (refCode) {
            const referrerId = await getReferrerIdByCode(refCode);
            await creditReferrer(referrerId, userId, planId, planId.includes("credits") ? "credits" : "subscription");
            await pendingSnap.ref.delete();
          }
        }
      }
    }
  } catch (e) {
    console.error("PayPal capture on return:", e);
  }
  res.redirect(`${FRONTEND_URL}/?status=approved&source=paypal`);
});

// Rota de Redirecionamento (Onde o usuário cai após clicar em "Voltar para o site")
// Fallback: atualiza o plano aqui se o webhook não rodou (ex: ngrok estava offline)
app.get("/pagamento-aprovado", async (req, res) => {
  const { collection_id, collection_status, external_reference, preference_id } = req.query;
  const frontendUrl = FRONTEND_URL || MP_BASE || BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

  if (collection_status === "approved" && external_reference && db) {
    const parts = String(external_reference).split("::");
    const userId = parts[0];
    const planId = parts[1] || "advanced";
    const referralCode = parts[2] || null;
    if (userId) {
      try {
        // Planos de API: atualizar api_users
        if (planId.startsWith("api_")) {
          const apiPlan = planId.replace("api_", "");
          const snap = await db.collection("api_users").where("firebaseUid", "==", userId).limit(1).get();
          if (!snap.empty) {
            const apiPlanLimits = { basic: 5000, pro: 20000, enterprise: -1 };
            const limit = apiPlanLimits[apiPlan] ?? 5000;
            await snap.docs[0].ref.update({
              plan: apiPlan,
              requestsUsed: 0,
              billingCycle: "monthly",
              renewDate: new Date().toISOString().slice(0, 7) + "-01",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`🔑 [Redirect] Plano API ${apiPlan} ativado para ${userId}`);
          } else {
            console.warn(`[Redirect] api_users não encontrado para ${userId} (crie a API key primeiro)`);
          }
        } else {
        const userRef = db.collection("users").doc(userId);
        if (planId.includes("credits")) {
          const creditAmount = parseInt(planId.split("_")[1]) || 0;
          await userRef.set({
            credits: admin.firestore.FieldValue.increment(creditAmount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          await savePurchaseRecord(userId, planId, "credits", creditAmount);
          console.log(`💰 [Redirect] Créditos: ${creditAmount} para ${userId}`);
          if (referralCode) {
            const referrerId = await getReferrerIdByCode(referralCode);
            await creditReferrer(referrerId, userId, planId, "credits");
          }
        } else {
          const monthlyCredits = planId.startsWith("business") ? 200 : 80;
          await userRef.set({
            premium: true,
            plan: planId,
            planId,
            monthlyCredits,
            subscriptionActive: true,
            status: "active",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          await savePurchaseRecord(userId, planId, "subscription");
          console.log(`👑 [Redirect] Assinatura: ${planId} para ${userId}`);
          if (referralCode) {
            const referrerId = await getReferrerIdByCode(referralCode);
            await creditReferrer(referrerId, userId, planId, "subscription");
          }
        }
        }
      } catch (e) {
        console.error("Erro ao atualizar plano no redirect:", e);
      }
    }
  }
  res.redirect(`${frontendUrl}/?status=approved&pref_id=${preference_id}`);
});

/* =========================
   WEBHOOK (LIBERAÇÃO DO PLANO)
 ========================= */
app.post("/api/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === "payment") {
      const paymentId = data.id;
      console.log(`🔔 Notificação de pagamento recebida: ${paymentId}`);

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${apiConfig.mp_access_token}` }
      });
      
      const paymentData = await response.json();

      if (paymentData.status === "approved") {
        const { user_id, plan_id, referral_code } = paymentData.metadata || {};
        
        if (user_id && db) {

  // 🔑 PLANOS DE API
  if (plan_id && plan_id.startsWith("api_")) {
    const apiPlan = plan_id.replace("api_", "");
    const snap = await db.collection("api_users").where("firebaseUid", "==", user_id).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({
        plan: apiPlan,
        requestsUsed: 0,
        billingCycle: "monthly",
        renewDate: new Date().toISOString().slice(0, 7) + "-01",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const amountBRL = paymentData.transaction_amount || PLAN_PRICES_BRL[plan_id] || 0;
      await savePurchaseRecord(user_id, plan_id, "subscription", amountBRL);
      console.log(`🔑 [Webhook] Plano API ${apiPlan} ativado para ${user_id}`);
    }
  } else {
  const userRef = db.collection("users").doc(user_id);

  // 💰 COMPRA DE CRÉDITOS
  if (plan_id.includes("credits")) {

    const creditAmount = parseInt(plan_id.split("_")[1]) || 0;
    const amountBRL = paymentData.transaction_amount ?? PLAN_PRICES_BRL[plan_id] ?? 0;

    await userRef.set({
      credits: admin.firestore.FieldValue.increment(creditAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await savePurchaseRecord(user_id, plan_id, "credits", amountBRL);
    console.log(`💰 Créditos adicionados: ${creditAmount} para ${user_id}`);

  } else {
    // 👑 ASSINATURA (advanced / business)
    const monthlyCredits = plan_id.startsWith('business') ? 200 : 80;
    const amountBRL = paymentData.transaction_amount ?? PLAN_PRICES_BRL[plan_id] ?? 0;
    await userRef.set({
      premium: true,
      planId: plan_id,
      monthlyCredits: monthlyCredits,
      subscriptionActive: true,
      status: "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await savePurchaseRecord(user_id, plan_id, "subscription", amountBRL);
    console.log(`👑 Assinatura ativada: ${plan_id} para ${user_id} com ${monthlyCredits} créditos`);
  }
  if (referral_code && typeof referral_code === "string" && referral_code.trim()) {
    const referrerId = await getReferrerIdByCode(referral_code.trim());
    await creditReferrer(referrerId, user_id, plan_id, plan_id.includes("credits") ? "credits" : "subscription");
  }
}
  }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro crítico no Webhook:", err);
    res.sendStatus(500);
  }
});

app.get("/api/health", (req, res) => res.json({ status: "online", webhook_ready: !!BASE_URL.includes("ngrok"), db: !!db }));


app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!(await isAIGloballyEnabled())) {
      return res.status(503).json({ resposta: "IA temporariamente desativada. Tente mais tarde." });
    }
    if (!req.file) {
      return res.json({ resposta: "Nenhum arquivo enviado" });
    }

    const base64 = req.file.buffer.toString("base64");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiConfig.openrouter_key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é a IA forense do RealityScan. Analise imagens, vídeos e áudios detectando IA, deepfake, golpes e manipulações."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise este arquivo enviado pelo usuário. Seja técnico e direto." },
              { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${base64}` } }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    const texto =
      data?.choices?.[0]?.message?.content ||
      "IA não retornou resposta";

    res.json({ resposta: texto });

  } catch (err) {
    console.log("ERRO UPLOAD IA:", err);
    res.json({ resposta: "Erro ao analisar arquivo" });
  }
});

// ================================
// 🔌 API PÚBLICA v1 (x-api-key) + DEV PANEL
// ================================
function generateApiKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 24; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return 'sk_live_' + suffix;
}

async function verifyUserToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    return await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

async function findApiUserByKey(apiKey) {
  if (!db || !apiKey || !apiKey.startsWith('sk_live_')) return null;
  const snap = await db.collection('api_users').where('apiKey', '==', apiKey).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function checkApiUserLimit(apiUser) {
  const plan = apiUser.plan || 'free';
  const config = API_PLANS[plan];
  if (!config) return { allowed: false, reason: 'Plano inválido' };
  if (config.custom) return { allowed: true };
  if (config.billingCycle === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    const usedToday = (apiUser.requestsUsedDate === today ? (apiUser.requestsUsed || 0) : 0);
    if (usedToday >= config.requestsPerDay) return { allowed: false, reason: 'Limite diário atingido', code: 429 };
    return { allowed: true };
  }
  const used = apiUser.requestsUsed || 0;
  if (used >= config.requestsPerMonth) return { allowed: false, reason: 'Limite mensal atingido', code: 429 };
  return { allowed: true };
}

async function incrementApiUsage(apiUserId, endpoint, meta = {}) {
  if (!db) return;
  const ref = db.collection('api_users').doc(apiUserId);
  const today = new Date().toISOString().slice(0, 10);
  const doc = await ref.get();
  const data = doc.exists ? doc.data() : {};
  const isDaily = (API_PLANS[data.plan || 'free'] || {}).billingCycle === 'daily';
  if (isDaily && data.requestsUsedDate !== today) {
    await ref.set({ requestsUsed: 1, requestsUsedDate: today, lastUsed: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } else {
    await ref.update({
      requestsUsed: admin.firestore.FieldValue.increment(1),
      requestsUsedDate: today,
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await db.collection('api_logs').add({
    apiUserId,
    endpoint,
    ...meta,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function validateApiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'x-api-key header obrigatório' });
  }
  const apiUser = await findApiUserByKey(apiKey);
  if (!apiUser) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  if (apiUser.active === false) {
    return res.status(403).json({ error: 'API key desativada' });
  }
  const limitCheck = await checkApiUserLimit(apiUser);
  if (!limitCheck.allowed) {
    return res.status(limitCheck.code || 429).json({ error: limitCheck.reason || 'Limite atingido' });
  }
  req.apiUser = apiUser;
  next();
}

// Registro de tentativa de login com email inexistente (identificação de sondagem/ataque)
const logFailedLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas tentativas. Tente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.post('/api/auth/log-failed-login', logFailedLoginLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ error: 'Email obrigatório' });
  const ip = req.ip || req.socket?.remoteAddress || '';
  const userAgent = req.get('user-agent') || '';
  try {
    await admin.auth().getUserByEmail(email);
    // Email existe → falha foi senha errada; não registramos
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e?.code === 'auth/user-not-found' || e?.code === 'auth/email-not-found') {
      try {
        if (db) {
          await db.collection('login_attempts').add({
            type: 'email_not_found',
            email,
            ip,
            userAgent: userAgent.slice(0, 500),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        console.warn('[SECURITY] Tentativa de login com email inexistente:', email, 'IP:', ip);
      } catch (writeErr) {
        console.error('login_attempts write error:', writeErr);
      }
    }
    // Não revelamos se o email existe ou não (evita enumeração)
    return res.status(200).json({ ok: true });
  }
});

// Registro de tentativa de cadastro com email (mesmo sistema: identificar e auditar; exige Gmail no cliente)
const logRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas tentativas. Tente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];
function isGmailDomain(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase();
  return domain ? GMAIL_DOMAINS.includes(domain) : false;
}
app.post('/api/auth/log-registration-attempt', logRegistrationLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ error: 'Email obrigatório' });
  const success = req.body?.success === true;
  const ip = req.ip || req.socket?.remoteAddress || '';
  const userAgent = req.get('user-agent') || '';
  const isGmail = isGmailDomain(email);
  try {
    if (db) {
      await db.collection('login_attempts').add({
        type: 'registration_attempt',
        email,
        success,
        isGmail,
        ip,
        userAgent: userAgent.slice(0, 500),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    if (!isGmail && !success) console.warn('[SECURITY] Tentativa de cadastro com email não-Gmail:', email, 'IP:', ip);
  } catch (writeErr) {
    console.error('login_attempts registration write error:', writeErr);
  }
  return res.status(200).json({ ok: true });
});

// Validação de API key para acesso ao portal corporativo (não consome cota)
app.post('/api/corporate-portal/validate', apiByIpLimiter, async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'x-api-key obrigatório' });
  }
  const apiUser = await findApiUserByKey(apiKey);
  if (!apiUser) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  if (apiUser.active === false) {
    return res.status(403).json({ error: 'API key desativada' });
  }
  const limitCheck = await checkApiUserLimit(apiUser);
  if (!limitCheck.allowed) {
    return res.status(limitCheck.code || 429).json({ error: limitCheck.reason || 'Limite atingido' });
  }
  return res.json({ ok: true, email: apiUser.email || '' });
});

// Uso da API para dashboard corporativo (leitura; não consome cota)
app.get('/api/corporate-portal/usage', apiByIpLimiter, async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
  if (!apiKey) return res.status(401).json({ error: 'x-api-key obrigatório' });
  const apiUser = await findApiUserByKey(apiKey);
  if (!apiUser) return res.status(401).json({ error: 'API key inválida' });
  const plan = apiUser.plan || 'free';
  const config = API_PLANS[plan] || API_PLANS.free;
  const now = new Date();
  const trialEndsAt = apiUser.trialEndsAt ? new Date(apiUser.trialEndsAt) : null;
  const inTrial = trialEndsAt && now < trialEndsAt && (config.trialRequests ?? 0) > 0;
  const requestLimit = inTrial ? (config.trialRequests ?? 500) : (config.requestsPerDay ?? config.requestsPerMonth ?? 50);
  const requestsUsed = inTrial ? (apiUser.trialRequestsUsed || 0) : (apiUser.requestsUsed || 0);
  const percent = requestLimit > 0 ? Math.round((requestsUsed / requestLimit) * 100) : 0;
  return res.json({
    plan,
    requestsUsed,
    requestLimit,
    inTrial: !!inTrial,
    trialEndsAt: apiUser.trialEndsAt || null,
    trialRequestsUsed: apiUser.trialRequestsUsed ?? 0,
    percent,
    alert: percent >= 80,
  });
});

// Rotas /api/dev/* (requerem Firebase token do usuário)
app.post('/api/dev/create-api-key', async (req, res) => {
  const user = await verifyUserToken(req);
  if (!user || !db) return res.status(401).json({ error: 'Token inválido. Faça login.' });
  try {
    const snap = await db.collection('api_users').where('firebaseUid', '==', user.uid).limit(1).get();
    if (!snap.empty) {
      return res.status(400).json({ error: 'Você já possui uma API key. Use regenerar para criar uma nova.' });
    }
    const apiKey = generateApiKey();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.collection('api_users').add({
      firebaseUid: user.uid,
      email: user.email || '',
      apiKey,
      plan: 'free',
      requestsUsed: 0,
      requestsUsedDate: null,
      trialRequestsUsed: 0,
      trialEndsAt,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ apiKey });
  } catch (e) {
    console.error('create-api-key error:', e);
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/dev/regenerate-api-key', async (req, res) => {
  const user = await verifyUserToken(req);
  if (!user || !db) return res.status(401).json({ error: 'Token inválido. Faça login.' });
  try {
    const snap = await db.collection('api_users').where('firebaseUid', '==', user.uid).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Nenhuma API key encontrada. Crie uma primeiro.' });
    const doc = snap.docs[0];
    const newKey = generateApiKey();
    await doc.ref.update({ apiKey: newKey });
    return res.json({ apiKey: newKey });
  } catch (e) {
    console.error('regenerate-api-key error:', e);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/dev/me', async (req, res) => {
  const user = await verifyUserToken(req);
  if (!user || !db) return res.status(401).json({ error: 'Token inválido. Faça login.' });
  try {
    const snap = await db.collection('api_users').where('firebaseUid', '==', user.uid).limit(1).get();
    if (snap.empty) {
      return res.json({
        email: user.email,
        apiKey: null,
        plan: 'free',
        requestsUsed: 0,
        requestLimit: API_PLANS.free.requestsPerDay,
        billingCycle: 'daily',
        renewDate: null,
        active: false,
        createdAt: null,
      });
    }
    const d = snap.docs[0].data();
    const plan = d.plan || 'free';
    const config = API_PLANS[plan] || API_PLANS.free;
    const now = new Date();
    const trialEndsAt = d.trialEndsAt ? new Date(d.trialEndsAt) : null;
    const inTrial = trialEndsAt && now < trialEndsAt && (config.trialRequests ?? 0) > 0;
    const limit = inTrial ? (config.trialRequests ?? 500) : (config.requestsPerDay ?? config.requestsPerMonth ?? 50);
    const requestsUsed = inTrial ? (d.trialRequestsUsed || 0) : (d.requestsUsed || 0);
    return res.json({
      email: d.email || user.email,
      apiKey: d.apiKey ? d.apiKey.slice(0, 12) + '...' : null,
      plan,
      requestsUsed,
      requestLimit: limit,
      billingCycle: config.billingCycle || 'daily',
      renewDate: d.renewDate || null,
      active: d.active !== false,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
      trialEndsAt: d.trialEndsAt || null,
      trialRequestsUsed: d.trialRequestsUsed ?? 0,
      inTrial: !!inTrial,
    });
  } catch (e) {
    console.error('api dev me error:', e);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/dev/logs', async (req, res) => {
  const user = await verifyUserToken(req);
  if (!user || !db) return res.status(401).json({ error: 'Token inválido. Faça login.' });
  try {
    const snap = await db.collection('api_users').where('firebaseUid', '==', user.uid).limit(1).get();
    if (snap.empty) return res.json({ logs: [] });
    const apiUserId = snap.docs[0].id;
    const logsSnap = await db.collection('api_logs')
      .where('apiUserId', '==', apiUserId)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(req.query.limit) || 50)
      .get();
    const logs = logsSnap.docs.map((doc) => {
      const d = doc.data();
      const ts = d.timestamp?.toDate?.();
      return {
        endpoint: d.endpoint,
        model: d.model,
        tokensInput: d.tokensInput,
        tokensOutput: d.tokensOutput,
        costEstimated: d.costEstimated,
        timestamp: ts?.toISOString?.(),
        status: d.status || 'ok',
      };
    });
    return res.json({ logs });
  } catch (e) {
    console.error('api dev logs error:', e);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/dev/usage', async (req, res) => {
  const user = await verifyUserToken(req);
  if (!user || !db) return res.status(401).json({ error: 'Token inválido. Faça login.' });
  try {
    const snap = await db.collection('api_users').where('firebaseUid', '==', user.uid).limit(1).get();
    if (snap.empty) {
      return res.json({ today: 0, weekData: [], totalMonth: 0, modelMostUsed: null, endpointMostUsed: null });
    }
    const apiUserId = snap.docs[0].id;
    const d = snap.docs[0].data();
    const plan = d.plan || 'free';
    const config = API_PLANS[plan] || API_PLANS.free;
    const limit = config.requestsPerDay ?? config.requestsPerMonth ?? 50;
    const range = parseInt(req.query.range) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);
    const logsSnap = await db.collection('api_logs')
      .where('apiUserId', '==', apiUserId)
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();
    const today = new Date().toISOString().slice(0, 10);
    let todayCount = 0;
    const byDate = {};
    const byModel = {};
    const byEndpoint = {};
    logsSnap.docs.forEach((doc) => {
      const x = doc.data();
      const ts = x.timestamp?.toDate?.();
      if (!ts) return;
      const dt = ts.toISOString().slice(0, 10);
      if (dt === today) todayCount++;
      byDate[dt] = (byDate[dt] || 0) + 1;
      const m = x.model || x.endpoint || 'unknown';
      byModel[m] = (byModel[m] || 0) + 1;
      byEndpoint[x.endpoint || 'unknown'] = (byEndpoint[x.endpoint || 'unknown'] || 0) + 1;
    });
    const weekData = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weekData.push({ date: key, count: byDate[key] || 0 });
    }
    let totalMonth = 0;
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    Object.entries(byDate).forEach(([k, v]) => { if (k >= monthStart) totalMonth += v; });
    const modelMostUsed = Object.entries(byModel).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const endpointMostUsed = Object.entries(byEndpoint).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return res.json({
      today: todayCount,
      weekData,
      totalMonth,
      limit,
      plan,
      modelMostUsed,
      endpointMostUsed,
      costPerRequest: 0.0001,
      costEstimated: (totalMonth * 0.0001).toFixed(4),
    });
  } catch (e) {
    console.error('api dev usage error:', e);
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/dev/test-api', async (req, res) => {
  const user = await verifyUserToken(req);
  if (!user || !db) return res.status(401).json({ error: 'Token inválido. Faça login.' });
  try {
    if (!(await isAIGloballyEnabled())) {
      return res.status(503).json({ error: 'IA temporariamente desativada.' });
    }
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt é obrigatório' });
    }
    const messages = [
      { role: 'system', content: 'Você é um assistente prestativo. Responda em português de forma concisa.' },
      { role: 'user', content: prompt.trim().slice(0, 2000) },
    ];
    const texto = await callOpenRouter(messages, 'google/gemini-2.0-flash-001');
    return res.json({ text: texto, model: 'google/gemini-2.0-flash-001' });
  } catch (e) {
    console.error('api dev test-api error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Rate limit por IP na API v1 (evita abuso mesmo com API key válida)
const apiV1IpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: (req) => getClientIP(req) || req.ip || 'unknown',
  message: { error: 'Limite de requisições por IP atingido. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rotas /api/v1/* (requerem x-api-key)
const apiV1 = express.Router();
apiV1.use(apiV1IpLimiter);
apiV1.use(validateApiKeyMiddleware);

apiV1.post('/generate', async (req, res) => {
  try {
    const { prompt, model } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt é obrigatório' });
    const messages = [{ role: 'user', content: prompt }];
    const texto = await callOpenRouter([{ role: 'system', content: 'Você é um assistente prestativo. Responda em português.' }, ...messages], model || 'google/gemini-2.0-flash-001');
    await incrementApiUsage(req.apiUser.id, '/api/v1/generate', { model: model || 'gemini-2.0-flash' });
    return res.json({ text: texto });
  } catch (e) {
    console.error('api v1 generate error:', e);
    return res.status(500).json({ error: e.message });
  }
});

apiV1.post('/analyze', async (req, res) => {
  try {
    const { image, prompt } = req.body || {};
    const imageDataUrl = image || req.body?.imagem;
    if (!imageDataUrl) return res.status(400).json({ error: 'image (base64 data URL) é obrigatória' });
    const p = prompt || 'Analise esta imagem. Detecte IA, deepfake ou manipulação. Seja técnico.';
    const mediaData = [{ type: 'image_url', image_url: { url: imageDataUrl } }];
    const messages = [{ role: 'system', content: 'Você é o analista forense RealityScan. Analise a imagem e informe: Nível de Risco (0-100%), presença de IA, motivo.' }, { role: 'user', content: [{ type: 'text', text: p }, ...mediaData] }];
    const texto = await analyzeWithAI(messages, imageDataUrl, { models: PREMIUM_MODELS });
    const match = texto.match(/(\d{1,3})%/);
    const score = match ? parseInt(match[1]) : 0;
    await incrementApiUsage(req.apiUser.id, '/api/v1/analyze');
    return res.json({ verdict: texto, score });
  } catch (e) {
    console.error('api v1 analyze error:', e);
    return res.status(500).json({ error: e.message });
  }
});

apiV1.post('/voice', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text é obrigatório' });
    const messages = [{ role: 'user', content: `Gere uma narração em português para o seguinte texto. Mantenha tom natural. Texto: ${text}` }];
    const texto = await callOpenRouter([{ role: 'system', content: 'Você gera roteiros para TTS. Retorne apenas o texto a ser narrado, sem markdown.' }, ...messages]);
    await incrementApiUsage(req.apiUser.id, '/api/v1/voice');
    return res.json({ script: texto });
  } catch (e) {
    console.error('api v1 voice error:', e);
    return res.status(500).json({ error: e.message });
  }
});

app.use('/api/v1', apiV1);

// ================================
// 🔐 ADMIN API (requer token Firebase do admin)
// ================================
const ADMIN_EMAIL = "negget27@gmail.com";

async function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.email !== ADMIN_EMAIL) return null;
    return decoded;
  } catch {
    return null;
  }
}

async function isAIGloballyEnabled() {
  if (!db) return true;
  try {
    const snap = await db.collection("config").doc("ai").get();
    return !snap.exists || snap.data().globalEnabled !== false;
  } catch {
    return true;
  }
}

app.get("/api/admin/metrics", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const totalUsers = users.length;
    const activeSubs = users.filter((u) => (u.planId || "").match(/advanced|business/) && u.subscriptionActive !== false).length;
    const cancelled = users.filter((u) => u.status === "cancelled" || u.subscriptionActive === false).length;
    let totalRevenue = 0;
    let mrr = 0;
    for (const u of users) {
      const purchasesSnap = await db.collection("users").doc(u.id).collection("purchases").get();
      purchasesSnap.docs.forEach((d) => {
        const data = d.data();
        const planId = data.planId || "";
        // Ignora purchases de planos API — contabilizados via api_users
        if (planId.startsWith("api_")) return;
        let amt = Number(data.amount || 0);
        // Para créditos, amount é qtde (5/20/50), não preço. Para assinaturas, amount costuma ser 0.
        if ((amt <= 0 || (planId.includes("credits") && [5, 20, 50].includes(amt))) && planId) {
          amt = PLAN_PRICES_BRL[planId] ?? 0;
        }
        totalRevenue += amt;
      });
    }
    // Receita de planos dev (api_users): basic, pro, enterprise
    const apiUsersSnap = await db.collection("api_users").get();
    const apiPlanPriceBRL = { basic: 55, pro: 165, enterprise: 550 };
    apiUsersSnap.docs.forEach((doc) => {
      const d = doc.data();
      const plan = (d.plan || "").toLowerCase();
      if (apiPlanPriceBRL[plan]) {
        totalRevenue += apiPlanPriceBRL[plan];
      }
    });
    mrr = totalRevenue * 0.1;
    const globalSnap = await db.collection("free_usage_global").doc(new Date().toISOString().slice(0, 10)).get();
    const aiRequestsToday = globalSnap.exists ? (globalSnap.data().totalScans || 0) : 0;
    const totalReferralConversions = users.reduce((s, u) => s + (u.referralCount || 0), 0);
    const totalReferralCredits = users.reduce((s, u) => s + (u.referralCreditsEarned || 0), 0);
    res.json({
      totalUsers,
      activeSubscribers: activeSubs,
      cancellations: cancelled,
      mrr: mrr.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      usersOnlineNow: Math.min(activeSubs, 5),
      aiRequestsToday,
      totalReferralConversions,
      totalReferralCredits,
    });
  } catch (e) {
    console.error("Admin metrics error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/referrals", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const withReferrals = users.filter((u) => (u.referralCount || 0) > 0);
    withReferrals.sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0));
    const referralsSnap = await db.collection("referrals").orderBy("createdAt", "desc").limit(50).get();
    const recentReferrals = referralsSnap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        referrerId: x.referrerId,
        referredUserId: x.referredUserId,
        rewardCredits: x.rewardCredits,
        planId: x.planId,
        purchaseType: x.purchaseType,
        createdAt: x.createdAt?.toDate?.()?.toISOString?.() || x.createdAt
      };
    });
    const totalReferralCredits = users.reduce((s, u) => s + (u.referralCreditsEarned || 0), 0);
    const totalConversions = users.reduce((s, u) => s + (u.referralCount || 0), 0);
    res.json({
      totalConversions,
      totalCreditsGranted: totalReferralCredits,
      topReferrers: withReferrals.slice(0, 20).map((u) => ({
        id: u.id,
        email: u.email,
        referralCode: u.referralCode,
        referralCount: u.referralCount || 0,
        referralCreditsEarned: u.referralCreditsEarned || 0
      })),
      recentReferrals
    });
  } catch (e) {
    console.error("Admin referrals error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt || d.data().lastLogin,
    }));
    users.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ users });
  } catch (e) {
    console.error("Admin users error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/ai-usage", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const globalSnap = await db.collection("free_usage_global").doc(today).get();
    const callsToday = globalSnap.exists ? (globalSnap.data().totalScans || 0) : 0;
    const monthStart = today.slice(0, 7) + "-01";
    let costMonth = 0;
    let costToday = 0;
    const costPerCall = 0.0001;
    costToday = callsToday * costPerCall;
    const globalRef = db.collection("free_usage_global");
    const monthSnap = await globalRef.get();
    monthSnap.docs.forEach((d) => {
      const dt = d.id;
      if (dt >= monthStart && dt <= today) costMonth += (d.data().totalScans || 0) * costPerCall;
    });
    const configSnap = await db.collection("config").doc("ai").get();
    const globalEnabled = configSnap.exists ? (configSnap.data().globalEnabled !== false) : true;
    let topUser = null;
    const usersSnap = await db.collection("users").get();
    let maxCalls = 0;
    for (const u of usersSnap.docs) {
      const analysesSnap = await db.collection("users").doc(u.id).collection("analyses").get();
      const count = analysesSnap.size;
      if (count > maxCalls) {
        maxCalls = count;
        topUser = { email: u.data().email || u.id, calls: count };
      }
    }
    res.json({
      callsToday,
      costToday: costToday.toFixed(4),
      costMonth: costMonth.toFixed(2),
      topUser: maxCalls > 0 ? topUser : undefined,
      messagesCount: callsToday,
      audiosCount: 0,
      globalEnabled,
    });
  } catch (e) {
    console.error("Admin AI usage error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/ai-control", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const { action } = req.body || {};
    if (action === "toggle_global") {
      const ref = db.collection("config").doc("ai");
      const snap = await ref.get();
      const current = snap.exists ? snap.data().globalEnabled : true;
      await ref.set({ globalEnabled: !current, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.json({ globalEnabled: !current });
    }
    if (action === "reset_consumption") {
      const today = new Date().toISOString().slice(0, 10);
      await db.collection("free_usage_global").doc(today).set({ totalScans: 0 }, { merge: true });
      return res.json({ ok: true });
    }
    res.status(400).json({ error: "Ação inválida" });
  } catch (e) {
    console.error("Admin AI control error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/user/:uid", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const uid = req.params.uid;
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) return res.status(404).json({ error: "Usuário não encontrado" });
    const userData = { id: uid, ...userSnap.data() };
    const purchasesSnap = await db.collection("users").doc(uid).collection("purchases").get();
    const purchases = purchasesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const analysesSnap = await db.collection("users").doc(uid).collection("analyses").get();
    const analyses = analysesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ user: userData, purchases, analyses });
  } catch (e) {
    console.error("Admin user detail error:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Ações admin sobre usuário: block, unblock, resetPassword, freeDays, changePlan, cancelSub, limit_usage */
app.post("/api/admin/user-action", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const { uid, action, payload } = req.body || {};
    if (!uid || !action) return res.status(400).json({ error: "uid e action obrigatórios" });
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "Usuário não encontrado" });
    const userData = userSnap.data();

    switch (action) {
      case "block": {
        await userRef.update({ status: "blocked", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        try {
          await admin.auth().updateUser(uid, { disabled: true });
          await admin.auth().revokeRefreshTokens(uid); // Invalida sessões ativas imediatamente
        } catch (e) {
          console.warn("Admin block: Firestore atualizado, mas Auth disable/revoke falhou:", e?.message);
        }
        return res.json({ ok: true, message: "Usuário bloqueado (Firestore + Auth desativado)" });
      }
      case "unblock": {
        await userRef.update({ status: "active", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        try {
          await admin.auth().updateUser(uid, { disabled: false });
        } catch (e) {
          console.warn("Admin unblock: Firestore atualizado, mas Auth enable falhou:", e?.message);
        }
        return res.json({ ok: true, message: "Usuário desbloqueado" });
      }
      case "resetPassword": {
        const email = userData.email;
        if (!email) return res.status(400).json({ error: "Usuário sem email para reset de senha" });
        const link = await admin.auth().generatePasswordResetLink(email, { url: FRONTEND_URL });
        return res.json({ ok: true, resetLink: link, message: "Link de redefinição gerado (copie e envie ao usuário)" });
      }
      case "freeDays": {
        const days = Number(payload?.days) || 7;
        const creditsToAdd = Math.min(Math.max(days * 3, 10), 100);
        await userRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToAdd),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.json({ ok: true, message: `+${creditsToAdd} créditos adicionados (equiv. ${days} dias grátis)` });
      }
      case "changePlan": {
        const planId = payload?.planId || "community";
        const monthlyCredits = { community: 3, advanced: 50, business: 200, enterprise: 500 }[planId] || 3;
        await userRef.update({
          planId,
          premium: planId !== "community",
          monthlyCredits,
          subscriptionActive: planId !== "community",
          status: "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.json({ ok: true, message: `Plano alterado para ${planId}` });
      }
      case "cancelSub":
        await userRef.update({
          subscriptionActive: false,
          status: "cancelled",
          planId: "community",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.json({ ok: true, message: "Assinatura cancelada" });
      case "limit_usage":
        await userRef.update({
          usageLimit: Number(payload?.limit) || 10,
          usageLimitSetAt: new Date().toISOString(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.json({ ok: true, message: `Limite de uso definido: ${payload?.limit || 10}` });
      default:
        return res.status(400).json({ error: "Ação inválida" });
    }
  } catch (e) {
    console.error("Admin user-action error:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Config admin: GET retorna, POST salva config/ia, config/app, config/plans */
app.get("/api/admin/config", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const [aiSnap, appSnap, plansSnap] = await Promise.all([
      db.collection("config").doc("ai").get(),
      db.collection("config").doc("app").get(),
      db.collection("config").doc("plans").get(),
    ]);
    res.json({
      ai: aiSnap.exists ? aiSnap.data() : {},
      app: appSnap.exists ? appSnap.data() : {},
      plans: plansSnap.exists ? plansSnap.data() : {},
    });
  } catch (e) {
    console.error("Admin config get error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/config", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const { section, data } = req.body || {};
    if (!section || !data) return res.status(400).json({ error: "section e data obrigatórios" });
    const validSections = ["ai", "app", "plans"];
    if (!validSections.includes(section)) return res.status(400).json({ error: "section inválido" });
    await db.collection("config").doc(section).set(
      { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: adminUser.email },
      { merge: true }
    );
    return res.json({ ok: true, message: "Configuração salva" });
  } catch (e) {
    console.error("Admin config post error:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Adicionar admin: grava em config/admins como lista de emails */
app.post("/api/admin/add-admin", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const { email, level } = req.body || {};
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Email válido obrigatório" });
    const ref = db.collection("config").doc("admins");
    const snap = await ref.get();
    const admins = snap.exists && Array.isArray(snap.data().list) ? snap.data().list : [];
    if (admins.some((a) => a.email?.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "Este email já é admin" });
    }
    admins.push({ email: email.toLowerCase(), level: level || "suporte", addedAt: new Date().toISOString(), addedBy: adminUser.email });
    await ref.set({ list: admins, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.json({ ok: true, message: "Admin adicionado" });
  } catch (e) {
    console.error("Admin add-admin error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/admins", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const snap = await db.collection("config").doc("admins").get();
    const list = snap.exists && Array.isArray(snap.data().list) ? snap.data().list : [];
    res.json({ admins: list });
  } catch (e) {
    console.error("Admin admins list error:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Anúncio / comunicação: push, email, sms, in_app — armazena em config/announcements */
app.post("/api/admin/announcement", async (req, res) => {
  const adminUser = await verifyAdminToken(req);
  if (!adminUser || !db) return res.status(403).json({ error: "Acesso negado" });
  try {
    const { type, subject, message, title } = req.body || {};
    if (!type || !message) return res.status(400).json({ error: "type e message obrigatórios" });
    const valid = ["push", "email", "sms", "in_app"];
    if (!valid.includes(type)) return res.status(400).json({ error: "type inválido" });
    const ref = db.collection("config").doc("announcements");
    const snap = await ref.get();
    const list = snap.exists && Array.isArray(snap.data().list) ? snap.data().list : [];
    list.unshift({
      type,
      subject: subject || title || "",
      message,
      createdAt: new Date().toISOString(),
      createdBy: adminUser.email,
    });
    await ref.set({ list: list.slice(0, 50), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.json({ ok: true, message: "Anúncio registrado (in_app será exibido aos usuários; push/email/sms requerem integração externa)" });
  } catch (e) {
    console.error("Admin announcement error:", e);
    res.status(500).json({ error: e.message });
  }
});

async function startServer() {
  // 🔐 Carrega API keys do Firestore (prioridade) ou .env antes de aceitar requisições
  await loadApiConfigFromFirestore();
  mpClient = new MercadoPagoConfig({ accessToken: apiConfig.mp_access_token });

  const distPath = path.join(__dirname, "dist");
  const useProduction = process.env.NODE_ENV === "production" || fs.existsSync(distPath);

  // Usa build de produção quando disponível (sem WebSocket, sem erros de porta)
  if (useProduction) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("📦 Servindo build de produção (sem WebSocket)");
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Usa PORT do .env (ex: 3001 para ngrok) ou 0 para porta automática
  const portToUse = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;
  const server = app.listen(portToUse, "0.0.0.0", () => {
    const port = server.address().port;
    const url = `http://localhost:${port}`;
    BASE_URL = process.env.APP_URL || process.env.BASE_URL || url;
    // PayPal/MP redirect: se backend na 3001 e FRONTEND_URL não definido, frontend = Vite 5173 (dev:full)
    if (!process.env.APP_URL && !process.env.FRONTEND_URL && port === 3001) {
      FRONTEND_URL = "http://localhost:5173";
    } else {
      FRONTEND_URL = process.env.APP_URL || process.env.FRONTEND_URL || url;
    }
    console.log(`📡 Backend RealityScan rodando na porta ${port}`);
    console.log(`🌐 Abra no navegador: ${FRONTEND_URL !== url ? FRONTEND_URL : url}`);
  });
}

startServer();
