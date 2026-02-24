import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, KeyRound, ChevronRight } from 'lucide-react';

const CORPORATE_API_KEY_STORAGE = 'rs_corporate_api_key';

export function getStoredCorporateApiKey(): string | null {
  try {
    return sessionStorage.getItem(CORPORATE_API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setStoredCorporateApiKey(key: string): void {
  try {
    sessionStorage.setItem(CORPORATE_API_KEY_STORAGE, key);
  } catch (_) {}
}

export function clearStoredCorporateApiKey(): void {
  try {
    sessionStorage.removeItem(CORPORATE_API_KEY_STORAGE);
  } catch (_) {}
}

interface CorporateApiLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const CorporateApiLogin: React.FC<CorporateApiLoginProps> = ({ onSuccess, onBack }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) {
      setError('Informe sua API Key.');
      return;
    }
    if (!key.startsWith('sk_live_')) {
      setError('A API Key deve começar com sk_live_.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/corporate-portal/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': key,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'API Key inválida ou sem permissão.');
        return;
      }
      setStoredCorporateApiKey(key);
      onSuccess();
    } catch (_) {
      setError('Falha ao validar. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-white flex flex-col items-center justify-center overflow-y-auto py-12">
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        <button
          type="button"
          onClick={onBack}
          className="fixed top-6 left-6 z-[91] px-5 py-2.5 rounded-xl border border-gray-200 hover:border-amber-500/50 text-gray-600 hover:text-amber-600 transition-all bg-white text-sm font-semibold"
        >
          Voltar
        </button>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60 mb-6">
          <Building2 className="w-10 h-10 text-amber-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-black tracking-tight text-gray-900 mb-1">
          Acesso ao <span className="text-amber-600">Portal Corporativo</span>
        </h1>
        <p className="text-[11px] text-gray-600 mb-8 text-center max-w-sm">
          Insira sua API Key para acessar a área corporativa. A chave começa com <code className="text-amber-600 font-mono text-[10px]">sk_live_</code>.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              API Key
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/80" />
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="w-full pl-10 pr-10 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-gray-900 placeholder-gray-400 font-mono text-sm outline-none transition-all"
                autoComplete="off"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-amber-600 hover:text-amber-500"
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Validando...' : 'Entrar no portal'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[9px] text-gray-500 mt-8 text-center max-w-xs">
          A API Key é gerada na área de desenvolvedor (Modo Usuário) após login. Use-a para acessar o portal corporativo.
        </p>
      </div>
    </div>
  );
};
