/**
 * Conversor de preços por idioma.
 * Base: BRL (Mercado Pago). Exibição em USD (EN) e EUR (ES).
 * Taxas aproximadas - atualize conforme necessário.
 */

export type Language = 'PT' | 'EN' | 'ES';

// Preços base em BRL (usados no Mercado Pago)
export const PRICES_BRL = {
  advanced: 21.90,
  business: 34.90,
  credits_5: 8,
  credits_20: 28,
  credits_50: 58,
  perScan_advanced: 0.27,
  perScan_business: 0.17,
} as const;


// Preços arredondados para exibição por idioma
const DISPLAY_PRICES: Record<Language, Record<string, string>> = {
  PT: {
    advanced: 'R$ 21,90',
    business: 'R$ 34,90',
    credits_5: 'R$ 8',
    credits_20: 'R$ 28',
    credits_50: 'R$ 58',
    fromPrice: 'Plano a partir de R$ 21,90',
    perScan_advanced: 'R$ 0,27',
    perScan_business: 'R$ 0,17',
  },
  EN: {
    advanced: '$3.99',
    business: '$6.39',
    credits_5: '$1.49',
    credits_20: '$4.99',
    credits_50: '$9.99',
    fromPrice: 'Plan from $3.99',
    perScan_advanced: '$0.05',
    perScan_business: '$0.03',
  },
  ES: {
    advanced: '€3,99',
    business: '€6,39',
    credits_5: '€1,49',
    credits_20: '€4,99',
    credits_50: '€9,99',
    fromPrice: 'Plan desde €3,99',
    perScan_advanced: '€0,05',
    perScan_business: '€0,03',
  },
};

type PriceKey = 'advanced' | 'business' | 'credits_5' | 'credits_20' | 'credits_50' | 'fromPrice' | 'perScan_advanced' | 'perScan_business';

/**
 * Retorna o preço formatado para o idioma.
 */
export function getPrice(lang: Language, key: PriceKey): string {
  const normalizedLang = (lang === 'PT' ? 'PT' : lang === 'ES' ? 'ES' : 'EN') as Language;
  const prices = DISPLAY_PRICES[normalizedLang];
  return (prices[key] ?? DISPLAY_PRICES.PT[key]) as string;
}

/**
 * Preço do plano Advanced ou Business.
 */
export function getPlanPrice(lang: Language, planId: 'advanced' | 'business'): string {
  if (planId === 'advanced') return getPrice(lang, 'advanced');
  if (planId === 'business') return getPrice(lang, 'business');
  return planId === 'community' ? (lang === 'PT' ? 'Livre' : lang === 'EN' ? 'Free' : 'Gratis') : '';
}

/**
 * Preço do pacote de créditos.
 */
export function getCreditsPrice(lang: Language, packId: string): string {
  const key = packId as PriceKey;
  if (['credits_5', 'credits_20', 'credits_50'].includes(packId)) return getPrice(lang, key);
  return getPrice(lang, 'credits_5');
}

/**
 * Texto "Plano a partir de X".
 */
export function getFromPriceText(lang: Language): string {
  const normalizedLang = (lang === 'PT' ? 'PT' : lang === 'ES' ? 'ES' : 'EN') as Language;
  return DISPLAY_PRICES[normalizedLang].fromPrice;
}

/**
 * Preço por scan (ex: "R$ 0,26 por scan").
 */
export function getPerScanText(lang: Language, plan: 'advanced' | 'business'): string {
  const normalizedLang = (lang === 'PT' ? 'PT' : lang === 'ES' ? 'ES' : 'EN') as Language;
  const perScan = plan === 'advanced' ? DISPLAY_PRICES[normalizedLang].perScan_advanced : DISPLAY_PRICES[normalizedLang].perScan_business;
  const perScanLabel = lang === 'PT' ? 'por scan' : lang === 'EN' ? 'per scan' : 'por análisis';
  return `${perScan} ${perScanLabel}`;
}
