/**
 * Detecção de capacidades do dispositivo para adaptação mobile/Android.
 * Permite fallbacks quando getDisplayMedia ou Document PiP não estão disponíveis.
 */

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || '');
}

/** Document Picture-in-Picture não é suportado no Chrome Android */
export function pipSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'documentPictureInPicture' in window;
}

/** getDisplayMedia pode ter suporte limitado em mobile */
export function displayMediaSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
  return typeof navigator.mediaDevices.getDisplayMedia === 'function';
}

/** Usar fluxo mobile (upload/câmera) quando getDisplayMedia não disponível ou em mobile */
export function useSentryMobileFlow(): boolean {
  return isMobile() || !displayMediaSupported();
}

/** PiP disponível (Chrome/Edge desktop 116+) */
export function useSentryPip(): boolean {
  return pipSupported();
}
