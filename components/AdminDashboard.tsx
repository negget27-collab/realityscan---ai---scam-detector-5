import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { ScrollToTopButton } from './ScrollToTopButton';
import { AdminUserModal } from './AdminUserModal';
import { AdminActionModal } from './AdminActionModal';
import { healthService, SystemLog, SystemHealth, PendingAIScanReport } from '../services/SystemHealthService';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  Shield, Activity, Database, Lock, AlertCircle, Terminal, RefreshCw, Cpu,
  Users, CreditCard, TrendingUp, DollarSign, Zap, UserPlus, ShoppingCart,
  XCircle, Wifi, Ban, BarChart3, ChevronRight, Bot, MessageSquare, Mic, X,
  Power, Settings, Bell, Mail, Smartphone, Key, ShieldCheck, Search
} from 'lucide-react';

interface AIScanReport {
  id: string;
  diagnosis: string;
  score: number;
  alert: boolean;
  timestamp: string;
}

interface AdminMetrics {
  totalUsers: number;
  activeSubscribers: number;
  cancellations: number;
  mrr: string;
  totalRevenue: string;
  usersOnlineNow: number;
  aiRequestsToday: number;
  totalReferralConversions?: number;
  totalReferralCredits?: number;
}

interface AdminUser {
  id: string;
  email?: string;
  displayName?: string;
  planId?: string;
  status?: string;
  credits?: number;
  monthlyCredits?: number;
  createdAt?: string;
  lastLogin?: string;
  phoneNumber?: string;
  [key: string]: any;
}

