/**
 * SentryService - Sistema robusto de captura e análise para o miniHUD
 * Garante estabilidade com retry, timeout, fallbacks e validações.
 */

import { AnalysisResult } from '../types';
import { getOrCreateDeviceId } from './deviceId';

export type SentryErrorCode =
  | 'STREAM_INACTIVE'
  | 'CAPTURE_FAILED'
  | 'CREDITS_INSUFFICIENT'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'TIMEOUT'
  | 'BROWSER_UNSUPPORTED'
  | 'UNKNOWN';

export interface SentryError {
  code: SentryErrorCode;
  message: string;
  retryable: boolean;
}

export interface SentryScanOptions {
  stream: MediaStream;
  canvas: HTMLCanvasElement;
  userId?: string | null;
  consumeCredit: () => Promise<boolean>;
  /** Se true e o stream tiver áudio, captura áudio para análise de voz sintética */
  captureAudio?: boolean;
  /** Link do vídeo/fonte (opcional) — salvo no database quando marcado por IA */
  videoLink?: string | null;
}

const SENTRY_PROMPT = `Estas são 3 frames extraídas de um VÍDEO em sequência temporal. Analise como VÍDEO, não como imagem estática. Descreva o que está visível no vídeo: post, legenda, pessoas (mencione celebridades por nome), contexto. Detecte fraude, deepfake ou manipulação. Se houver IA (declarada ou detectada), informe: "Há presença de IA neste conteúdo." Seja detalhado.`;

const API_TIMEOUT_MS = 90_000;
const CAPTURE_INTERVAL_MS = 2000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/** Valida se o stream está ativo e pronto para captura */
function validateStream(stream: MediaStream): SentryError | null {
  const track = stream.getVideoTracks()[0];
  if (!track) return { code: 'STREAM_INACTIVE', message: 'Nenhum vídeo no compartilhamento.', retryable: false };
  if (track.readyState !== 'live') return { code: 'STREAM_INACTIVE', message: 'Compartilhamento inativo. Reative o monitor.', retryable: true };
  return null;
}

/** Captura frame via ImageCapture (Chrome/Edge) ou fallback canvas+video */
async function captureFrame(
  stream: MediaStream,
  canvas: HTMLCanvasElement
): Promise<string> {
  const track = stream.getVideoTracks()[0];
  if (!track) throw new Error('Track não disponível');

  // Método 1: ImageCapture (preferido, melhor qualidade)
  if (typeof (window as any).ImageCapture !== 'undefined') {
    try {
      const ic = new (window as any).ImageCapture(track);
      const bitmap = await ic.grabFrame();
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Canvas context');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', 0.5);
    } catch (e) {
      console.warn('[Sentry] ImageCapture falhou, tentando fallback:', e);
    }
  }

  // Método 2: Fallback - video element + canvas (funciona em mais navegadores)
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    const cleanup = () => { video.srcObject = null; video.remove(); };
    video.onerror = () => { cleanup(); reject(new Error('Falha ao capturar frame do vídeo.')); };
    video.onloadeddata = async () => {
      try {
        await video.play();
        await new Promise((r) => setTimeout(r, 150));
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('Dimensões inválidas do vídeo');
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas context');
        ctx.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };
  });
}

/** Captura múltiplos frames com intervalo */
async function captureFrames(
  stream: MediaStream,
  canvas: HTMLCanvasElement,
  count: number = 3,
  intervalMs: number = CAPTURE_INTERVAL_MS
): Promise<string[]> {
  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    const err = validateStream(stream);
    if (err) throw new Error(err.message);
    frames.push(await captureFrame(stream, canvas));
    if (i < count - 1) await new Promise((r) => setTimeout(r, intervalMs));
  }
  return frames;
}

/** Captura áudio do stream durante o período de captura (para análise de voz sintética) */
async function captureAudio(stream: MediaStream, durationMs: number): Promise<string | null> {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return null;

  return new Promise((resolve) => {
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        if (chunks.length === 0) { resolve(null); return; }
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl || null);
        };
        reader.readAsDataURL(blob);
      };
      recorder.onerror = () => resolve(null);
      recorder.start(100);
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, durationMs);
    } catch {
      resolve(null);
    }
  });
}

/** Fetch com timeout */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('Tempo esgotado. Tente novamente.');
    throw e;
  }
}

