/**
 * Proteção contra Mídia Falsa — opt-in, transparente, conforme lojas
 * Usuário ativa → app analisa. Nunca scan oculto.
 */

const STORAGE_KEY = 'rs_media_protection';
const CONSENT_KEY = 'rs_media_protection_consent_at';

export interface MediaProtectionState {
  enabled: boolean;
  consentAt: string | null; // ISO string do momento do consentimento
}

export function getMediaProtectionState(): MediaProtectionState {
  if (typeof window === 'undefined') {
    return { enabled: false, consentAt: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, consentAt: null };
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      consentAt: parsed.consentAt || null,
    };
  } catch {
    return { enabled: false, consentAt: null };
  }
}

export function setMediaProtectionEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const consentAt = enabled ? new Date().toISOString() : null;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: !!enabled, consentAt })
    );
    localStorage.setItem(CONSENT_KEY, consentAt || '');
  } catch {
    // ignore
  }
}

export const MEDIA_PROTECTION_CONSENT_TEXT = `Ativar proteção contra mídia falsa?

O RealityScan analisa suas fotos e vídeos para proteger contra:
• Imagens geradas por IA
• Deepfakes
• Manipulações digitais
• Golpes com mídia falsa

Camadas de análise: visual (IA), metadados EXIF e padrões suspeitos.
Você escolhe quando escanear. Dados processados com segurança. Não armazenamos seu conteúdo.`;

const SCANNED_HASHES_KEY = 'rs_media_scanned_hashes';
const MAX_SCANNED_HASHES = 500;

/** Gera fingerprint do arquivo para evitar re-scan (name+size+lastModified) */
export function getFileFingerprint(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export function wasScanned(fingerprint: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(SCANNED_HASHES_KEY);
    if (!raw) return false;
    const set = new Set(JSON.parse(raw) as string[]);
    return set.has(fingerprint);
  } catch {
    return false;
  }
}

export function markAsScanned(fingerprint: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(SCANNED_HASHES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const set = new Set(arr as string[]);
    set.add(fingerprint);
    const trimmed = Array.from(set).slice(-MAX_SCANNED_HASHES);
    localStorage.setItem(SCANNED_HASHES_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}