export const AdminDashboard: React.FC<{
  onBack: () => void;
  userEmail?: string;
  onNavigate?: (view: 'HOME' | 'INFO' | 'PROFILE' | 'BUSINESS_PANEL') => void;
}> = ({ onBack, userEmail, onNavigate }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'finance' | 'ai' | 'logs' | 'notifications' | 'settings' | 'admins' | 'alerts' | 'referrals'>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [aiScans, setAiScans] = useState<AIScanReport[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<PendingAIScanReport[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetail, setUserDetail] = useState<{ user: any; purchases: any[]; analyses: any[] } | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [aiUsage, setAiUsage] = useState<{
    callsToday: number;
    costToday: string;
    costMonth: string;
    topUser?: { email: string; calls: number };
    messagesCount: number;
    audiosCount: number;
    globalEnabled: boolean;
  } | null>(null);
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
  const [referralsData, setReferralsData] = useState<{
    totalConversions: number;
    totalCreditsGranted: number;
    topReferrers: { id: string; email?: string; referralCode?: string; referralCount: number; referralCreditsEarned: number }[];
    recentReferrals: { id: string; referrerId: string; referredUserId: string; rewardCredits: number; planId?: string; purchaseType?: string; createdAt?: string }[];
  } | null>(null);
  const [actionModal, setActionModal] = useState<{ action: string; userId: string; userEmail?: string; userStatus?: string } | null>(null);
  const [config, setConfig] = useState<{ ai: Record<string, any>; app: Record<string, any>; plans: Record<string, any> } | null>(null);
  const [configSaving, setConfigSaving] = useState<string | null>(null);
  const [adminsList, setAdminsList] = useState<{ email: string; level: string }[]>([]);
  const [addAdminModal, setAddAdminModal] = useState(false);
  const [addAdminEmail, setAddAdminEmail] = useState('');
  const [addAdminLevel, setAddAdminLevel] = useState('suporte');
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [notifPush, setNotifPush] = useState('');
  const [notifEmailSubject, setNotifEmailSubject] = useState('');
  const [notifEmailBody, setNotifEmailBody] = useState('');
  const [notifSms, setNotifSms] = useState('');
  const [notifInApp, setNotifInApp] = useState('');
  const [notifSending, setNotifSending] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/config', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error('Config load error:', e);
    }
  };

  const loadAdmins = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/admins', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data.admins || []);
      }
    } catch (e) {
      console.error('Admins load error:', e);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const [metricsRes, usersRes, aiUsageRes, referralsRes, h, l, scans] = await Promise.all([
        fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : { users: [] })).catch(() => ({ users: [] })),
        fetch('/api/admin/ai-usage', { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/admin/referrals', { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        healthService.checkHealth(),
        healthService.getPersistentLogs(100),
        (async () => {
          try {
            const ref = collection(db, 'admin_ai_scans');
            const q = query(ref, orderBy('timestamp', 'desc'), limit(20));
            const snap = await getDocs(q);
            return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIScanReport));
          } catch {
            return [];
          }
        })(),
      ]);
      setMetrics(metricsRes);
      setUsers(usersRes?.users || []);
      setAiUsage(aiUsageRes);
      setReferralsData(referralsRes);
      setHealth(h);
      setLogs(l);
      setAiScans(scans);
      setPendingAlerts(healthService.getPendingAlerts());
    } catch (e) {
      console.error('Admin refresh error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (activeSection === 'settings') loadConfig();
    if (activeSection === 'admins') loadAdmins();
  }, [activeSection]);

  const openUserDetail = async (u: AdminUser) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/user/${u.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setUserDetail({ user: data.user, purchases: data.purchases || [], analyses: data.analyses || [] });
      setSelectedUser(u);
    } catch (e) {
      console.error('User detail error:', e);
    }
  };

  const handleUserAction = (action: string, userId: string, _payload?: any) => {
    const user = userDetail?.user || selectedUser || users.find((u) => u.id === userId);
    setActionModal({
      action,
      userId,
      userEmail: user?.email,
      userStatus: user?.status,
    });
  };

  const filteredLogs = logs.filter((log) => filter === 'ALL' || log.type === filter);

  const sections = [
    { id: 'overview' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'users' as const, label: 'Usuários', icon: Users },
    { id: 'referrals' as const, label: 'Indicações', icon: UserPlus },
    { id: 'finance' as const, label: 'Financeiro', icon: DollarSign },
    { id: 'ai' as const, label: 'Controle IA', icon: Bot },
    { id: 'logs' as const, label: 'Logs', icon: Terminal },
    { id: 'notifications' as const, label: 'Comunicação', icon: Bell },
    { id: 'settings' as const, label: 'Configurações', icon: Settings },
    { id: 'admins' as const, label: 'Admins', icon: ShieldCheck },
    { id: 'alerts' as const, label: 'Alertas', icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Painel de Controle</h1>
              <p className="text-xs text-gray-500 font-mono">ADMIN // KERNEL_MONITOR</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refreshData} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all" title="Atualizar">
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onBack} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
              Sair
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                activeSection === s.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {activeSection === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Métricas rápidas</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard title="Total de usuários" value={metrics?.totalUsers ?? '-'} icon={Users} color="text-blue-400" />
                <MetricCard title="Assinantes ativos" value={metrics?.activeSubscribers ?? '-'} icon={CreditCard} color="text-emerald-400" />
                <MetricCard title="Cancelamentos" value={metrics?.cancellations ?? '-'} icon={XCircle} color="text-red-400" />
                <MetricCard title="MRR" value={metrics?.mrr ? `R$ ${metrics.mrr}` : '-'} icon={TrendingUp} color="text-purple-400" />
                <MetricCard title="Receita total" value={metrics?.totalRevenue ? `R$ ${metrics.totalRevenue}` : '-'} icon={DollarSign} color="text-amber-400" />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Atividade em tempo real</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard title="Usuários online" value={metrics?.usersOnlineNow ?? '-'} icon={Zap} color="text-cyan-400" />
                <MetricCard title="Últimos cadastros" value={users.filter((u) => u.createdAt).length} icon={UserPlus} color="text-blue-400" />
                <MetricCard title="Indicações (total)" value={metrics?.totalReferralConversions ?? '-'} icon={UserPlus} color="text-green-400" />
                <MetricCard title="Scans por indicação" value={metrics?.totalReferralCredits ?? '-'} icon={TrendingUp} color="text-emerald-400" />
                <MetricCard title="Requisições IA (hoje)" value={metrics?.aiRequestsToday ?? '-'} icon={Cpu} color="text-purple-400" />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Status do sistema</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <HealthCard title="Sistema" value={health?.status || 'UNKNOWN'} icon={Activity} color={health?.status === 'HEALTHY' ? 'text-emerald-400' : 'text-red-400'} />
                <HealthCard title="Database" value={health?.database ? 'CONNECTED' : 'OFFLINE'} icon={Database} color={health?.database ? 'text-blue-400' : 'text-red-400'} />
                <HealthCard title="Auth" value={health?.auth ? 'ACTIVE' : 'STANDBY'} icon={Lock} color={health?.auth ? 'text-purple-400' : 'text-amber-400'} />
                <HealthCard title="Erros" value={health?.errors?.toString() || '0'} icon={AlertCircle} color={health?.errors ? 'text-red-400' : 'text-gray-400'} />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'users' && (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">Lista de usuários</h2>
                  <p className="text-xs text-gray-500 mt-1">Clique para ver perfil completo</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Pesquisar por nome, email ou ID..."
                    className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="p-4">Nome</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Telefone</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredUsers = users.filter((u) => {
                      if (!userSearch.trim()) return true;
                      const q = userSearch.trim().toLowerCase();
                      const email = (u.email || '').toLowerCase();
                      const name = (u.displayName || '').toLowerCase();
                      const id = (u.id || '').toLowerCase();
                      const phone = (u.phoneNumber || '').toLowerCase();
                      return email.includes(q) || name.includes(q) || id.includes(q) || phone.includes(q);
                    });
                    if (filteredUsers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-gray-500 italic">
                            {userSearch.trim() ? 'Nenhum usuário encontrado para a pesquisa.' : 'Nenhum usuário carregado. Verifique se está autenticado como admin.'}
                          </td>
                        </tr>
                      );
                    }
                    return filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openUserDetail(u)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-bold">{u.displayName || '-'}</td>
                      <td className="p-4 text-gray-400">{u.email || '-'}</td>
                      <td className="p-4 text-gray-500">{u.phoneNumber || '-'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-[9px] font-black bg-blue-500/20 text-blue-400">{u.planId || 'community'}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-[9px] font-black ${
                            u.status === 'blocked' ? 'bg-red-500/20 text-red-400' : u.status === 'cancelled' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {u.status || 'ativo'}
                        </span>
                      </td>
                      <td className="p-4">
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </td>
                    </tr>
                  ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'referrals' && (
          <div className="space-y-8">
            <div className="bg-green-500/5 border border-green-500/20 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-green-400 mb-4">Sistema de Indicações (Compartilhamento)</h2>
              <p className="text-[10px] text-gray-400 mb-4">1 conversão confirmada (até pagamento) = 5 scans para o indicador</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Total conversões" value={referralsData?.totalConversions ?? '-'} icon={UserPlus} color="text-green-400" />
                <MetricCard title="Scans creditados" value={referralsData?.totalCreditsGranted ?? '-'} icon={TrendingUp} color="text-emerald-400" />
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 p-6 pb-0">Top indicadores</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Email</th>
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Código</th>
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Indicações</th>
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Scans ganhos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(referralsData?.topReferrers || []).map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4 text-xs">{r.email || '-'}</td>
                        <td className="p-4 font-mono text-[10px] text-gray-400">{r.referralCode || '-'}</td>
                        <td className="p-4 font-bold text-green-400">{r.referralCount}</td>
                        <td className="p-4 text-emerald-400">+{r.referralCreditsEarned}</td>
                      </tr>
                    ))}
                    {(!referralsData?.topReferrers || referralsData.topReferrers.length === 0) && (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma indicação ainda</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 p-6 pb-0">Últimas conversões</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Indicador</th>
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Convertido</th>
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Plano/Tipo</th>
                      <th className="text-left p-4 text-[10px] font-black text-gray-500 uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(referralsData?.recentReferrals || []).map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4 text-[10px] font-mono truncate max-w-[120px]">{r.referrerId}</td>
                        <td className="p-4 text-[10px] font-mono truncate max-w-[120px]">{r.referredUserId}</td>
                        <td className="p-4 text-[10px]">{r.planId || r.purchaseType || '-'}</td>
                        <td className="p-4 text-[10px] text-gray-500">{r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR') : '-'}</td>
                      </tr>
                    ))}
                    {(!referralsData?.recentReferrals || referralsData.recentReferrals.length === 0) && (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma conversão recente</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'finance' && (
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Planos</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['community', 'advanced', 'business', 'enterprise'].map((plan) => (
                  <div key={plan} className="p-4 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-xs font-black text-blue-400 uppercase">{plan}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Editar: preço, limites, recursos</p>
                    <button onClick={() => setActiveSection('settings')} className="mt-3 text-[10px] font-black text-gray-400 hover:text-blue-400">Configurar</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Financeiro</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Receita diária" value="—" icon={DollarSign} color="text-emerald-400" />
                <MetricCard title="Receita mensal" value={metrics?.mrr ? `R$ ${metrics.mrr}` : '—'} icon={TrendingUp} color="text-blue-400" />
                <MetricCard title="LTV cliente" value="—" icon={Users} color="text-purple-400" />
                <MetricCard title="Ticket médio" value="—" icon={CreditCard} color="text-amber-400" />
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Integração Stripe / Mercado Pago / Pix</h2>
              <div className="space-y-2 text-xs text-gray-400">
                <p>• Status webhook: <span className="text-emerald-400">Ativo</span></p>
                <p>• Erros de pagamento: Monitorar</p>
                <p>• Cobrança automática: Habilitada</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'ai' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Monitoramento IA</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard title="Chamadas IA (hoje)" value={aiUsage?.callsToday ?? metrics?.aiRequestsToday ?? '-'} icon={Cpu} color="text-purple-400" />
                <MetricCard title="Custo hoje (OpenRouter/Gemini)" value={aiUsage?.costToday ? `R$ ${aiUsage.costToday}` : '—'} icon={DollarSign} color="text-amber-400" />
                <MetricCard title="Custo mês" value={aiUsage?.costMonth ? `R$ ${aiUsage.costMonth}` : '—'} icon={TrendingUp} color="text-red-400" />
                <MetricCard title="Mensagens enviadas" value={aiUsage?.messagesCount ?? '-'} icon={MessageSquare} color="text-blue-400" />
                <MetricCard title="Áudios enviados" value={aiUsage?.audiosCount ?? '-'} icon={Mic} color="text-cyan-400" />
              </div>
            </div>
            {aiUsage?.topUser && (
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Usuário que mais usa IA</h2>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-black/30">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="font-bold">{aiUsage.topUser.email}</p>
                    <p className="text-xs text-gray-500">{aiUsage.topUser.calls} chamadas</p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Controles admin</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={async () => {
                    setAiActionLoading('global');
                    try {
                      const token = await auth.currentUser?.getIdToken();
                      const res = await fetch('/api/admin/ai-control', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ action: 'toggle_global' }),
                      });
                      if (res.ok) refreshData();
                    } finally {
                      setAiActionLoading(null);
                    }
                  }}
                  disabled={!!aiActionLoading}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    aiUsage?.globalEnabled === false
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Power className="w-5 h-5" />
                  <span className="text-xs font-black uppercase">
                    {aiUsage?.globalEnabled === false ? 'Ligar IA global' : 'Desligar IA global'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (selectedUser) handleUserAction('limit_usage', selectedUser.id);
                    else alert('Selecione um usuário na aba Usuários primeiro.');
                  }}
                  disabled={!selectedUser}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <Ban className="w-5 h-5" />
                  <span className="text-xs font-black uppercase">Limitar uso por usuário</span>
                </button>
                <button
                  onClick={async () => {
                    setAiActionLoading('reset');
                    try {
                      const token = await auth.currentUser?.getIdToken();
                      const res = await fetch('/api/admin/ai-control', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ action: 'reset_consumption' }),
                      });
                      if (res.ok) refreshData();
                    } finally {
                      setAiActionLoading(null);
                    }
                  }}
                  disabled={!!aiActionLoading}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <RefreshCw className={`w-5 h-5 ${aiActionLoading === 'reset' ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-black uppercase">Resetar consumo</span>
                </button>
                <button
                  onClick={() => alert('Bloquear prompt perigoso: configurar palavras-chave no painel Configurações > IA')}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-xs font-black uppercase">Bloquear prompt perigoso</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'alerts' && (
          <div className="space-y-6">
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-amber-400 mb-4">Alertas automáticos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AlertItem icon={CreditCard} title="Falha de pagamento" status="Monitorar" />
                <AlertItem icon={Wifi} title="API com erro" status={health?.status === 'HEALTHY' ? 'OK' : 'Atenção'} />
                <AlertItem icon={Ban} title="Usuário abusando" status="Monitorar" />
                <AlertItem icon={Zap} title="Limite de uso atingido" status="Monitorar" />
              </div>
            </div>
            {pendingAlerts.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-sm font-black uppercase tracking-widest">Alertas pendentes</h2>
                </div>
                <div className="p-6 space-y-4 max-h-64 overflow-y-auto">
                  {pendingAlerts.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs text-gray-300">{a.diagnosis}</p>
                      <span className="text-[9px] text-gray-500">{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'logs' && (
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Segurança</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-bold">2FA Admin</span>
                  </div>
                  <span className="text-[10px] text-amber-400">Configurar</span>
                </div>
                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <p className="text-xs font-bold mb-2">Níveis de acesso</p>
                  <p className="text-[10px] text-gray-500">dono • suporte • financeiro • dev</p>
                </div>
                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <p className="text-xs font-bold mb-2">IP autorizado</p>
                  <p className="text-[10px] text-gray-500">Restringir login admin por IP</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-sm font-black uppercase tracking-widest mb-4">System Audit Logs</h2>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'ADMIN_LOGIN', 'PLAN_CHANGE', 'PAYMENT', 'AI_USAGE'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${filter === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    {t === 'ADMIN_LOGIN' ? 'Login admin' : t === 'PLAN_CHANGE' ? 'Plano' : t === 'PAYMENT' ? 'Pagamento' : t === 'AI_USAGE' ? 'IA' : t}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Module</th>
                    <th className="p-4">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 text-gray-500 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-[9px] font-black ${
                            log.type === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : log.type === 'ERROR' ? 'bg-orange-500/20 text-orange-500' : log.type === 'WARNING' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 font-black text-blue-400 text-xs">{log.module}</td>
                      <td className="p-4 text-gray-300 text-xs">{log.message}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-500 italic">Nenhum log</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Comunicação com usuários</h2>
              <p className="text-[10px] text-gray-500 mb-4">Anúncios são registrados. in_app será exibido aos usuários; push/email/sms requerem integração com FCM, SendGrid, Twilio.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-black/30 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-6 h-6 text-blue-400" />
                    <span className="font-bold">Notificação push</span>
                  </div>
                  <input value={notifPush} onChange={(e) => setNotifPush(e.target.value)} placeholder="Ex: Nova função liberada" className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-3" />
                  <button disabled={!!notifSending || !notifPush.trim()} onClick={async () => { setNotifSending('push'); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ type: 'push', message: notifPush }) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); setNotifPush(''); } catch (e: any) { alert(e.message); } finally { setNotifSending(null); } }} className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-black uppercase disabled:opacity-50">{notifSending === 'push' ? '...' : 'Registrar'}</button>
                </div>
                <div className="p-6 rounded-xl bg-black/30 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-6 h-6 text-emerald-400" />
                    <span className="font-bold">Email</span>
                  </div>
                  <input value={notifEmailSubject} onChange={(e) => setNotifEmailSubject(e.target.value)} placeholder="Assunto" className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-2" />
                  <textarea value={notifEmailBody} onChange={(e) => setNotifEmailBody(e.target.value)} placeholder="Mensagem" className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-3 h-20" />
                  <button disabled={!!notifSending || !notifEmailBody.trim()} onClick={async () => { setNotifSending('email'); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ type: 'email', subject: notifEmailSubject, message: notifEmailBody }) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); setNotifEmailSubject(''); setNotifEmailBody(''); } catch (e: any) { alert(e.message); } finally { setNotifSending(null); } }} className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-black uppercase disabled:opacity-50">{notifSending === 'email' ? '...' : 'Registrar'}</button>
                </div>
                <div className="p-6 rounded-xl bg-black/30 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Smartphone className="w-6 h-6 text-purple-400" />
                    <span className="font-bold">SMS</span>
                  </div>
                  <input value={notifSms} onChange={(e) => setNotifSms(e.target.value)} placeholder="Mensagem curta" className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-3" />
                  <button disabled={!!notifSending || !notifSms.trim()} onClick={async () => { setNotifSending('sms'); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ type: 'sms', message: notifSms }) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); setNotifSms(''); } catch (e: any) { alert(e.message); } finally { setNotifSending(null); } }} className="px-4 py-2 rounded-lg bg-purple-600 text-xs font-black uppercase disabled:opacity-50">{notifSending === 'sms' ? '...' : 'Registrar'}</button>
                </div>
                <div className="p-6 rounded-xl bg-black/30 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="w-6 h-6 text-amber-400" />
                    <span className="font-bold">Aviso dentro do app</span>
                  </div>
                  <input value={notifInApp} onChange={(e) => setNotifInApp(e.target.value)} placeholder="Ex: Seu plano venceu" className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-3" />
                  <button disabled={!!notifSending || !notifInApp.trim()} onClick={async () => { setNotifSending('in_app'); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ type: 'in_app', message: notifInApp }) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); setNotifInApp(''); } catch (e: any) { alert(e.message); } finally { setNotifSending(null); } }} className="px-4 py-2 rounded-lg bg-amber-600 text-xs font-black uppercase disabled:opacity-50">{notifSending === 'in_app' ? '...' : 'Registrar'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">IA</h2>
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Chave API (não exibida)</label>
                  <input type="password" placeholder="Deixe vazio para não alterar" className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Modelo usado</label>
                  <input value={config?.ai?.model || ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), ai: { ...(c?.ai || {}), model: e.target.value } }))} placeholder="ex: gemini-2.0-flash" className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Limite por plano (JSON)</label>
                  <input value={typeof config?.ai?.limitsPerPlan === 'string' ? config.ai.limitsPerPlan : JSON.stringify(config?.ai?.limitsPerPlan || { community: 3, advanced: 50, business: 200 }) || ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), ai: { ...(c?.ai || {}), limitsPerPlan: e.target.value } }))} placeholder='{"community":3,"advanced":50}' className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm font-mono" />
                </div>
                <button disabled={!!configSaving} onClick={async () => { setConfigSaving('ai'); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ section: 'ai', data: config?.ai || {} }) }); if (res.ok) loadConfig(); } catch (e) { console.error(e); } finally { setConfigSaving(null); } }} className="px-6 py-2 rounded-lg bg-blue-600 text-xs font-black uppercase disabled:opacity-50">
                  {configSaving === 'ai' ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">App</h2>
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Nome</label>
                  <input value={config?.app?.name || ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), app: { ...(c?.app || {}), name: e.target.value } }))} placeholder="RealityScan" className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Logo (URL)</label>
                  <input value={config?.app?.logoUrl || ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), app: { ...(c?.app || {}), logoUrl: e.target.value } }))} placeholder="https://..." className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Cores (hex)</label>
                  <input value={config?.app?.colors || ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), app: { ...(c?.app || {}), colors: e.target.value } }))} placeholder="#0ea5e9, #1e293b" className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="maintenance" checked={!!config?.app?.maintenance} onChange={(e) => setConfig((c) => ({ ...(c || {}), app: { ...(c?.app || {}), maintenance: e.target.checked } }))} className="rounded" />
                  <label htmlFor="maintenance" className="text-xs font-bold">Modo manutenção</label>
                </div>
                <button disabled={!!configSaving} onClick={async () => { setConfigSaving('app'); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ section: 'app', data: config?.app || {} }) }); if (res.ok) loadConfig(); } catch (e) { console.error(e); } finally { setConfigSaving(null); } }} className="px-6 py-2 rounded-lg bg-blue-600 text-xs font-black uppercase disabled:opacity-50">
                  {configSaving === 'app' ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Planos</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['community', 'advanced', 'business', 'enterprise'].map((plan) => (
                  <div key={plan} className="p-4 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-xs font-black text-blue-400 uppercase mb-2">{plan}</p>
                    <input value={(config?.plans as Record<string, any>)?.[plan]?.price ?? ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), plans: { ...(c?.plans || {}), [plan]: { ...((c?.plans as any)?.[plan] || {}), price: e.target.value } } }))} placeholder="Preço" className="w-full px-3 py-1.5 rounded bg-white/5 text-xs mb-2" />
                    <input value={(config?.plans as Record<string, any>)?.[plan]?.monthlyCredits ?? ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), plans: { ...(c?.plans || {}), [plan]: { ...((c?.plans as any)?.[plan] || {}), monthlyCredits: e.target.value } } }))} placeholder="Limite créditos" className="w-full px-3 py-1.5 rounded bg-white/5 text-xs mb-2" />
                    <input value={(config?.plans as Record<string, any>)?.[plan]?.features ?? ''} onChange={(e) => setConfig((c) => ({ ...(c || {}), plans: { ...(c?.plans || {}), [plan]: { ...((c?.plans as any)?.[plan] || {}), features: e.target.value } } }))} placeholder="Recursos" className="w-full px-3 py-1.5 rounded bg-white/5 text-xs mb-3" />
                    <button disabled={!!configSaving} onClick={async () => { setConfigSaving('plans'); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ section: 'plans', data: config?.plans || {} }) }); if (res.ok) loadConfig(); } catch (e) { console.error(e); } finally { setConfigSaving(null); } }} className="text-[10px] font-black text-blue-400 hover:underline disabled:opacity-50">
                      Salvar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'admins' && (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Administradores</h2>
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/5">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="font-bold">{userEmail || '—'}</p>
                    <span className="text-[9px] text-blue-400 uppercase">dono</span>
                  </div>
                </div>
                <Key className="w-4 h-4 text-gray-500" />
              </div>
              {adminsList.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/5">
                  <p className="font-bold text-sm">{a.email}</p>
                  <span className="text-[9px] text-gray-400 uppercase">{a.level}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500">Adicione admins com níveis: dono, suporte, financeiro, dev</p>
              <button onClick={() => setAddAdminModal(true)} className="px-6 py-2 rounded-lg bg-blue-600 text-xs font-black uppercase hover:bg-blue-500">+ Adicionar admin</button>
            </div>
          </div>
        )}

        {addAdminModal && (
          <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl max-w-md w-full p-6 relative">
              <button onClick={() => { setAddAdminModal(false); setAddAdminEmail(''); }} className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-black uppercase mb-4">Adicionar admin</h3>
              <input type="email" value={addAdminEmail} onChange={(e) => setAddAdminEmail(e.target.value)} placeholder="Email do novo admin" className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm mb-4" />
              <select value={addAdminLevel} onChange={(e) => setAddAdminLevel(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-sm mb-4">
                <option value="suporte">Suporte</option>
                <option value="financeiro">Financeiro</option>
                <option value="dev">Dev</option>
                <option value="dono">Dono</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => { setAddAdminModal(false); setAddAdminEmail(''); setAddAdminLevel('suporte'); }} className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-sm font-bold">Cancelar</button>
                <button disabled={addAdminLoading || !addAdminEmail.includes('@')} onClick={async () => { setAddAdminLoading(true); try { const t = await auth.currentUser?.getIdToken(); const res = await fetch('/api/admin/add-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ email: addAdminEmail, level: addAdminLevel }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Erro'); setAddAdminModal(false); setAddAdminEmail(''); setAddAdminLevel('suporte'); loadAdmins(); } catch (e: any) { alert(e.message || 'Erro ao adicionar'); } finally { setAddAdminLoading(false); } }} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-sm font-black uppercase disabled:opacity-50">{addAdminLoading ? '...' : 'Adicionar'}</button>
              </div>
            </div>
          </div>
        )}

        <ScrollToTopButton />
      </div>

      {userDetail && selectedUser && (
        <AdminUserModal
          user={userDetail.user}
          purchases={userDetail.purchases}
          analyses={userDetail.analyses}
          onClose={() => {
            setSelectedUser(null);
            setUserDetail(null);
          }}
          onAction={handleUserAction}
        />
      )}

      {actionModal && (
        <AdminActionModal
          action={
            actionModal.action === 'block' && actionModal.userStatus === 'blocked'
              ? 'unblock'
              : (actionModal.action as any)
          }
          userId={actionModal.userId}
          userEmail={actionModal.userEmail}
          userStatus={actionModal.userStatus}
          onClose={() => setActionModal(null)}
          onSuccess={() => {
            refreshData();
            if (userDetail?.user?.id === actionModal.userId) {
              setUserDetail(null);
              setSelectedUser(null);
            }
          }}
          getToken={() => auth.currentUser?.getIdToken() || Promise.resolve('')}
        />
      )}
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string | number; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-mono text-gray-500 uppercase">{title}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className={`text-xl font-black ${color}`}>{value}</div>
  </div>
);

const HealthCard: React.FC<{ title: string; value: string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-mono text-gray-500 uppercase">{title}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className={`text-lg font-black uppercase ${color}`}>{value}</div>
  </div>
);

const AlertItem: React.FC<{ icon: any; title: string; status: string }> = ({ icon: Icon, title, status }) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/5">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-amber-400" />
      <span className="text-xs font-bold">{title}</span>
    </div>
    <span className={`text-[10px] font-black ${status === 'OK' ? 'text-emerald-400' : 'text-amber-400'}`}>{status}</span>
  </div>
);
