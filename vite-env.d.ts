
/// <reference types="vite/client" />

interface Window {
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
    readonly OPENROUTER_KEY: string;
  }
}

interface ImportMetaEnv {
  readonly VITE_GEMINI_KEY: string;
  readonly OPENROUTER_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
