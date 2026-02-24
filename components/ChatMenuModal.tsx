import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Building2, X } from "lucide-react";
import { useI18n } from "../services/i18n-temp";

export type ChatMode = "reasoning" | "corporate";

interface ChatMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: ChatMode) => void;
  hasPremiumAccess: boolean;
  canUseReasoningFree: boolean;
  isBusinessUser?: boolean;
}

export const ChatMenuModal: React.FC<ChatMenuModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  hasPremiumAccess,
  canUseReasoningFree,
  isBusinessUser = false,
}) => {
  const { t } = useI18n();

  const handleSelect = (mode: ChatMode) => {
    onSelect(mode);
    onClose();
  };

  const canReasoning = hasPremiumAccess || canUseReasoningFree;
  const canCorporate = isBusinessUser;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-6 z-[650] w-80 bg-[#0a0f1e] border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-white">
                {t.chatMenuTitle}
              </span>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => canReasoning && handleSelect("reasoning")}
                disabled={!canReasoning}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  canReasoning
                    ? "bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/20 hover:border-blue-500/60 cursor-pointer"
                    : "bg-white/5 border-white/10 cursor-not-allowed opacity-60"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/30 flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white">
                    {t.chatMenuReasoning}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {t.chatMenuReasoningDesc}
                  </span>
                  {!canReasoning && (
                    <span className="block text-[9px] text-amber-400 mt-1">
                      {t.chatMenuReasoningLimit}
                    </span>
                  )}
                </div>
              </button>

              {canCorporate && (
                <button
                  onClick={() => handleSelect("corporate")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20 hover:border-amber-500/60 cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-600/30 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="block text-sm font-bold text-white">
                      {t.chatMenuCorporate}
                    </span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">
                      {t.chatMenuCorporateDesc}
                    </span>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