/** Envia análise para API com retry */
async function sendToApi(
  frames: string[],
  userId: string | null | undefined,
  audioDataUrl: string | null = null,
  retryCount: number = 0,
  videoLink?: string | null
): Promise<AnalysisResult> {
  const body: Record<string, unknown> = {
    type: 'sentry',
    videoFrames: true,
    texto: SENTRY_PROMPT,
    imagens: frames,
    userId: userId,
    deviceId: getOrCreateDeviceId(),
  };
  if (audioDataUrl) body.audio = audioDataUrl;
  if (videoLink && typeof videoLink === 'string' && videoLink.trim()) body.videoLink = videoLink.trim();
  const bodyStr = JSON.stringify(body);

  const doRequest = async () => {
    const res = await fetchWithTimeout(
      '/api/scan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': getOrCreateDeviceId() },
        body: bodyStr,
      },
      API_TIMEOUT_MS
    );

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (res.status === 404 || text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Servidor da API não está rodando. Execute: npm run dev:full');
      }
      throw new Error(`Resposta inválida do servidor (${res.status})`);
    }

    const data = await res.json();

    if (res.status === 403) {
      const err: any = new Error(data.error || 'Créditos insuficientes');
      err.code = 'CREDITS_INSUFFICIENT';
      throw err;
    }

    if (res.status >= 400) {
      throw new Error(data.error || data.erro || `Erro ${res.status}`);
    }

    return {
      ...data,
      id: `sentry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fileName: 'sentry_capture.jpg',
      mediaType: 'IMAGE' as const,
      score: Number(data.score) || 0,
    } as AnalysisResult;
  };

  try {
    return await doRequest();
  } catch (e: any) {
    const isRetryable =
      (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError') || e.message?.includes('Tempo esgotado')) &&
      retryCount < MAX_RETRIES;
    if (isRetryable) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return sendToApi(frames, userId, audioDataUrl, retryCount + 1, videoLink);
    }
    throw e;
  }
}

/** Normaliza erros para exibição no HUD */
export function normalizeSentryError(err: any): SentryError {
  const msg = err?.message || 'Falha na análise. Tente novamente.';
  if (err?.code === 'CREDITS_INSUFFICIENT') {
    return { code: 'CREDITS_INSUFFICIENT', message: msg, retryable: false };
  }
  if (msg.includes('ImageCapture') || msg.includes('grabFrame')) {
    return { code: 'BROWSER_UNSUPPORTED', message: 'Use Chrome ou Edge para análise por compartilhamento.', retryable: false };
  }
  if (msg.includes('Tempo esgotado') || msg.includes('timeout')) {
    return { code: 'TIMEOUT', message: 'Tempo esgotado. Verifique sua conexão e tente novamente.', retryable: true };
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('servidor')) {
    return { code: 'NETWORK_ERROR', message: 'Erro de rede. Verifique sua conexão e se o servidor está rodando.', retryable: true };
  }
  if (msg.includes('Compartilhamento') || msg.includes('inativo')) {
    return { code: 'STREAM_INACTIVE', message: msg, retryable: true };
  }
  if (msg.includes('capturar') || msg.includes('Canvas')) {
    return { code: 'CAPTURE_FAILED', message: msg, retryable: true };
  }
  return { code: 'API_ERROR', message: msg, retryable: true };
}

const SENTRY_IMAGE_PROMPT = `Analise esta imagem de rede social (post, feed, print). Descreva o que está visível: post, legenda, pessoas (mencione celebridades em MAIÚSCULAS), contexto. Detecte fraude, deepfake ou manipulação. Se houver IA (declarada ou detectada), informe: "Há presença de IA neste conteúdo." Seja detalhado.`;

/** Envia imagem única para análise Sentry (fallback mobile/upload) */
async function sendImageToApi(
  imageDataUrl: string,
  userId: string | null | undefined,
  retryCount: number = 0
): Promise<AnalysisResult> {
  const body = JSON.stringify({
    type: 'sentry',
    videoFrames: false,
    texto: SENTRY_IMAGE_PROMPT,
    imagens: [imageDataUrl],
    userId: userId,
    deviceId: getOrCreateDeviceId(),
  });

  const doRequest = async () => {
    const res = await fetchWithTimeout(
      '/api/scan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': getOrCreateDeviceId() },
        body,
      },
      API_TIMEOUT_MS
    );

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (res.status === 404 || text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Servidor da API não está rodando. Execute: npm run dev:full');
      }
      throw new Error(`Resposta inválida do servidor (${res.status})`);
    }

    const data = await res.json();

    if (res.status === 403) {
      const err: any = new Error(data.error || 'Créditos insuficientes');
      err.code = 'CREDITS_INSUFFICIENT';
      throw err;
    }

    if (res.status >= 400) {
      throw new Error(data.error || data.erro || `Erro ${res.status}`);
    }

    return {
      ...data,
      id: `sentry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fileName: 'sentry_capture.jpg',
      mediaType: 'IMAGE' as const,
      score: Number(data.score) || 0,
    } as AnalysisResult;
  };

  try {
    return await doRequest();
  } catch (e: any) {
    const isRetryable =
      (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError') || e.message?.includes('Tempo esgotado')) &&
      retryCount < MAX_RETRIES;
    if (isRetryable) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return sendImageToApi(imageDataUrl, userId, retryCount + 1);
    }
    throw e;
  }
}

