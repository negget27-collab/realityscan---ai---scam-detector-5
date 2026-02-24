/**
 * Cliente da Voice API (detector de voz sintética + SyncNet).
 * Usado pelo Sentry quando há áudio no compartilhamento.
 */

import fetch from 'node-fetch';

const VOICE_API_URL = process.env.VOICE_API_URL || process.env.DEEPFAKE_API_URL || '';

/**
 * Analisa áudio para detectar voz sintética.
 * @param {Buffer|string} audio - buffer do áudio ou base64/data URL
 * @param {string} [mimeType] - ex: audio/webm, audio/wav
 * @returns {Promise<{ fake: number, real: number, resultado: string, score_fake_pct: number } | null>}
 */
export async function analyzeAudioVoice(audio, mimeType = 'audio/webm') {
  const baseUrl = VOICE_API_URL || process.env.VOICE_API_URL || '';
  if (!baseUrl) return null;

  const url = baseUrl.replace(/\/$/, '') + '/analisar-audio-base64';
  let dataUrl = audio;
  if (Buffer.isBuffer(audio)) {
    dataUrl = `data:${mimeType};base64,${audio.toString('base64')}`;
  } else if (typeof audio === 'string' && !audio.startsWith('data:')) {
    dataUrl = `data:${mimeType};base64,${audio}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: dataUrl, audioBase64: dataUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Voice API ${res.status}: ${await res.text()}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Análise de voz expirou.');
    throw err;
  }
}

/**
 * Analisa lip-sync (vídeo com áudio).
 * @param {Buffer} videoBuffer - buffer do vídeo
 * @param {string} mimeType
 * @returns {Promise<{ lip_sync_ok: boolean|null, confidence: number|null, distance: number|null, resultado: string } | null>}
 */
export async function analyzeLipsync(videoBuffer, mimeType = 'video/webm') {
  const baseUrl = VOICE_API_URL || process.env.VOICE_API_URL || '';
  if (!baseUrl) return null;

  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('video', videoBuffer, { filename: 'sentry.webm', contentType: mimeType });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(baseUrl.replace(/\/$/, '') + '/analisar-lipsync', {
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
 * Lip-sync Sentry: frames + áudio base64.
 * API cria vídeo, mescla áudio, executa SyncNet.
 * @param {string[]} frames - data URLs
 * @param {string} audioDataUrl - data URL base64 do áudio
 */
export async function analyzeLipsyncSentry(frames, audioDataUrl) {
  const baseUrl = VOICE_API_URL || process.env.VOICE_API_URL || process.env.DEEPFAKE_API_URL || '';
  if (!baseUrl || !Array.isArray(frames) || frames.length < 1 || !audioDataUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(baseUrl.replace(/\/$/, '') + '/analisar-lipsync-sentry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames: frames.slice(0, 32), audio: audioDataUrl, audioBase64: audioDataUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
