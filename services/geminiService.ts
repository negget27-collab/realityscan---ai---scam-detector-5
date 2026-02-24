import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

/**
 * Função utilitária para extração segura de variáveis de ambiente no frontend.
 * Verifica múltiplas fontes de injeção (Vite define, process.env, import.meta.env).
 */
const getEnvVar = (key: string): string => {
  try {
    // 1. Tenta acesso direto via substituição literal do Vite
    if (key === 'OPENROUTER_KEY') return process.env.OPENROUTER_KEY || "";
    if (key === 'API_KEY') return process.env.API_KEY || "";

    // 2. Tenta via objeto process.env (injetado no define)
    const fromProcess = (process.env as any)?.[key];
    if (fromProcess) return fromProcess;

    // 3. Tenta via import.meta.env (nativo do Vite)
    const fromMeta = (import.meta as any).env?.[key] || (import.meta as any).env?.[`VITE_${key}`];
    if (fromMeta) return fromMeta;

  } catch (e) {
    console.warn(`[RealityScan] Falha ao ler variável ${key}:`, e);
  }
  return "";
};

/**
 * Recuperação das chaves. 
 */
const OPENROUTER_API_KEY = process.env.OPENROUTER_KEY || getEnvVar('OPENROUTER_KEY');

/**
 * Engine Econômica: OpenRouter
 */
const fetchOpenRouter = async (model: string, messages: any[], responseFormat?: any) => {
  // Validação em tempo de execução
  if (!OPENROUTER_API_KEY) {
    const errorMsg = "⚠️ ERRO DE CONFIGURAÇÃO: Chave OpenRouter não encontrada no ambiente.";
    console.error(errorMsg);
    throw new Error("OpenRouter Key Missing");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "NGT Forensic",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      response_format: responseFormat || { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter Error: ${errData.error?.message || response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
};

export const analyzeMedia = async (
  base64Data: string,
  mimeType: string,
  type: 'IMAGE' | 'VIDEO' | 'AUDIO',
  isRomanticMode: boolean = false,
  isDAIMode: boolean = false,
  isPremium: boolean = false
): Promise<AnalysisResult> => {
  
  if (isPremium || type === 'AUDIO' || type === 'VIDEO' || isDAIMode) {
    try {
      // Correct: Use process.env.API_KEY directly and initialize per call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const modelName = type === 'AUDIO' 
        ? 'gemini-2.5-flash-native-audio-preview-12-2025' 
        : (isDAIMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview');

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: isRomanticMode ? "Deep BioScan Forensic. Verifique sinais de golpe sentimental e manipulação GAN." : "Análise forense digital completa." }
          ]
        },
        config: {
          systemInstruction: "Você é um perito forense digital. Analise artefatos de IA, ruído de sensor e harmônicos vocais. Retorne JSON estrito.",
          tools: isDAIMode ? [{ googleSearch: {} }] : [],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              isAI: { type: Type.BOOLEAN },
              confidence: { type: Type.STRING },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              verdict: { type: Type.STRING }
            },
            required: ["score", "isAI", "confidence", "findings", "verdict"]
          }
        }
      });

      // Correct: Use response.text property directly
      const responseText = response.text || "{}";
      const jsonResult = JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] || responseText);
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const groundingLinks = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      return { ...jsonResult, groundingLinks } as AnalysisResult;
    } catch (error: any) {
      console.warn("[NGT] Google SDK Falhou, tentando fallback OpenRouter se disponível...", error);
      if (error.message?.includes("Requested entity was not found")) {
        await window.aistudio?.openSelectKey();
      }
    }
  }

  // Fallback / Engine Econômica (OpenRouter)
  const system = "Analise se a imagem foi gerada por IA. JSON: {score, isAI, confidence, findings[], verdict}";
  const prompt = isRomanticMode ? "Avalie este perfil. Há inconsistências físicas ou sinais de GAN?" : "Análise de integridade forense.";
  
  const content = await fetchOpenRouter("google/gemini-2.0-flash-001", [
    { role: "system", content: system },
    { role: "user", content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
    ]}
  ]);

  return JSON.parse(content) as AnalysisResult;
};

export const scanScreenContent = async (base64Data: string): Promise<AnalysisResult> => {
  try {
    const content = await fetchOpenRouter("google/gemini-2.0-flash-001", [
      { role: "system", content: "SENTRY MODE: Detect deepfakes na tela. JSON: {score, isAI, confidence, findings, verdict}" },
      { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }]}
    ]);
    return JSON.parse(content) as AnalysisResult;
  } catch (err) {
    console.error("[NGT] Sentry Scan Error:", err);
    return { score: 0, isAI: false, confidence: 'LOW', findings: ["Erro na conexão com Sentry"], verdict: 'Erro de Rede' } as AnalysisResult;
  }
};

export const reconPerson = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    // Correct: Use process.env.API_KEY directly and initialize per call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: "Sistema RECON: Analise biometria facial e procure por duplicatas via Google Search." }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            isAI: { type: Type.BOOLEAN },
            confidence: { type: Type.STRING },
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            verdict: { type: Type.STRING }
          },
          required: ["score", "isAI", "confidence", "findings", "verdict"]
        }
      },
    });
    // Correct: Use response.text property directly
    const responseText = response.text || "{}";
    const jsonResult = JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] || responseText);
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingLinks = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    
    return { ...jsonResult, groundingLinks } as AnalysisResult;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      await window.aistudio?.openSelectKey();
    }
    throw error;
  }
};

export const createForensicChat = () => {
  return {
    sendMessage: async ({ message }: { message: string }) => {
      const content = await fetchOpenRouter("google/gemini-2.0-flash-001", [
        { role: "system", content: "Você é o assistente perito NGT. Ajude o usuário com dúvidas sobre fraudes e IA." },
        { role: "user", content: message }
      ], { type: "text" });
      return { text: content };
    }
  };
};