import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnalysisResult } from '../types';
import jsPDF from 'jspdf';
import { Maximize2, Minimize2, Download, Info, RefreshCw, Volume2, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../services/i18n-temp';
import { prepareTextForSpeech, getPreferredVoice, TTS_OPTIONS } from '../utils/ttsUtils';

interface SentryHistoryItem {
  result: AnalysisResult;
  timestamp: string;
}

interface SentryMiniHUDProps {
  isActive: boolean;
  onDeactivate: () => void;
  lastResult: AnalysisResult | null;
  lastError?: string | null;
  isScanning: boolean;
  onNotification?: (msg: string, type?: 'error' | 'success' | 'warning') => void;
  sentryHistory?: SentryHistoryItem[];
  /** Chamado ao clicar em Nova análise; pode receber link do vídeo (opcional) para salvar no database */
  onAnalyzeAgain?: (videoLink?: string) => void;
  pipSupported?: boolean;
  /** Quando fornecidos pelo App (PiP aberto antes de getDisplayMedia), usa esses em vez do estado interno. */
  pipWindow?: Window | null;
  setPipWindow?: (w: Window | null) => void;
}

export const SentryMiniHUD: React.FC<SentryMiniHUDProps> = ({
  isActive,
  onDeactivate,
  lastResult,
  lastError,
  isScanning,
  onNotification,
  sentryHistory = [],
  onAnalyzeAgain,
  pipSupported: pipSupportedProp = true,
  pipWindow: pipWindowProp,
  setPipWindow: setPipWindowProp,
}) => {
  const { t } = useI18n();
  const [pipWindowInternal, setPipWindowInternal] = useState<Window | null>(null);
  const pipWindow = pipWindowProp !== undefined ? pipWindowProp : pipWindowInternal;
  const setPipWindow = setPipWindowProp ?? setPipWindowInternal;
  const [isIframe, setIsIframe] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const PIP_SMALL = { w: 320, h: 260 };
  const PIP_LARGE = { w: 420, h: 380 };
  const [showInstructions, setShowInstructions] = useState(true);
  const [showIndicatorsDetail, setShowIndicatorsDetail] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [videoLinkInput, setVideoLinkInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [];
    };
    loadVoices();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.onvoiceschanged = loadVoices;
      return () => { speechSynthesis.onvoiceschanged = null; };
    }
  }, []);

  const getFemaleVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    const isFemale = (v: SpeechSynthesisVoice) => v.name && /feminin|female|mulher|maria|francisca|daniela|luciana|vitória|lívia|amanda|heloísa/i.test(v.name);
    const isPtBR = (v: SpeechSynthesisVoice) => /pt-BR|pt_BR|português brasil|portuguese.*brazil/i.test(v.lang || '');
    const female = voices.filter(isFemale);
    const ptBR = (arr: SpeechSynthesisVoice[]) => arr.find(isPtBR);
    return (ptBR(female) || female[0] || ptBR(voices) || voices.find(v => (v.lang || '').startsWith('pt')) || voices.find(v => v.default) || voices[0]) ?? null;
  }, []);

  const handleSpeakReport = useCallback(() => {
    if (!lastResult || lastResult.verdict === 'Erro de Rede' || typeof speechSynthesis === 'undefined') {
      onNotification?.('Nada para ouvir no momento.', 'warning');
      return;
    }
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const voice = getPreferredVoice('PT') || getFemaleVoice();
    const score = Number(lastResult.score) || 0;
    const verdict = String(lastResult.verdict || '').replace(/<[^>]+>/g, '');
    const intro = `Relatório Sentry. Risco de ${score} por cento.`;
    const status = score >= 50 ? 'Atenção: presença de inteligência artificial detectada.' : 'Integridade do conteúdo preservada.';
    const full = verdict ? `${intro} ${status} ${verdict.slice(0, 400)}` : `${intro} ${status}`;
    const cleanFull = prepareTextForSpeech(full, 'PT');

    const u = new SpeechSynthesisUtterance(cleanFull);
    u.lang = 'pt-BR';
    u.rate = TTS_OPTIONS.rate;
    u.pitch = TTS_OPTIONS.pitch;
    if (voice) u.voice = voice;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(u);
    setIsSpeaking(true);
  }, [lastResult, isSpeaking, getFemaleVoice, onNotification]);

  useEffect(() => {
    if (!isActive) speechSynthesis?.cancel();
  }, [isActive]);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  const closePip = useCallback(() => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  }, [pipWindow, setPipWindow]);

  /** Fechar Mini HUD: fecha a janela PiP primeiro (evita botão travar) e depois desativa. */
  const handleDeactivate = useCallback(() => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
    onDeactivate?.();
  }, [pipWindow, setPipWindow, onDeactivate]);

  useEffect(() => {
    if (!isActive && pipWindow) {
      closePip();
    }
    if (!pipWindow) setIsMaximized(false);
    return () => {
      if (pipWindow) pipWindow.close();
    };
  }, [isActive, pipWindow, closePip]);

  const handlePopOut = useCallback(async () => {
    if (isIframe) {
      onNotification?.("Janela destacada indisponível em modo incorporado (Iframe). Abra em uma aba separada.", "warning");
      return;
    }
    if (!('documentPictureInPicture' in window)) {
      onNotification?.("Janela flutuante disponível apenas no Chrome/Edge 116+.", "warning");
      return;
    }
    try {
      // @ts-ignore
      const dw = await window.documentPictureInPicture.requestWindow({
        width: PIP_SMALL.w,
        height: PIP_SMALL.h,
      });
      const styles = document.querySelectorAll('link, style');
      styles.forEach(s => dw.document.head.appendChild(s.cloneNode(true)));
      dw.document.body.style.backgroundColor = '#030712';
      dw.document.body.style.margin = '0';
      dw.document.body.className = 'bg-[#030712] text-white overflow-hidden h-full';
      dw.addEventListener('pagehide', () => {
        setPipWindow(null);
        setTimeout(() => onDeactivate?.(), 0);
      });
      setPipWindow(dw);
    } catch (err: any) {
      console.error("PiP Failed:", err);
      onNotification?.(err.name === 'NotAllowedError' ? "Clique diretamente no botão de janela flutuante (gesto do usuário exigido)." : "Falha ao abrir janela PiP.", "error");
    }
  }, [isIframe, onNotification]);

  const togglePipSize = useCallback(() => {
    if (!pipWindow || typeof pipWindow.resizeTo !== 'function') return;
    const nextMax = !isMaximized;
    const sz = nextMax ? PIP_LARGE : PIP_SMALL;
    try {
      pipWindow.resizeTo(sz.w, sz.h);
      setIsMaximized(nextMax);
    } catch {
      setIsMaximized(nextMax);
    }
  }, [pipWindow, isMaximized]);

  // PiP exige gesto do usuário (clique). Auto-open falha com NotAllowedError.

  if (!isActive) return null;

  const isAlert = lastResult && lastResult.score >= 50;
  const isNetworkError = lastResult?.verdict === 'Erro de Rede';

  /** Marca em vermelho termos relacionados a IA — obrigatório mesmo em contexto humorístico */
  const highlightAIWords = (text: string) => {
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const phrases = [
      'presença de IA', 'presença de inteligência artificial',
      'criado com IA', 'criado por IA', 'gerado por IA', 'gerado com IA',
      'conteúdo com IA', 'conteúdo adulterado', 'deepfake', 'manipulação digital',
      'Há presença de IA', 'há presença de IA',
      'inteligência artificial',
    ];
    let result = escapeHtml(text);
    phrases.forEach((phrase) => {
      const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(re, (m) => `<span class="text-red-400 font-bold">${m}</span>`);
    });
    result = result.replace(/\b(IA)\b/gi, '<span class="text-red-400 font-bold">$1</span>');
    return result;
  };

  const handleDownloadPDF = async () => {
    if (sentryHistory.length === 0) {
      onNotification?.('Nenhum dado coletado ainda para exportar.', 'warning');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.setFontSize(18);
      pdf.text('Relatório Sentry - RealityScan', 20, 20);
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 28);
      pdf.text(`Total de análises: ${sentryHistory.length}`, 20, 34);

      let y = 45;
      sentryHistory.forEach((item, i) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        const r = item.result;
        const dt = new Date(item.timestamp).toLocaleString('pt-BR');
        pdf.setFontSize(11);
        pdf.text(`#${i + 1} - ${dt}`, 20, y);
        y += 6;
        pdf.setFontSize(9);
        pdf.text(`Risco: ${r.score}% | ${r.score >= 50 ? 'IA DETECTADA' : 'Integridade OK'}`, 20, y);
        y += 5;
        if (r.verdict) {
          const lines = pdf.splitTextToSize(String(r.verdict).slice(0, 200) + '...', 170);
          pdf.text(lines, 20, y);
          y += lines.length * 5 + 2;
        }
        y += 8;
      });

      pdf.save(`RealityScan_Sentry_${new Date().toISOString().slice(0, 10)}.pdf`);
      onNotification?.('PDF exportado com sucesso.', 'success');
    } catch (err: any) {
      console.error('PDF export error:', err);
      onNotification?.('Falha ao gerar PDF.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const instructions = (
    <div className="space-y-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <div className="flex items-center gap-2 text-blue-400">
        <Info className="w-3.5 h-3.5" />
        <span className="text-[9px] font-black uppercase tracking-widest">{t.howToUse}</span>
      </div>
      <p className="text-[8px] text-gray-400 leading-relaxed">
        {pipSupportedProp ? (
          <><span className="text-blue-400 font-bold">1.</span> Clique no ícone de janela flutuante (canto superior direito) para abrir em PiP. <span className="text-blue-400 font-bold">2.</span> {t.sentryInstructions}</>
        ) : (
          <>Clique em <span className="text-blue-400 font-bold">Nova análise</span> e escolha <span className="text-blue-400 font-bold">Galeria</span> ou <span className="text-blue-400 font-bold">Câmera</span> para enviar a imagem a ser analisada.</>
        )}
      </p>
    </div>
  );

  const HUDContent = (
    <div className={`
      relative w-full h-full p-6 flex flex-col justify-between transition-all duration-700
      ${isAlert ? 'bg-red-950/95' : isNetworkError ? 'bg-amber-950/50' : 'bg-[#0a0f1e]/90'}
      ${pipWindow ? '' : 'rounded-[2.5rem] border border-blue-500/30 shadow-2xl backdrop-blur-2xl'}
      ${isMaximized ? 'min-w-[420px] min-h-[380px]' : ''}
    `}>
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className={`w-full h-1.5 absolute top-0 left-0 animate-[sentry_4s_linear_infinite] ${isAlert ? 'bg-red-500' : isNetworkError ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
      </div>
      <style>{`
        @keyframes sentry {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
      `}</style>

      <div className="flex justify-between items-start z-10">
        <div className="flex items-center space-x-3">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isScanning ? 'bg-amber-500 animate-pulse scale-125' : isNetworkError ? 'bg-amber-500' : 'bg-green-500 shadow-[0_0_12px_#22c55e]'}`}></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white uppercase tracking-widest leading-none">SENTRY_ACTIVE</span>
            <span className={`text-[6px] font-mono uppercase tracking-[0.2em] mt-1 ${isNetworkError ? 'text-amber-400' : 'text-gray-500'}`}>
              {isScanning ? t.analyzing : isNetworkError ? 'RETRY_NET_RECOVERY' : lastResult ? t.analysisComplete : t.readyToAnalyze}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {pipWindow ? (
            <>
              <button onClick={togglePipSize} title={isMaximized ? "Mini HUD pequeno" : "Mini HUD tela cheia"} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400">
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={handleSpeakReport} disabled={!lastResult || lastResult.verdict === 'Erro de Rede'} title={isSpeaking ? "Parar áudio" : "Ouvir relatório em áudio"} className={`p-2 rounded-xl ${lastResult && lastResult.verdict !== 'Erro de Rede' ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400' : 'opacity-30 cursor-not-allowed text-gray-600'} ${isSpeaking ? 'text-blue-400' : ''}`}>
                {isSpeaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={handleDownloadPDF} disabled={sentryHistory.length === 0 || isGeneratingPDF} title="Baixar PDF" className={`p-2 rounded-xl ${sentryHistory.length > 0 ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400' : 'opacity-30 cursor-not-allowed text-gray-600'}`}>
                <Download className="w-4 h-4" />
              </button>
              <button onClick={handleDeactivate} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-red-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6" /></svg>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowInstructions(!showInstructions)} title="Instruções" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400">
                <Info className="w-4 h-4" />
              </button>
              <button onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? "Minimizar" : "Maximizar"} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400">
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={handleSpeakReport} disabled={!lastResult || lastResult.verdict === 'Erro de Rede'} title={isSpeaking ? "Parar áudio" : "Ouvir relatório em áudio"} className={`p-2 rounded-xl ${lastResult && lastResult.verdict !== 'Erro de Rede' ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400' : 'opacity-30 cursor-not-allowed text-gray-600'} ${isSpeaking ? 'text-blue-400' : ''}`}>
                {isSpeaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={handleDownloadPDF} disabled={sentryHistory.length === 0 || isGeneratingPDF} title="Baixar PDF" className={`p-2 rounded-xl ${sentryHistory.length > 0 ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400' : 'opacity-30 cursor-not-allowed text-gray-600'}`}>
                <Download className="w-4 h-4" />
              </button>
              {pipSupportedProp && (
                <button onClick={handlePopOut} title={isIframe ? "Indisponível em Iframe" : "Abrir em janela flutuante (use na rede social)"} className={`p-2 rounded-xl ${isIframe ? 'opacity-30 cursor-not-allowed bg-white/5 text-gray-600' : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 hover:text-blue-300 ring-2 ring-blue-500/30'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2z" /></svg>
                </button>
              )}
<button onClick={handleDeactivate} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6" /></svg>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center py-2 z-10 text-center overflow-y-auto">
        {showInstructions && !lastResult && (
          <div className="mb-4 w-full">{instructions}</div>
        )}
        {lastResult && !isNetworkError ? (
          <div key={lastResult.id || lastResult.fileName} className="animate-in zoom-in duration-500 space-y-2 w-full">
            <div className={`text-6xl font-black italic tracking-tighter ${isAlert ? 'text-red-500' : 'text-blue-500'}`}>
              {Number(lastResult.score) || 0}%
            </div>
            <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
              {isAlert ? t.aiDetected : t.integrityOk}
            </p>
            {lastResult.verdict && (
              <div className="text-[8px] text-gray-400 mt-2 text-left max-h-24 overflow-y-auto leading-relaxed custom-scrollbar" dangerouslySetInnerHTML={{ __html: highlightAIWords(String(lastResult.verdict)) }} />
            )}
            {lastResult.indicatorsDetail && isAlert && (
              <div className="mt-2 w-full">
                <button onClick={() => setShowIndicatorsDetail(!showIndicatorsDetail)} className="flex items-center gap-1.5 text-[9px] font-black text-amber-400/90 hover:text-amber-300 uppercase tracking-widest w-full text-left">
                  {showIndicatorsDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {t.indicatorsDetailTitle}
                </button>
                {showIndicatorsDetail && (
                  <div className="text-[7px] text-gray-300/90 mt-1.5 p-2 rounded-lg bg-black/30 border border-amber-500/20 text-left max-h-32 overflow-y-auto leading-relaxed custom-scrollbar whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightAIWords(String(lastResult.indicatorsDetail)) }} />
                )}
              </div>
            )}
            {sentryHistory.length > 0 && (
              <p className="text-[7px] text-gray-500 mt-2">{sentryHistory.length} {t.analysesInSession}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className={`w-12 h-12 border-2 rounded-full animate-spin ${isScanning ? 'border-amber-500 border-t-transparent' : isNetworkError ? 'border-amber-500' : 'border-blue-500 border-t-transparent'}`}></div>
            <div className="space-y-1">
              <p className={`text-[9px] font-mono uppercase tracking-[0.4em] font-black animate-pulse ${isNetworkError ? 'text-amber-500' : 'text-blue-500/60'}`}>
                {isNetworkError ? 'REDE_INSTÁVEL' : isScanning ? 'ANALISANDO' : 'AGUARDANDO'}
              </p>
              <p className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">
                {isScanning ? t.processingCapture : t.clickNewAnalysis}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={`mt-2 p-3 rounded-2xl border z-10 transition-all space-y-2 ${isAlert ? 'bg-red-600/10 border-red-500/30' : isNetworkError ? 'bg-amber-600/10 border-amber-500/20' : 'bg-black/50 border-white/5'}`}>
        {isAlert ? (
          <p className="text-[9px] font-black text-red-400 uppercase text-center italic animate-pulse">⚠️ {t.alertAiContent}</p>
        ) : (
          <div className="flex justify-between items-center px-2">
            <span className="text-[6px] font-mono text-gray-500 uppercase">Shield_Status:</span>
            <span className={`text-[7px] font-black uppercase italic ${isNetworkError ? 'text-amber-500' : 'text-green-500'}`}>
              {isNetworkError ? t.standbyMode : t.operational}
            </span>
          </div>
        )}
        {onAnalyzeAgain && (
          <div className="space-y-2">
            <input
              type="url"
              placeholder="Link do vídeo (opcional)"
              value={videoLinkInput}
              onChange={(e) => setVideoLinkInput(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-[9px] text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <button
              type="button"
              onClick={() => {
                const link = videoLinkInput.trim() || undefined;
                if (typeof window !== 'undefined' && typeof (window as any).BroadcastChannel !== 'undefined') {
                  try {
                    new BroadcastChannel('rs-sentry').postMessage({ type: 'analyze', videoLink: link });
                    return;
                  } catch (_) {}
                }
                onAnalyzeAgain?.(link);
              }}
              disabled={isScanning}
              className="w-full py-2 flex items-center justify-center gap-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 text-[9px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {lastResult ? t.analyzeAgain : t.newAnalysisBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const containerClass = isMaximized
    ? 'fixed inset-4 md:inset-8 z-[600] w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] max-w-2xl max-h-[500px] mx-auto animate-in zoom-in duration-300'
    : pipSupportedProp
      ? 'fixed bottom-8 right-8 z-[600] w-80 h-60 animate-in slide-in-from-bottom-10 duration-700'
      : 'fixed bottom-4 left-4 right-4 z-[600] w-[calc(100vw-2rem)] max-w-md mx-auto h-56 animate-in slide-in-from-bottom-10 duration-700';

  return (
    <>
      {!pipWindow && (
        <div className={containerClass}>
          {HUDContent}
        </div>
      )}
      {pipWindow && createPortal(HUDContent, pipWindow.document.body)}
    </>
  );
};
