
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { healthService, SystemLog } from '../services/SystemHealthService';
import { Terminal, ShieldAlert, Cpu, Activity, X, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'rs_ai_analyst_position_v2';

const ADMIN_EMAIL = 'negget27@gmail.com';

const apiKey = import.meta.env.VITE_GEMINI_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

function collectSystemInfo(): Record<string, unknown> {
  const nav = typeof navigator !== 'undefined' ? navigator : {} as Navigator;
  const perf = typeof performance !== 'undefined' ? performance : null;
  const screen = typeof window !== 'undefined' && window.screen ? window.screen : {} as Screen;

  return {
    userAgent: nav.userAgent || 'N/A',
    platform: nav.platform || 'N/A',
    language: nav.language || 'N/A',
    cookieEnabled: nav.cookieEnabled,
    online: nav.onLine,
    screenWidth: screen.width || 0,
    screenHeight: screen.height || 0,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 0,
    memory: (perf && (perf as any).memory) ? {
      usedJSHeapSize: Math.round((perf as any).memory.usedJSHeapSize / 1024 / 1024),
      totalJSHeapSize: Math.round((perf as any).memory.totalJSHeapSize / 1024 / 1024),
      jsHeapSizeLimit: Math.round((perf as any).memory.jsHeapSizeLimit / 1024 / 1024),
    } : null,
    timing: perf && perf.timing ? {
      loadEventEnd: perf.timing.loadEventEnd - perf.timing.navigationStart,
      domContentLoaded: perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart,
    } : null,
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    timestamp: new Date().toISOString(),
  };
}

interface AIAnalystAgentProps {
  userEmail?: string;
}

function loadPosition(): { x: number; y: number } {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const p = JSON.parse(s);
      if (typeof p.x === 'number' && typeof p.y === 'number') return p;
    }
  } catch {}
  return { x: typeof window !== 'undefined' ? window.innerWidth - 88 : 300, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 100 };
}

export const AIAnalystAgent: React.FC<AIAnalystAgentProps> = ({ userEmail }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'REPORTING'>('IDLE');
  const [healthScore, setHealthScore] = useState(100);
  const [isClosed, setIsClosed] = useState(false);
  const [position, setPosition] = useState(loadPosition);
  const dragRef = useRef<{ startX: number; startY: number; startPos: { x: number; y: number } } | null>(null);
  const didDragRef = useRef(false);

  const savePosition = useCallback((p: { x: number; y: number }) => {
    setPosition(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    didDragRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: { ...position } };
  }, [position]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
      const nx = Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.startPos.x + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.startPos.y + dy));
      savePosition({ x: nx, y: ny });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [savePosition]);

  if (userEmail !== ADMIN_EMAIL) return null;

  const runDiagnosis = async () => {
    setIsAnalyzing(true);
    setStatus('SCANNING');

    const logs = healthService.getLocalLogs();
    const health = await healthService.checkHealth();
    const systemInfo = collectSystemInfo();

    if (!ai) {
      setDiagnosis("API Key não configurada. Configure VITE_GEMINI_KEY no .env.local");
      setStatus('REPORTING');
      setIsAnalyzing(false);
      return;
    }

    try {
      const prompt = `Você é um analista de sistemas forense. Analise os dados abaixo de um aplicativo web RealityScan (detector de golpes/IA).

DADOS DO SISTEMA:
${JSON.stringify(systemInfo, null, 2)}

SAÚDE DO SISTEMA:
${JSON.stringify(health, null, 2)}

ÚLTIMOS LOGS (${logs.length} entradas):
${JSON.stringify(logs.slice(0, 15), null, 2)}

Identifique: conflitos, problemas de banco de dados, riscos de segurança, anomalias de performance, erros de autenticação.
Responda APENAS em JSON válido, sem markdown:
{ "diagnosis": "string (diagnóstico técnico em português)", "score": number (0-100, 100=ótimo), "alert": boolean (true se houver problema crítico)", "recommendations": ["string"] }`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const text = response.text || '{}';
      const result = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());

      const diagnosisText = result.diagnosis || "Sistema operando dentro dos parâmetros normais.";
      const score = typeof result.score === 'number' ? Math.min(100, Math.max(0, result.score)) : 100;
      const hasAlert = result.alert === true;

      setDiagnosis(diagnosisText);
      setHealthScore(score);

      if (hasAlert || health.status !== 'HEALTHY') {
        healthService.log('WARNING', 'AI_ANALYST', 'Padrão anômalo detectado na auditoria automatizada.', { result });
        healthService.addPendingAlert({
          diagnosis: diagnosisText,
          score,
          alert: hasAlert,
          health,
          logs: logs.slice(0, 20),
          systemInfo,
          userEmail: userEmail || undefined,
        });
      }

    } catch (err) {
      console.error('AI Analyst failed:', err);
      setDiagnosis("Motor de diagnóstico offline. Verificação manual necessária.");
      setHealthScore(50);
      healthService.log('ERROR', 'AI_ANALYST', 'Falha na análise', { error: String(err) });
    } finally {
      setStatus('REPORTING');
      setIsAnalyzing(false);
      setTimeout(() => setStatus('IDLE'), 10000);
    }
  };

  useEffect(() => {
    const interval = setInterval(runDiagnosis, 60000);
    runDiagnosis();
    return () => clearInterval(interval);
  }, []);

  if (isClosed) {
    return (
      <div
        className="fixed z-50 cursor-grab active:cursor-grabbing select-none"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={() => { if (!didDragRef.current) setIsClosed(false); }}
          className="p-2 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all cursor-pointer"
          title="Reabrir AI Systems Analyst"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 flex flex-col items-end cursor-grab active:cursor-grabbing select-none"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <AnimatePresence>
        {status !== 'IDLE' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-72 bg-[#0a0a0f]/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <GripVertical className="w-3 h-3 text-gray-500 cursor-grab" />
                <Cpu className={`w-4 h-4 ${isAnalyzing ? 'text-blue-400 animate-pulse' : 'text-emerald-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">AI Systems Analyst</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-blue-400">SCORE: {healthScore}%</span>
                <button
                  data-no-drag
                  onClick={(e) => { e.stopPropagation(); setIsClosed(true); }}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  className={`h-full ${healthScore > 80 ? 'bg-emerald-500' : healthScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                />
              </div>

              <p className="text-[9px] text-gray-400 font-mono leading-relaxed">
                {isAnalyzing ? (
                  <span className="flex items-center">
                    <Activity className="w-3 h-3 mr-2 animate-spin" />
                    Analyzing system heuristics...
                  </span>
                ) : diagnosis}
              </p>
            </div>

            {healthScore < 70 && (
              <div className="mt-3 flex items-center space-x-2 text-red-500 animate-pulse">
                <ShieldAlert className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase">Conflict Detected</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <button
          data-no-drag
          onClick={(e) => { e.stopPropagation(); setIsClosed(true); }}
          className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Fechar"
        >
          <X className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); runDiagnosis(); }}
          className={`p-4 rounded-full border transition-all duration-500 shadow-xl ${
            healthScore < 70
              ? 'bg-red-600/20 border-red-500 text-red-500 animate-bounce'
              : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
          }`}
          title="Escanear sistema"
        >
          {isAnalyzing ? <Activity className="w-6 h-6 animate-spin" /> : <Terminal className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};
