/**
 * Serviço de indicação (referral) - compartilhe e ganhe scans
 * 1 conversão confirmada (pagamento) = 5 scans para o indicador
 */

const REFERRAL_STORAGE_KEY = 'rs_referral_code';
const REFERRAL_EXPIRY_DAYS = 30;

/** Obtém ou salva o código de indicação da URL (?ref=xxx) */
export function captureReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref')?.trim();
  if (!ref || ref.length < 4) return null;
  try {
    const stored = { code: ref, at: Date.now() };
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(stored));
    return ref;
  } catch {
    return null;
  }
}

/** Retorna o código de indicação armazenado (se ainda válido) e o remove após uso */
export function getAndConsumeReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const code = parsed?.code;
    const at = parsed?.at || 0;
    const ageDays = (Date.now() - at) / (1000 * 60 * 60 * 24);
    if (!code || ageDays > REFERRAL_EXPIRY_DAYS) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

/** Retorna o código de indicação sem consumir (para enviar no checkout) */
export function peekReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const code = parsed?.code;
    const at = parsed?.at || 0;
    const ageDays = (Date.now() - at) / (1000 * 60 * 60 * 24);
    if (!code || ageDays > REFERRAL_EXPIRY_DAYS) return null;
    return code;
  } catch {
    return null;
  }
}

/** Remove o código após conversão bem-sucedida */
export function clearReferralCode(): void {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {}
}
