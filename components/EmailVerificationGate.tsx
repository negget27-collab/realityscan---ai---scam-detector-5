import React, { useState } from 'react';
import { Mail, LogOut, RefreshCw } from 'lucide-react';
import { auth, sendEmailVerification, logout } from '../services/firebase';
import type { User } from 'firebase/auth';

interface EmailVerificationGateProps {
  user: User;
  onLogout: () => void;
}

export const EmailVerificationGate: React.FC<EmailVerificationGateProps> = ({ user, onLogout }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    const current = auth.currentUser;
    if (!current) return;
    setSending(true);
    setError(null);
    try {
      await sendEmailVerification(current);
      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'Falha ao reenviar. Tente mais tarde.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-flex">
          <Mail className="w-12 h-12 text-amber-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-black text-white">
          Verifique seu e-mail
        </h1>
        <p className="text-sm text-gray-400">
          Enviamos um link de confirmação para <span className="text-amber-400 font-medium break-all">{user.email}</span>.
          Abra sua caixa de entrada e clique no link para ativar sua conta.
        </p>
        <p className="text-xs text-gray-500">
          Cadastros com e-mail inventado não recebem o link e não podem usar o app até confirmar.
        </p>
        {error && (
          <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
        {sent && (
          <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
            E-mail reenviado. Verifique a caixa de entrada e o spam.
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#030712] font-black text-xs uppercase tracking-widest disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${sending ? 'animate-spin' : ''}`} />
            {sending ? 'Enviando...' : 'Reenviar e-mail'}
          </button>
          <button
            type="button"
            onClick={() => logout().then(onLogout)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/20 hover:border-white/40 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};
