/**
 * Cliente do Deepfake API (RunPod / Cloud Run).
 * Chama o detector EfficientNet quando o usuário envia vídeo.
 * Uso: server-side apenas (Node.js)
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

/**
 * @param {Buffer} videoBuffer - buffer do vídeo
 * @param {string} mimeType - ex: video/mp4, video/webm
 * @param {string} [fileName] - nome do arquivo
 * @returns {Promise<{ fake: number, real: number, resultado: string, score_fake_pct?: number } | null>}
 */
export async function analyzeVideoDeepfake(videoBuffer, mimeType, fileName = 'video.mp4') {
  const baseUrl = process.env.DEEPFAKE_API_URL || '';
  if (!baseUrl) {
    console.warn('⚠️ DEEPFAKE_API_URL não configurada. Deepfake por vídeo desativado.');
    return null;
  }

  const url = baseUrl.replace(/\/$/, '') + '/analisar';
  const form = new FormData();
  form.append('video', videoBuffer, { filename: fileName, contentType: mimeType });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 502 || res.status === 503) {
        console.warn(`[Deepfake] API retornou ${res.status} (vídeo). Usando fallback.`);
        return null;
      }
      throw new Error(`Deepfake API ${res.status}: ${errText || res.statusText}`);
    }

    const json = await res.json();
    return {
      fake: json.fake ?? 0,
      real: json.real ?? 1,
      resultado: json.resultado ?? 'indeterminado',
      score_fake_pct: json.score_fake_pct ?? (json.fake != null ? json.fake * 100 : 0),
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Análise deepfake expirou. Tente um vídeo mais curto.');
    }
    throw err;
  }
}

/**
 * Analisa frames do Sentry Mini HUD com EfficientNet.
 * @param {string[]} frames - array de data URLs (base64)
 * @returns {Promise<{ fake: number, real: number, resultado: string, score_fake_pct: number } | null>}
 */
export async function analyzeFramesDeepfake(frames) {
  const baseUrl = process.env.DEEPFAKE_API_URL || '';
  if (!baseUrl || !Array.isArray(frames) || frames.length < 1) {
    return null;
  }

  const url = baseUrl.replace(/\/$/, '') + '/analisar-frames';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000); // 90s para Sentry

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames: frames.slice(0, 32) }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      // 502/503 do RunPod: fallback silencioso para não quebrar o fluxo
      if (res.status === 502 || res.status === 503) {
        console.warn(`[Deepfake] API retornou ${res.status} (Bad Gateway/Unavailable). Usando fallback.`);
        return null;
      }
      throw new Error(`Deepfake API ${res.status}: ${errText || res.statusText}`);
    }

    const json = await res.json();
    return {
      fake: json.fake ?? 0,
      real: json.real ?? 1,
      resultado: json.resultado ?? 'indeterminado',
      score_fake_pct: json.score_fake_pct ?? (json.fake != null ? json.fake * 100 : 0),
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Análise deepfake expirou.');
    }
    throw err;
  }
}

/**
 * Analisa áudio (voz sintética) com wav2vec2.
 * @param {Buffer} audioBuffer - buffer do áudio (webm, wav, mp3)
 * @param {string} mimeType - ex: audio/webm, audio/wav
 * @param {string} [fileName] - nome do arquivo
 * @returns {Promise<{ synthetic: number, real: number, resultado: string, score_synthetic_pct: number } | null>}
 */
export async function analyzeAudioSynthetic(audioBuffer, mimeType, fileName = 'audio.webm') {
  const baseUrl = process.env.DEEPFAKE_API_URL || '';
  if (!baseUrl) return null;

  const url = baseUrl.replace(/\/$/, '') + '/analisar-audio';
  const form = new FormData();
  form.append('audio', audioBuffer, { filename: fileName, contentType: mimeType });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Voice API ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return {
      synthetic: json.synthetic ?? 0,
      real: json.real ?? 1,
      resultado: json.resultado ?? 'indeterminado',
      score_synthetic_pct: json.score_synthetic_pct ?? (json.synthetic != null ? json.synthetic * 100 : 0),
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Análise de voz expirou.');
    throw err;
  }
}

/**
 * Analisa lip-sync (SyncNet) - vídeo com áudio.
 * @param {Buffer} videoBuffer - buffer do vídeo
 * @param {string} mimeType - ex: video/mp4, video/webm
 * @param {string} [fileName] - nome do arquivo
 * @returns {Promise<{ ok: boolean, avg_distance: number, resultado: string, suspicious: boolean } | null>}
 */
export async function analyzeLipsync(videoBuffer, mimeType, fileName = 'video.mp4') {
  const baseUrl = process.env.DEEPFAKE_API_URL || '';
  if (!baseUrl) return null;

  const url = baseUrl.replace(/\/$/, '') + '/analisar-lipsync';
  const form = new FormData();
  form.append('video', videoBuffer, { filename: fileName, contentType: mimeType });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Lipsync API ${res.status}: ${await res.text()}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Análise lip-sync expirou.');
    throw err;
  }
}

/**
 * Analisa áudio com wav2vec2 para detectar voz sintética (Sentry).
 * @param {Buffer} audioBuffer - buffer do áudio (webm, wav, mp3)
 * @param {string} mimeType - ex: audio/webm
 * @param {string} [fileName] - nome do arquivo
 * @returns {Promise<{ synthetic: number, real: number, resultado: string, score_synthetic_pct: number } | null>}
 */
export async function analyzeAudioDeepfake(audioBuffer, mimeType, fileName = 'audio.webm') {
  const baseUrl = process.env.DEEPFAKE_API_URL || '';
  if (!baseUrl || !audioBuffer || audioBuffer.length < 1000) return null;

  const url = baseUrl.replace(/\/$/, '') + '/analisar-audio';
  const form = new FormData();
  form.append('audio', audioBuffer, { filename: fileName, contentType: mimeType });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Voice API ${res.status}`);
    const json = await res.json();
    return {
      synthetic: json.synthetic ?? 0,
      real: json.real ?? 1,
      resultado: json.resultado ?? 'indeterminado',
      score_synthetic_pct: json.score_synthetic_pct ?? (json.synthetic != null ? json.synthetic * 100 : 0),
    };
  } catch (err) {
    clearTimeout(timeout);
    return null;
  }
}
