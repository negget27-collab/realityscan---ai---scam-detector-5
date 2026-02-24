import React, { useState, useEffect } from 'react';
import { X, Ban, Key, Gift, RefreshCw, Ban as CancelIcon } from 'lucide-react';

type ActionType = 'block' | 'unblock' | 'resetPassword' | 'freeDays' | 'changePlan' | 'cancelSub' | 'limit_usage';

interface AdminActionModalProps {
  action: ActionType;
  userId: string;
  userEmail?: string;
  userStatus?: string;
  onClose: () => void;
  onSuccess: () => void;
  getToken: () => Promise<string>;
}

const PLANS = ['community', 'advanced', 'business', 'enterprise'] as const;

export const AdminActionModal: React.FC<AdminActionModalProps> = ({
  action,
  userId,
  userEmail,
  userStatus,
  onClose,
  onSuccess,
  getToken,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ days?: number; planId?: string; limit?: number }>({
    days: 7,
    planId: 'advanced',
    limit: 10,
  });

  const isBlocked = userStatus === 'blocked';
  const needsForm = ['freeDays', 'changePlan', 'limit_usage'].includes(action);
  const needsConfirm = ['block', 'unblock', 'cancelSub'].includes(action);
  const isResetPassword = action === 'resetPassword';

  useEffect(() => {
    if (isResetPassword) {
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const token = await getToken();
          const res = await fetch('/api/admin/user-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ uid: userId, action: 'resetPassword' }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro');
          setResetLink(data.resetLink);
        } catch (e: any) {
          setError(e.message || 'Erro ao gerar link');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isResetPassword, userId, getToken]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const body: any = { uid: userId, action };
      if (needsForm) body.payload = payload;
      const res = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao executar ação');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      alert('Link copiado! Envie ao usuário por email.');
    }
  };

  const labels: Record<ActionType, string> = {
    block: 'Bloquear usuário',
    unblock: 'Desbloquear usuário',
    resetPassword: 'Link de redefinição de senha',
    freeDays: 'Adicionar dias grátis',
    changePlan: 'Alterar plano',
    cancelSub: 'Cancelar assinatura',
    limit_usage: 'Limitar uso',
  };

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black uppercase tracking-tight">{labels[action]}</h3>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-sm">
            {error}
          </div>
        )}

        {isResetPassword && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-400">Gerando link...</p>
            ) : resetLink ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">Envie este link ao usuário por email:</p>
                <textarea readOnly value={resetLink} className="w-full h-24 px-3 py-2 rounded-lg bg-black/30 text-xs text-gray-300 font-mono mb-3" />
                <button onClick={copyLink} className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-black uppercase">
                  Copiar link
                </button>
              </div>
            ) : null}
          </div>
        )}

        {needsConfirm && !isResetPassword && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {action === 'block' && 'O usuário não poderá acessar o app.'}
              {action === 'unblock' && 'O usuário voltará a ter acesso.'}
              {action === 'cancelSub' && 'A assinatura será cancelada e o plano voltará a community.'}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-sm font-bold">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-black uppercase ${
                  action === 'block' || action === 'cancelSub' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {loading ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        {needsForm && (
          <div className="space-y-4">
            {action === 'freeDays' && (
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Dias equivalentes</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={payload.days ?? 7}
                  onChange={(e) => setPayload({ ...payload, days: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm"
                />
              </div>
            )}
            {action === 'changePlan' && (
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Plano</label>
                <select
                  value={payload.planId ?? 'advanced'}
                  onChange={(e) => setPayload({ ...payload, planId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
            {action === 'limit_usage' && (
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Limite de scans/dia</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={payload.limit ?? 10}
                  onChange={(e) => setPayload({ ...payload, limit: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-sm font-bold">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-sm font-black uppercase hover:bg-blue-500"
              >
                {loading ? '...' : 'Executar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
