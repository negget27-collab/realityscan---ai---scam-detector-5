import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Building2, Info } from 'lucide-react';
import { auth } from '../services/firebase';
import { useI18n } from '../services/i18n-temp';

interface CorporateKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const CorporateKnowledgeModal: React.FC<CorporateKnowledgeModalProps> = ({ isOpen, onClose, theme = 'dark' }) => {
  const { t } = useI18n();
  const [knowledge, setKnowledge] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;
    setLoading(true);
    setError(null);
    auth.currentUser.getIdToken().then((token) => {
      fetch('/api/corporate-knowledge', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setKnowledge(d.knowledge || ''))
        .catch(() => setError('Erro ao carregar.'))
        .finally(() => setLoading(false));
    });
  }, [isOpen]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/corporate-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ knowledge }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const isLight = theme === 'light';
  const bg = isLight ? 'bg-white' : 'bg-[#0a0f1e]';
  const border = isLight ? 'border-gray-200' : 'border-white/10';
  const text = isLight ? 'text-gray-900' : 'text-white';
  const muted = isLight ? 'text-gray-500' : 'text-gray-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[700] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full z-[750] ${bg} ${border} border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
          >
            <div className={`p-4 border-b ${border} flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <Building2 className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className={`text-sm font-black uppercase tracking-widest ${text}`}>
                    {t.corporateKnowledgeTitle}
                  </h2>
                  <p className={`text-[9px] ${muted}`}>{t.corporateKnowledgeDesc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className={`p-2 rounded-lg transition-colors ${showInfo ? 'bg-amber-500/20 text-amber-500' : 'hover:bg-white/10 text-gray-500'}`}
                  title={t.corporateKnowledgeInfo ?? 'Informações'}
                >
                  <Info className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className={`px-4 py-3 border-b ${border} text-xs space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar ${muted}`}>
                    <p><strong className={text}>1. O que é</strong><br />
                      É um espaço onde você define o conteúdo que a IA vai usar no modo Agente Corporativo. Esse texto serve como contexto da sua empresa para a IA responder com base em documentos, processos e políticas internas.</p>
                    <p><strong className={text}>2. Como usar</strong><br />
                      Cole ou digite na caixa de texto tudo que a IA deve conhecer: documentos, manuais, procedimentos, políticas internas, FAQs, informações de produtos/serviços e processos de trabalho. Clique em SAVE — o conteúdo é salvo e fica associado à sua conta Business. Limite: até ~50.000 caracteres.</p>
                    <p><strong className={text}>3. O que acontece no chat</strong><br />
                      Quando você escolhe Agente Corporativo: o backend busca esse conteúdo, inclui no system prompt da IA e usa para responder perguntas sobre sua empresa.</p>
                    <p><strong className={text}>4. Fluxo</strong><br />
                      Configuração (uma vez) → Salvar base → Uso do chat em modo Agente Corporativo → IA usa essa base nas respostas.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-hidden flex flex-col p-4">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <textarea
                    value={knowledge}
                    onChange={(e) => setKnowledge(e.target.value)}
                    placeholder={t.corporateKnowledgePlaceholder}
                    className={`w-full flex-1 min-h-[200px] p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-black/40 border-white/10 text-white'} text-sm resize-none focus:ring-2 focus:ring-amber-500 outline-none`}
                  />
                  {error && (
                    <p className="text-red-500 text-[10px] mt-2">{error}</p>
                  )}
                </>
              )}
            </div>

            <div className={`p-4 border-t ${border} flex justify-end gap-2 shrink-0`}>
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-white/5 text-gray-400'}`}
              >
                {t.back}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {t.save}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
