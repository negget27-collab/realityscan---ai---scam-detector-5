import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

const LIMIT_REACHED_KEY = 'rs_limit_reached';
const BANNER_DISMISSED_KEY = 'rs_upgrade_banner_dismissed';

export const setLimitReached = () => {
  try {
    sessionStorage.setItem(LIMIT_REACHED_KEY, '1');
    sessionStorage.removeItem(BANNER_DISMISSED_KEY);
  } catch (_) {}
};

export const UpgradeAdBanner: React.FC<{
  onSubscribe: () => void;
  onBuyCredits?: () => void;
  messages: string[];
  ctaSubscribe: string;
  ctaCredits: string;
  userLang?: string;
  theme?: 'dark' | 'light';
}> = ({ onSubscribe, onBuyCredits, messages, ctaSubscribe, ctaCredits, userLang = 'PT', theme = 'dark' }) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const limitReached = sessionStorage.getItem(LIMIT_REACHED_KEY) === '1';
      const wasDismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';
      if (limitReached && !wasDismissed && messages.length > 0) {
        setVisible(true);
        const idx = Math.floor(Math.random() * messages.length);
        setMessage(messages[idx]);
      }
    } catch (_) {}
  }, [messages]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch (_) {}
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  const isLight = theme === 'light';
  return (
    <div className={`relative mx-4 mb-4 p-4 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 ${isLight ? 'bg-gradient-to-r from-blue-100 via-indigo-50 to-purple-100 border border-blue-200' : 'bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-purple-600/20 border border-blue-500/30'}`}>
      <button
        onClick={handleDismiss}
        className={`absolute top-3 right-3 p-1 rounded-lg transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
        title="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className={`shrink-0 p-2 rounded-xl ${isLight ? 'bg-blue-200/80 border border-blue-300' : 'bg-blue-500/20 border border-blue-500/30'}`}>
          <Sparkles className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed mb-3 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{message}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { handleDismiss(); onSubscribe(); }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all"
            >
              {ctaSubscribe}
            </button>
            {onBuyCredits && (
              <button
                onClick={() => { handleDismiss(); onBuyCredits(); }}
                className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isLight ? 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-800' : 'bg-white/10 hover:bg-white/20 border border-white/20 text-gray-200'}`}
              >
                {ctaCredits}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
