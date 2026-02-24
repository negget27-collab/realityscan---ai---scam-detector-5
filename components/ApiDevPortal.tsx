import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../services/firebase';
import {
  Key,
  RefreshCw,
  Copy,
  Check,
  Book,
  Zap,
  Image,
  Mic,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://realityscan.app';

interface ApiUserData {
  exists: boolean;
  apiKey?: string;
  apiKeyMasked?: string;
  plan: string;
  requestsUsed: number;
  requestLimit: number;
  renewDate?: string;
  active?: boolean;
}

export const ApiDevPortal: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [apiUser, setApiUser] = useState<ApiUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIdToken = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  };

  const fetchMe = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setApiUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/api-users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApiUser(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleInit = async () => {
    setInitLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError('Faça login para criar sua API Key');
        return;
      }
      const res = await fetch('/api/api-users/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApiUser({
        exists: true,
        apiKey: data.apiKey,
        apiKeyMasked: data.apiKey ? `${data.apiKey.slice(0, 12)}...${data.apiKey.slice(-4)}` : undefined,
        plan: data.plan || 'free',
        requestsUsed: data.requestsUsed || 0,
        requestLimit: data.requestLimit || 50,
      });
    } catch (e: any) {
      setError(e.message || 'Erro ao criar');
    } finally {
      setInitLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerar a chave invalida a anterior. Deseja continuar?')) return;
    setRegenerating(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/api-users/regenerate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.apiKey) {
        setApiUser((prev) =>
          prev
            ? {
                ...prev,
                apiKey: data.apiKey,
                apiKeyMasked: `${data.apiKey.slice(0, 12)}...${data.apiKey.slice(-4)}`,
              }
            : null
        );
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao regenerar');
    } finally {
      setRegenerating(false);
    }
  };

  const copyKey = () => {
    if (apiUser?.apiKey) {
      navigator.clipboard.writeText(apiUser.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const user = auth.currentUser;
  if (!user) {
    return (
      <div className="min-h-screen bg-[#030712] text-white p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
        </button>
        <div className="max-w-2xl mx-auto space-y-6 p-8 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <h2 className="text-xl font-black uppercase tracking-widest">Login necessário</h2>
          <p className="text-gray-400">Faça login para acessar o Portal de Desenvolvedores e gerenciar sua API Key.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white p-4 md:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-[10px] font-black uppercase tracking-widest"
      >
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
      </button>

      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">Portal de Desenvolvedores</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">
            API Pública RealityScan — Integre detecção de IA e análise forense
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* API Key */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1e]/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-black uppercase tracking-widest">API Key</h3>
          </div>
          {apiUser?.exists && apiUser.apiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-black/50 font-mono text-[10px] break-all">
                <span className="text-gray-500">sk_live_</span>
                <span className="text-blue-400">••••••••••••••••••••••••••••{apiUser.apiKey?.slice(-4)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyKey}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar chave'}
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  Regenerar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleInit}
              disabled={initLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {initLoading ? 'Criando...' : 'Criar API Key'}
            </button>
          )}
        </div>

        {/* Consumo */}
        {apiUser?.exists && (
          <div className="rounded-2xl border border-white/10 bg-[#0a0f1e]/60 p-6 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest">Consumo</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Requisições usadas</span>
              <span className="font-mono font-black">
                {apiUser.requestsUsed} / {apiUser.requestLimit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (apiUser.requestsUsed / apiUser.requestLimit) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[9px] text-gray-600 uppercase">
              Plano {apiUser.plan} • Reinicia {apiUser.renewDate || 'diariamente'}
            </p>
          </div>
        )}

        {/* Documentação */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1e]/60 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-black uppercase tracking-widest">Documentação</h3>
          </div>
          <p className="text-gray-400 text-[11px]">
            Base URL: <code className="text-blue-400 font-mono">{BASE_URL}</code>
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase">POST /api/v1/generate</span>
              </div>
              <p className="text-[9px] text-gray-500">Geração de texto com IA</p>
              <pre className="text-[8px] font-mono text-gray-400 overflow-x-auto">
{`fetch("${BASE_URL}/api/v1/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "sk_live_xxx"
  },
  body: JSON.stringify({ prompt: "Gere um post sobre IA" })
})`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Image className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase">POST /api/v1/analyze</span>
              </div>
              <p className="text-[9px] text-gray-500">Análise forense de imagem (IA, deepfake, golpe)</p>
              <pre className="text-[8px] font-mono text-gray-400 overflow-x-auto">
{`fetch("${BASE_URL}/api/v1/analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "sk_live_xxx"
  },
  body: JSON.stringify({
    image: "data:image/jpeg;base64,...",
    prompt: "Analise esta imagem"
  })
})`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-2 opacity-60">
              <div className="flex items-center gap-2 text-gray-500">
                <Mic className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase">POST /api/v1/voice</span>
              </div>
              <p className="text-[9px] text-gray-500">Em breve</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px]">
            <strong>Importante:</strong> Nunca exponha sua API Key no frontend. Use apenas em backend ou variáveis de ambiente.
          </div>
        </div>

        {/* Planos */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1e]/60 p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest">Planos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[9px] font-black text-blue-400">Free</p>
              <p className="text-[10px] font-mono">50 req/dia</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[9px] font-black">Basic</p>
              <p className="text-[10px] font-mono">5.000/mês</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[9px] font-black">Pro</p>
              <p className="text-[10px] font-mono">20.000/mês</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[9px] font-black text-amber-500">Enterprise</p>
              <p className="text-[10px] font-mono">Custom</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
