import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Info, ArrowLeft, Monitor } from "lucide-react";
import { useI18n } from "../services/i18n-temp";

export type SocialNetworkId = "instagram" | "facebook" | "tiktok" | "twitter" | "youtube";

const SOCIAL_NETWORKS: { id: SocialNetworkId; url: string; labelKey: string; color: string }[] = [
  { id: "instagram", url: "https://www.instagram.com/", labelKey: "sentryNetworkInstagram", color: "from-pink-500 to-purple-600" },
  { id: "facebook", url: "https://www.facebook.com/", labelKey: "sentryNetworkFacebook", color: "from-blue-600 to-blue-800" },
  { id: "tiktok", url: "https://www.tiktok.com/", labelKey: "sentryNetworkTiktok", color: "from-gray-900 to-cyan-500" },
  { id: "twitter", url: "https://twitter.com/", labelKey: "sentryNetworkTwitter", color: "from-sky-500 to-sky-700" },
  { id: "youtube", url: "https://www.youtube.com/", labelKey: "sentryNetworkYoutube", color: "from-red-600 to-red-800" },
];

interface SocialNetworkPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (networkId: SocialNetworkId, url: string) => void;
  /** Quando em modo activate: chamado ao clicar em "Confirmar e compartilhar" (etapa 2). Abre PiP + getDisplayMedia. */
  onConfirm?: () => void | Promise<void>;
  /** Se true, usa fluxo em 2 etapas: escolher rede → voltar e confirmar. Se false, escolher = abrir e fechar. */
  mode?: "activate" | "openOnly";
}

export const SocialNetworkPickerModal: React.FC<SocialNetworkPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onConfirm,
  mode = "openOnly",
}) => {
  const { t } = useI18n();
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [selectedNetwork, setSelectedNetwork] = useState<{ id: SocialNetworkId; url: string; labelKey: string; color: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("pick");
      setSelectedNetwork(null);
    }
  }, [isOpen]);

  const handleSelect = (id: SocialNetworkId, url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    if (mode === "openOnly") {
      onSelect(id, url);
      onClose();
      return;
    }
    const net = SOCIAL_NETWORKS.find((n) => n.id === id);
    if (net) {
      setSelectedNetwork(net);
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    onClose();
    if (onConfirm) {
      try {
        await onConfirm();
      } catch (_) {
        // Erro já tratado em onConfirm (ex.: usuário cancelou compartilhamento)
      }
    }
  };

  const handleBack = () => {
    setStep("pick");
    setSelectedNetwork(null);
  };

  const showStep2 = mode === "activate" && step === "confirm" && selectedNetwork;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[750] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-[#0a0f1e] border border-blue-500/40 rounded-[2rem] p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      {showStep2 ? (t as any).sentryConfirmAndShare : t.sentryNetworkPickerTitle}
                    </h3>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                      {showStep2 ? ((t as any).sentryNetworkPickerSub || "") : t.sentryNetworkPickerSub}
                    </p>
                  </div>
                </div>
                <button
                  onClick={showStep2 ? handleBack : onClose}
                  className="p-2 text-gray-500 hover:text-white rounded-xl transition-colors"
                >
                  {showStep2 ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </button>
              </div>

              {showStep2 ? (
                <div className="space-y-4">
                  {selectedNetwork && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl border border-blue-500/50 bg-gradient-to-br ${selectedNetwork.color} bg-opacity-20`}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedNetwork.color} flex items-center justify-center text-white font-black text-lg`}>
                        {(t as any)[selectedNetwork.labelKey]?.[0] || selectedNetwork.id[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-white">{(t as any)[selectedNetwork.labelKey] || selectedNetwork.id}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-300 leading-relaxed">{t.sentryStep2Confirm}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Como deseja monitorar o feed?</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={handleConfirm}
                      className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-[11px] uppercase tracking-widest transition-all"
                    >
                      <Share2 className="w-5 h-5 shrink-0" />
                      Compartilhar tela (ao vivo)
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] uppercase tracking-widest transition-all"
                    >
                      <Monitor className="w-5 h-5 shrink-0" />
                      Gravação de tela
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-relaxed">Ambas as opções usam o compartilhamento de tela do navegador para análise em tempo real.</p>
                  <button onClick={handleBack} className="w-full py-2 text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-widest">
                    {t.sentryBackToStep1}
                  </button>
                </div>
              ) : (
              <>
              <div className="space-y-2">
                {SOCIAL_NETWORKS.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => handleSelect(net.id, net.url)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-blue-500/50 bg-white/5 hover:bg-white/10 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${net.color} flex items-center justify-center shrink-0 text-white font-black text-base`}>
                      {((t as any)[net.labelKey] || net.id)[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex-1 text-left">
                      {(t as any)[net.labelKey] || net.id}
                    </span>
                    <span className="text-[10px] text-gray-500 group-hover:text-blue-400">→</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{t.sentryGuideTitle}</span>
                </div>
                <ol className="space-y-1.5 text-[10px] text-gray-300 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-[8px] font-black text-blue-400">1</span>
                    {t.sentryStep1}
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-[8px] font-black text-blue-400">2</span>
                    {t.sentryStep2}
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-[8px] font-black text-blue-400">3</span>
                    {t.sentryStep3}
                  </li>
                </ol>
              </div>
              <p className="text-[8px] text-gray-600 text-center mt-4 uppercase tracking-widest">
                {t.sentryNetworkPickerHint}
              </p>
              </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
