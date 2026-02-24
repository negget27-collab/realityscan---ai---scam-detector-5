export enum DetectionType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  SCAM = 'SCAM',
  RECON = 'RECON'
}

export interface PlanConfig {
  id: string;
  level: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: string;
  colorClass: string;
  type: 'subscription' | 'credits';
  amount?: number;
}

export interface AnalysisResult {
  id: string;
  fileName: string;
  score: number; // 0 to 100
  isAI: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  findings: string[];
  verdict: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO';
  scamAlert?: {
    type: string;
    riskLevel: 'CRITICAL' | 'MODERATE' | 'LOW';
    description: string;
  };
  groundingLinks?: { title: string; uri: string }[];
  analysis?: string; // Relatório forense detalhado (texto completo da IA)
  /** Explicação detalhada dos indicadores de IA (Gemini) — relatório profissional */
  indicatorsDetail?: string;
  /** Link do vídeo/fonte quando disponível (Sentry ou informado pelo usuário) */
  videoLink?: string;
}

export interface UserStats {
  plan: 'free' | 'advanced' | 'business';
  credits: number;
  monthlyCredits: number;
  subscriptionActive: boolean;
  subscriptionId?: string;
  planExpiresAt?: string;
}

export interface AppState {
  isScanning: boolean;
  currentResult: AnalysisResult | null;
  bulkResults: AnalysisResult[] | null;
  batchProgress: { current: number; total: number } | null;
  error: string | null;
  userStats: UserStats | null;
}
