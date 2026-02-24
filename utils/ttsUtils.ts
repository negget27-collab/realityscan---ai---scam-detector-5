/**
 * Utilitários para Text-to-Speech nos chats
 * Corrige pronúncias, evita "asterístico", melhora tom e sotaque pt-BR
 */

/** Pré-processa texto para melhor pronúncia antes de enviar ao TTS */
export function prepareTextForSpeech(text: string, lang: string): string {
  let out = text
    // Remove formatação markdown que atrapalha a leitura
    .replace(/\*+/g, "")
    .replace(/_+/g, "")
    .replace(/#+/g, "")
    .replace(/`+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const isPt = /pt|PT|português/i.test(lang);

  if (isPt) {
    // IA → inteligência artificial (evita "iá" ou leitura como verbo)
    out = out.replace(/\bI\.?\s*A\.?\b/gi, "inteligência artificial");
    out = out.replace(/\bIA\b/g, "inteligência artificial");
    // Deepfake → pronúncia correta em pt-BR (dip fêique)
    out = out.replace(/\bdeepfake[s]?\b/gi, "dip fêique");
    // Evita "asterístico" — característico/estatístico mal pronunciados por alguns TTS
    out = out.replace(/\bcaracterístico\b/gi, "caracterís tico");
    out = out.replace(/\bcaracterística\b/gi, "caracterís tica");
    out = out.replace(/\bestatístico\b/gi, "estatís tico");
    out = out.replace(/\bestatística\b/gi, "estatís tica");
    // Outras palavras que costumam ser mal lidas
    out = out.replace(/\bforense\b/gi, "fo rense");
    out = out.replace(/\bmanipulação\b/gi, "mani pu lação");
    out = out.replace(/\bmetadados\b/gi, "meta dados");
    // % → "por cento" para leitura natural
    out = out.replace(/(\d+)\s*%/g, "$1 por cento");
  } else if (/en|EN|english/i.test(lang)) {
    out = out.replace(/\bI\.?\s*A\.?\b/gi, "A I");
    out = out.replace(/\bIA\b/g, "A I");
    out = out.replace(/\bdeepfake[s]?\b/gi, "deep fake");
    out = out.replace(/(\d+)\s*%/g, "$1 percent");
  } else if (/es|ES|español/i.test(lang)) {
    out = out.replace(/\bI\.?\s*A\.?\b/gi, "inteligencia artificial");
    out = out.replace(/\bIA\b/g, "inteligencia artificial");
    out = out.replace(/\bdeepfake[s]?\b/gi, "deep fake");
    out = out.replace(/(\d+)\s*%/g, "$1 por ciento");
  }

  return out;
}

/**
 * Divide o texto em frases para prosódia: cada segmento terminado em . ! ? é falado separadamente,
 * para que o TTS aplique entonação correta (interrogativa em "?", exclamativa em "!").
 */
export function splitSentencesForProsody(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/(?<=[.!?])\s+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Retorna voz preferida para o idioma (pt-BR com sotaque claro) */
export function getPreferredVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;

  const langCode = lang === "PT" ? "pt-BR" : lang === "EN" ? "en-US" : lang === "ES" ? "es-ES" : "pt-BR";
  const isTargetLang = (v: SpeechSynthesisVoice) =>
    (v.lang || "").toLowerCase().includes(langCode.toLowerCase().replace("-", ""));
  const isFemale = (v: SpeechSynthesisVoice) =>
    v.name && /feminin|female|mulher|maria|francisca|daniela|luciana|vitória|lívia|amanda|heloísa|sandra|female/i.test(v.name);
  // Preferência por vozes de melhor qualidade (Google, Microsoft, natural)
  const isPreferred = (v: SpeechSynthesisVoice) =>
    v.name && /google|microsoft|natural|premium|padrão/gi.test(v.name);

  const targetVoices = voices.filter(isTargetLang);
  const preferred = targetVoices.filter(isPreferred);
  const female = targetVoices.filter(isFemale);
  // Ordem: preferida feminina pt-BR > feminina pt-BR > preferida > qualquer pt-BR
  return (preferred.find(isFemale) || female[0] || preferred[0] || targetVoices[0] || voices.find((v) => (v.lang || "").startsWith("pt")) || voices.find((v) => v.default) || voices[0]) ?? null;
}

/** Configuração otimizada para TTS: tom natural, velocidade clara, sotaque pt-BR */
export const TTS_OPTIONS = {
  rate: 0.9,   // Levemente mais lento para pronúncia mais clara
  pitch: 0.98, // Tom um pouco mais grave = mais natural em pt-BR
};

/** Voz feminina meiga para atendente corporativo: tom acolhedor, suave */
export const TTS_OPTIONS_ATTENDANT = {
  rate: 0.85,  // Mais calmo e claro
  pitch: 1.06, // Tom levemente mais agudo = feminino e meigo
};

/** Retorna voz feminina meiga para pt-BR (atendente). Preferência por vozes suaves. */
export function getAttendantVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const langCode = lang === "PT" ? "pt-BR" : lang === "EN" ? "en-US" : lang === "ES" ? "es-ES" : "pt-BR";
  const isTargetLang = (v: SpeechSynthesisVoice) =>
    (v.lang || "").toLowerCase().includes(langCode.toLowerCase().replace("-", ""));
  const isFemale = (v: SpeechSynthesisVoice) =>
    v.name && /feminin|female|mulher|maria|francisca|daniela|luciana|vitória|lívia|amanda|heloísa|sandra|female|woman/i.test(v.name);
  const targetVoices = voices.filter(isTargetLang);
  const female = targetVoices.filter(isFemale);
  return (female[0] || targetVoices[0] || voices.find((v) => (v.lang || "").startsWith("pt")) || voices[0]) ?? null;
}
