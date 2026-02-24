import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, FileText, Mic, MicOff, Volume2, Maximize2, Minimize2 } from "lucide-react";
import jsPDF from 'jspdf';
import { useI18n } from '../services/i18n-temp';
import { auth } from '../services/firebase';
import { prepareTextForSpeech, getPreferredVoice, TTS_OPTIONS, getAttendantVoice, TTS_OPTIONS_ATTENDANT, splitSentencesForProsody } from '../utils/ttsUtils';

async function generateForensicChat(
  msg: string,
  agentMode: string,
  chatLang: string,
  messages: { role: string; text: string }[],
  idToken?: string | null
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (agentMode === "corporate" && idToken) headers["Authorization"] = `Bearer ${idToken}`;
  const r = await fetch("/api/ai", {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: msg,
      agentMode,
      chatLang,
      messages: messages.map(m => ({ role: m.role, text: m.text }))
    })
  });
  const d = await r.json();
  return d.resposta || d.error || "Erro";
}

interface Message {
  role: "user" | "model";
  text: string;
}

const COMPACT_W = 380;
const COMPACT_H = 500;

const hasSpeechRecognition = typeof window !== "undefined" && !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
const hasSpeechSynthesis = typeof window !== "undefined" && "speechSynthesis" in window;

export type InitialServiceRequest = { serviceTitle: string; serviceId?: string };

/** Resposta inicial curta por serviço (voz + bolha), para não cansar o cliente com texto longo igual para todos. */
const INITIAL_VOICE_BY_SERVICE: Record<string, { PT: string; EN: string; ES: string }> = {
  audit: {
    PT: "Olá! Recebi seu interesse na Auditoria Técnica Completa. Analisamos performance, segurança e arquitetura. Nossa equipe envia uma proposta personalizada em breve.",
    EN: "Hi! I've received your interest in the Full Technical Audit. We analyze performance, security and architecture. Our team will send you a tailored proposal shortly.",
    ES: "Hola! Recibí tu interés en la Auditoría Técnica Completa. Analizamos rendimiento, seguridad y arquitectura. Nuestro equipo enviará una propuesta personalizada en breve.",
  },
  auditoria: {
    PT: "Olá! Recebi seu interesse na Auditoria Técnica Completa. Analisamos performance, segurança e arquitetura. Nossa equipe envia uma proposta personalizada em breve.",
    EN: "Hi! I've received your interest in the Full Technical Audit. Our team will send you a tailored proposal shortly.",
    ES: "Hola! Recibí tu interés en la Auditoría Técnica Completa. Nuestro equipo enviará una propuesta personalizada en breve.",
  },
  correction: {
    PT: "Olá! Entendemos que você precisa de Correção e Refatoração. Bugs em React, APIs ou autenticação — vamos te ajudar. Proposta em breve.",
    EN: "Hi! We understand you need Correction and Refactoring. Bugs in React, APIs or auth — we'll help. Proposal on its way.",
    ES: "Hola! Entendemos que necesitas Corrección y Refactorización. Bugs en React, APIs o autenticación — te ayudamos. Propuesta en breve.",
  },
  refatoracao: {
    PT: "Olá! Entendemos que você precisa de Correção e Refatoração. Bugs em React, APIs ou autenticação — vamos te ajudar. Proposta em breve.",
    EN: "Hi! We understand you need Correction and Refactoring. Proposal on its way.",
    ES: "Hola! Entendemos que necesitas Corrección y Refactorización. Propuesta en breve.",
  },
  performance: {
    PT: "Olá! Recebi seu pedido de Otimização e Performance. Lazy loading, cache, Redis — deixamos seu sistema mais rápido. Proposta sob consulta em breve.",
    EN: "Hi! I've received your Optimization and Performance request. We'll make your system faster. Proposal coming shortly.",
    ES: "Hola! Recibí tu solicitud de Optimización y Rendimiento. Dejamos tu sistema más rápido. Propuesta en breve.",
  },
  antifraud: {
    PT: "Olá! Segurança e Anti-Fraude com IA: detecção de risco, bloqueio automático e proteção contra deepfake. Nossa equipe monta uma proposta para você.",
    EN: "Hi! Security and Anti-Fraud with AI: risk scoring, auto-block and deepfake protection. Our team will prepare a proposal for you.",
    ES: "Hola! Seguridad y Anti-Fraude con IA: detección de riesgo, bloqueo automático y protección contra deepfake. Nuestro equipo te enviará una propuesta.",
  },
  development: {
    PT: "Olá! Desenvolvimento sob demanda: dashboards, APIs, integrações ou sistemas completos. Contamos o escopo e enviamos proposta em breve.",
    EN: "Hi! On-demand development: dashboards, APIs, integrations or full systems. We'll scope it and send a proposal shortly.",
    ES: "Hola! Desarrollo bajo demanda: dashboards, APIs, integraciones o sistemas completos. Enviamos propuesta en breve.",
  },
};