export interface SentryScanFromImageOptions {
  imageDataUrl: string;
  userId?: string | null;
  consumeCredit: () => Promise<boolean>;
}

/**
 * Análise Sentry a partir de uma imagem (upload/câmera).
 * Usado como fallback em mobile quando getDisplayMedia não está disponível.
 */
export async function runSentryScanFromImage(options: SentryScanFromImageOptions): Promise<AnalysisResult> {
  const { imageDataUrl, userId, consumeCredit } = options;
  if (!imageDataUrl || !imageDataUrl.startsWith('data:')) {
    throw new Error('Imagem inválida.');
  }
  const allowed = await consumeCredit();
  if (!allowed) {
    const err: any = new Error('Créditos insuficientes.');
    err.code = 'CREDITS_INSUFFICIENT';
    throw err;
  }
  return sendImageToApi(imageDataUrl, userId);
}

/**
 * Executa um ciclo completo de análise Sentry.
 * Retorna o resultado ou lança erro com mensagem amigável.
 * Se captureAudio=true e o stream tiver áudio, envia para análise de voz sintética.
 */
export async function runSentryScan(options: SentryScanOptions): Promise<AnalysisResult> {
  const { stream, canvas, userId, consumeCredit, captureAudio: wantAudio = true, videoLink } = options;

  const streamErr = validateStream(stream);
  if (streamErr) throw new Error(streamErr.message);

  const allowed = await consumeCredit();
  if (!allowed) {
    const err: any = new Error('Créditos insuficientes.');
    err.code = 'CREDITS_INSUFFICIENT';
    throw err;
  }

  if (typeof (window as any).ImageCapture === 'undefined') {
    console.warn('[Sentry] ImageCapture não disponível, usando fallback canvas');
  }

  const totalCaptureMs = (3 - 1) * CAPTURE_INTERVAL_MS + 500;
  const [frames, audioDataUrl] = await Promise.all([
    captureFrames(stream, canvas, 3, CAPTURE_INTERVAL_MS),
    wantAudio && stream.getAudioTracks().length > 0 ? captureAudio(stream, totalCaptureMs) : Promise.resolve(null),
  ]);
  if (frames.length < 1) throw new Error('Nenhum frame capturado.');

  return sendToApi(frames, userId, audioDataUrl, 0, videoLink);
}

export interface SentryScanFromVideoOptions {
  file: File;
  userId?: string | null;
  consumeCredit: () => Promise<boolean>;
}

/**
 * Análise Sentry a partir de um vídeo (ex.: gravação de tela Apowersoft).
 * Envia o arquivo para /api/scan e retorna o resultado no formato Sentry.
 */
export async function runSentryScanFromVideo(options: SentryScanFromVideoOptions): Promise<AnalysisResult> {
  const { file, userId, consumeCredit } = options;
  if (!file || !file.type.startsWith('video/')) {
    throw new Error('Selecione um arquivo de vídeo.');
  }
  const allowed = await consumeCredit();
  if (!allowed) {
    const err: any = new Error('Créditos insuficientes.');
    err.code = 'CREDITS_INSUFFICIENT';
    throw err;
  }

  const formData = new FormData();
  formData.append('file', file);
  if (userId) formData.append('userId', userId);
  formData.append('deviceId', getOrCreateDeviceId());
  formData.append('type', 'sentry');

  const res = await fetchWithTimeout(
    '/api/scan',
    {
      method: 'POST',
      body: formData,
      headers: { 'X-Device-Id': getOrCreateDeviceId() },
    },
    API_TIMEOUT_MS
  );

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (res.status >= 400) throw new Error(text || `Erro ${res.status}`);
    throw new Error('Resposta inválida do servidor.');
  }

  const data = await res.json();
  if (res.status === 403) {
    const err: any = new Error(data.error || 'Créditos insuficientes.');
    err.code = 'CREDITS_INSUFFICIENT';
    throw err;
  }
  if (res.status >= 400) {
    throw new Error(data.error || data.erro || `Erro ${res.status}`);
  }

  return {
    ...data,
    id: data.id || `sentry_video_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    fileName: file.name,
    mediaType: 'VIDEO' as const,
    score: Number(data.score) ?? 0,
  } as AnalysisResult;
}
