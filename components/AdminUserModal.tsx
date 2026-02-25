import React, { useState } from 'react';
import { X, User, CreditCard, Cpu, Shield, Mail, Lock, Calendar, Ban, Key, Gift, RefreshCw } from 'lucide-react';
import { useI18n } from '../services/i18n-temp';

interface AdminUserModalProps {
  user: any;
  purchases: any[];
  analyses: any[];
  onClose: () => void;
  onAction: (action: string, userId: string, payload?: any) => void;
}

export const AdminUserModal: React.FC<AdminUserModalProps> = ({ user, purchases, analyses, onClose, onAction }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'dados' | 'assinatura' | 'uso'>('dados');
  const statusColor = (s: string) => {
    if (s === 'active' || s === 'ativo') return 'text-emerald-400';
    if (s === 'cancelled' || s === 'cancelado') return 'text-red-400';
    if (s === 'blocked' || s === 'bloqueado') return 'text-amber-400';
    return 'text-gray-400';
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0a0f1e] border border-white/10 rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <User className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">{user.displayName || user.email || 'Sem nome'}</h2>
              <p className="text-xs text-gray-500 font-mono">{user.email || '-'}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusColor(user.status || 'active')}`}>
                {user.status || 'Ativo'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-white/5">
          {(['dados', 'assinatura', 'uso'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'dados' ? 'Dados' : tab === 'assinatura' ? 'Assinatura' : 'Uso da IA'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">ID</p>
                  <p className="text-xs font-mono text-gray-300 break-all">{user.id}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Email</p>
                  <p className="text-xs text-gray-300">{user.email || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Telefone</p>
                  <p className="text-xs text-gray-300">{user.phoneNumber || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Data de cadastro</p>
                  <p className="text-xs text-gray-300">{user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Último login</p>
                  <p className="text-xs text-gray-300">{user.lastLogin ? new Date(user.lastLogin).toLocaleString('pt-BR') : '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Dispositivo / IP</p>
                  <p className="text-xs text-gray-300">{user.deviceId || user.lastIP || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assinatura' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Plano atual</p>
                <p className="text-lg font-black text-blue-400 uppercase">{user.planId || 'community'}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Histórico de pagamentos</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {purchases.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Nenhum pagamento registrado</p>
                  ) : (
                    purchases.slice(0, 10).map((p) => {
                      let dateStr = '-';
                      if (p.timestamp?.toDate) dateStr = new Date(p.timestamp.toDate()).toLocaleDateString('pt-BR');
                      else if (p.timestamp?.seconds) dateStr = new Date(p.timestamp.seconds * 1000).toLocaleDateString('pt-BR');
                      else if (typeof p.timestamp === 'string') dateStr = new Date(p.timestamp).toLocaleDateString('pt-BR');
                      return (
                        <div key={p.id} className="flex justify-between text-xs py-2 border-b border-white/5">
                          <span>{p.planId || p.type}</span>
                          <span className="text-gray-500">{dateStr}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'uso' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-2xl font-black text-blue-400">{analyses.length}</p>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Requisições IA</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-2xl font-black text-purple-400">{user.credits || 0}</p>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">{t.credits}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-2xl font-black text-amber-400">{user.monthlyCredits || 0}</p>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">{t.monthly}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/30 shrink-0">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Ações rápidas</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onAction((user.status === 'blocked' ? 'unblock' : 'block') as any, user.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase hover:bg-red-500/30">
              <Ban className="w-3.5 h-3.5" /> {user.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
            </button>
            <button onClick={() => onAction('resetPassword', user.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black uppercase hover:bg-white/10">
              <Key className="w-3.5 h-3.5" /> Resetar senha
            </button>
            <button onClick={() => onAction('freeDays', user.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black uppercase hover:bg-white/10">
              <Gift className="w-3.5 h-3.5" /> Dias grátis
            </button>
            <button onClick={() => onAction('changePlan', user.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black uppercase hover:bg-white/10">
              <RefreshCw className="w-3.5 h-3.5" /> Mudar plano
            </button>
            <button onClick={() => onAction('cancelSub', user.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase hover:bg-amber-500/30">
              Cancelar assinatura
            </button>
            <a href={`mailto:${user.email}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] font-black uppercase hover:bg-blue-500/30">
              <Mail className="w-3.5 h-3.5" /> Enviar mensagem
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