export const ChatAssistant: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  userName?: string | null;
  onAudioPlayingChange?: (playing: boolean) => void;
  isCorporateMode?: boolean;
  /** Ao abrir a partir de "Solicitar Proposta": envia a mensagem, obtém resposta da IA (Gemini) e fala em voz feminina meiga */
  initialServiceRequest?: InitialServiceRequest | null;
  onClearInitialRequest?: () => void;
}> = ({ isOpen, onClose, userName, onAudioPlayingChange, isCorporateMode = false, initialServiceRequest, onClearInitialRequest }) => {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [agentMode, setAgentMode] = useState<'advanced' | 'business' | 'corporate'>(isCorporateMode ? 'corporate' : 'advanced');
  const [chatLang, setChatLang] = useState<'PT' | 'EN' | 'ES'>(() => lang as 'PT' | 'EN' | 'ES');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatLang(lang as 'PT' | 'EN' | 'ES');
  }, [lang]);

  useEffect(() => {
    if (isCorporateMode) setAgentMode('corporate');
  }, [isCorporateMode]);

  const initialRequestHandledRef = useRef(false);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "model", text: isCorporateMode ? t.corporateAgentWelcome : t.reasoningAgentWelcome }]);
    }
  }, [chatLang, t.reasoningAgentWelcome, t.corporateAgentWelcome, isCorporateMode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (!initialServiceRequest) {
      initialRequestHandledRef.current = false;
      return;
    }
    if (!isOpen || !isCorporateMode || initialRequestHandledRef.current) return;
    const { serviceTitle, serviceId } = initialServiceRequest;
    initialRequestHandledRef.current = true;
    const userMsg = chatLang === "PT"
      ? `Gostaria de solicitar uma proposta para o serviço: ${serviceTitle}.`
      : chatLang === "ES"
        ? `Me gustaría solicitar una propuesta para el servicio: ${serviceTitle}.`
        : `I would like to request a quote for the service: ${serviceTitle}.`;
    const welcome = isCorporateMode ? t.corporateAgentWelcome : t.reasoningAgentWelcome;
    const newMessages: Message[] = [
      { role: "model", text: welcome },
      { role: "user", text: userMsg },
    ];
    setMessages(newMessages);

    const predefined = serviceId ? INITIAL_VOICE_BY_SERVICE[serviceId] : undefined;
    const shortResponse = predefined
      ? (predefined[chatLang] ?? predefined.PT)
      : null;

    if (shortResponse) {
      setMessages(prev => [...prev, { role: "model", text: shortResponse }]);
      if (hasSpeechSynthesis) setTimeout(() => speakMessage(shortResponse, true), 400);
      onClearInitialRequest?.();
      return;
    }

    setIsTyping(true);
    (async () => {
      try {
        const token = (await auth.currentUser?.getIdToken?.()) ?? null;
        const resposta = await generateForensicChat(userMsg, "corporate", chatLang, newMessages, token);
        setMessages(prev => [...prev, { role: "model", text: resposta }]);
        if (hasSpeechSynthesis && resposta) {
          setTimeout(() => speakMessage(resposta, true), 400);
        }
      } catch {
        setMessages(prev => [...prev, { role: "model", text: "Desculpe, não consegui processar sua solicitação agora. Tente novamente em instantes." }]);
      } finally {
        setIsTyping(false);
        onClearInitialRequest?.();
      }
    })();
    return () => {
      initialRequestHandledRef.current = false;
    };
  }, [isOpen, initialServiceRequest, isCorporateMode, chatLang, t.corporateAgentWelcome]);

  const langToSpeechCode: Record<string, string> = { PT: "pt-BR", EN: "en-US", ES: "es-ES" };

  const toggleVoiceInput = useCallback(() => {
    if (!hasSpeechRecognition) return;
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = langToSpeechCode[chatLang] || "pt-BR";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
    };
    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening, chatLang]);

  const speakMessage = useCallback((text: string, useAttendantVoice = false) => {
    if (!hasSpeechSynthesis) return;
    window.speechSynthesis.cancel();
    onAudioPlayingChange?.(false);
    const cleanText = prepareTextForSpeech(text, chatLang);
    if (!cleanText) return;
    const langCode = langToSpeechCode[chatLang] || "pt-BR";
    const rate = (useAttendantVoice && isCorporateMode) ? TTS_OPTIONS_ATTENDANT.rate : TTS_OPTIONS.rate;
    const pitch = (useAttendantVoice && isCorporateMode) ? TTS_OPTIONS_ATTENDANT.pitch : TTS_OPTIONS.pitch;
    const voice = (useAttendantVoice && isCorporateMode) ? getAttendantVoice(chatLang) : getPreferredVoice(chatLang);
    const sentences = splitSentencesForProsody(cleanText);
    if (sentences.length === 0) return;
    onAudioPlayingChange?.(true);
    sentences.forEach((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence);
      u.lang = langCode;
      u.rate = rate;
      u.pitch = pitch;
      if (voice) u.voice = voice;
      u.onstart = () => onAudioPlayingChange?.(true);
      u.onend = () => {
        if (i === sentences.length - 1) onAudioPlayingChange?.(false);
      };
      u.onerror = () => {
        if (i === sentences.length - 1) onAudioPlayingChange?.(false);
      };
      window.speechSynthesis.speak(u);
    });
  }, [chatLang, onAudioPlayingChange, isCorporateMode]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      onAudioPlayingChange?.(false);
    };
  }, [onAudioPlayingChange]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);
    try {
      const token = isCorporateMode ? (await auth.currentUser?.getIdToken?.()) ?? null : null;
      const resposta = await generateForensicChat(userMsg, agentMode, chatLang, newMessages, token);
      setMessages(prev => [...prev, { role: "model", text: resposta }]);
    } catch {
      setMessages(prev => [...prev, { role: "model", text: "Erro IA" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDownloadPDF = () => {
    if (messages.length === 0) return;
    const doc = new jsPDF();
    let y = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE CHAT - NGT IA", margin, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Protocolo: RS-CHAT-${Date.now()}`, margin, 35);
    doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, margin, 40);
    y = 60;
    messages.forEach((m, index) => {
      const isUser = m.role === "user";
      const roleLabel = isUser ? (userName || "USUÁRIO").toUpperCase() : "NGT IA";
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(isUser ? 37 : 59, 99, isUser ? 235 : 130);
      doc.text(roleLabel, margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(11);
      const cleanText = m.text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
      const splitText = doc.splitTextToSize(cleanText, contentWidth);
      splitText.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      });
      y += 8;
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`RealityScan - Página ${i}/${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    }
    doc.save(`Relatorio_Chat_NGT_IA_${Date.now()}.pdf`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag={!isFullscreen}
          dragMomentum={false}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={isFullscreen ? undefined : { width: COMPACT_W, height: COMPACT_H }}
          className={`flex flex-col overflow-hidden shadow-2xl ${isFullscreen
            ? "fixed inset-0 z-[300] bg-[#0a0f1e] border-0 rounded-none"
            : "fixed bottom-[96px] left-6 z-[300] bg-[#0a0f1e]/95 backdrop-blur-xl border border-blue-500/30 rounded-[2rem]"}`}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <b className="text-white text-sm uppercase tracking-widest block truncate">NGT IA</b>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                </div>
              </div>
            </div>

            {/* Agent mode & Lang */}
            <div className="flex items-center gap-2 shrink-0">
              {isCorporateMode ? (
                <span className="text-[8px] font-black uppercase bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-1 text-amber-400">
                  {t.chatMenuCorporate}
                </span>
              ) : (
                <select
                  value={agentMode}
                  onChange={e => setAgentMode(e.target.value as 'advanced' | 'business')}
                  className="text-[8px] font-black uppercase bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:border-blue-500 outline-none"
                >
                  <option value="advanced">{t.chatAgentAdvanced}</option>
                  <option value="business">{t.chatAgentBusiness}</option>
                </select>
              )}
              <select
                value={chatLang}
                onChange={e => setChatLang(e.target.value as 'PT' | 'EN' | 'ES')}
                className="text-[8px] font-black uppercase bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:border-blue-500 outline-none"
              >
                <option value="PT">PT</option>
                <option value="EN">EN</option>
                <option value="ES">ES</option>
              </select>
              <button
                onClick={handleDownloadPDF}
                className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                title={t.chatDownloadPdf}
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-500 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-all"
                title={isFullscreen ? "Modo compacto" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0">
            {messages.map((m, i) => (
              <motion.div
                initial={{ opacity: 0, x: m.role === "user" ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20"
                    : "bg-white/5 text-gray-200 border border-white/5 rounded-tl-none"
                }`}>
                  <div className="flex gap-2">
                    <span className="flex-1 min-w-0">{m.text}</span>
                    {m.role === "model" && hasSpeechSynthesis && (
                      <button
                        onClick={() => speakMessage(m.text, isCorporateMode)}
                        title={t.chatVoicePlay}
                        className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-all self-start"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex items-center space-x-2 text-blue-400 font-mono text-[10px] uppercase tracking-widest animate-pulse">
                <span>{t.chatTyping}</span>
                <span className="flex space-x-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:0.2s]">.</span>
                  <span className="animate-bounce [animation-delay:0.4s]">.</span>
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white/5 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                className="flex-1 bg-transparent text-white text-sm px-2 outline-none placeholder:text-gray-600"
                placeholder={t.chatPlaceholder}
              />
              {hasSpeechRecognition && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={isListening ? t.chatVoiceStop : t.chatVoiceStart}
                  className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${isListening ? "bg-red-500/30 text-red-400 animate-pulse" : "bg-white/5 text-gray-400 hover:text-blue-400 hover:bg-white/10"}`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center min-w-[44px]"
              >
                {isTyping ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
