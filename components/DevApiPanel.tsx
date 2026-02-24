import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Copy, RefreshCw, BarChart3, FileCode, ChevronLeft, Check, LayoutDashboard, CreditCard, BookOpen,
  Play, List, Shield, Settings, Menu, X, Zap, TrendingUp,
} from 'lucide-react';
import { auth } from '../services/firebase';
import {
  getApiDevInfo, createApiKey, regenerateApiKey, getApiLogs, getApiUsage, testApiGenerate,
  API_PLAN_LIMITS, type ApiUserInfo, type ApiLogEntry, type ApiUsageStats,
} from '../services/apiDevService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../services/i18n-temp';

type DevSubView = 'dashboard' | 'keys' | 'usage' | 'billing' | 'docs' | 'tester' | 'logs' | 'security' | 'settings';

interface DevApiPanelProps {
  onBack: () => void;
  onUpgrade?: () => void;
  onLogin?: () => void;
}

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://api.realityscan.app';
const getPlanPrice = (plan: string, t: Record<string, string>) => {
  const m: Record<string, string> = { free: t.apiPlanFree, basic: t.apiPlanBasicPrice, pro: t.apiPlanProPrice, enterprise: t.apiPlanEnterprisePrice };
  return m[plan] ?? t.apiPlanFree;
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void; isLight: boolean }> = ({
  icon, label, active, onClick, isLight,
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[11px] font-bold uppercase tracking-wider transition-all ${
      active
        ? isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400'
        : isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
  </button>
);

export const DevApiPanel: React.FC<DevApiPanelProps> = ({ onBack, onUpgrade, onLogin }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === 'light';

  const [subView, setSubView] = useState<DevSubView>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [info, setInfo] = useState<ApiUserInfo | null>(null);
  const [usage, setUsage] = useState<ApiUsageStats | null>(null);
  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [usageRange, setUsageRange] = useState<7 | 30>(7);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    const user = auth.currentUser;
    setLoading(true);
    setError(null);
    if (!user) {
      setLoading(false);
      setInfo(null);
      setUsage(null);
      setLogs([]);
      return;
    }
    try {
      const token = await user.getIdToken();
      const [data, logsData, usageData] = await Promise.all([
        getApiDevInfo(token),
        getApiLogs(token, 50),
        getApiUsage(token, usageRange),
      ]);
      if (data) setInfo(data);
      setLogs(logsData);
      setUsage(usageData || null);
    } catch (e) {
      setError(t.apiLoadFail);
    } finally {
      setLoading(false);
    }
  }, [usageRange, t]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const handleCreateKey = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const result = await createApiKey(token);
      if ('error' in result) setError(result.error);
      else {
        setFullApiKey(result.apiKey);
        setInfo((p) => (p ? { ...p, apiKey: result.apiKey!.slice(0, 12) + '...' } : null));
        fetchInfo();
      }
    } catch (e) { setError(t.apiCreateKeyError); }
    finally { setCreating(false); }
  };

  const handleRegenerateKey = async () => {
    if (!confirm(t.apiRegenerateConfirm)) return;
    const user = auth.currentUser;
    if (!user) return;
    setRegenerating(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const result = await regenerateApiKey(token);
      if ('error' in result) setError(result.error);
      else {
        setFullApiKey(result.apiKey);
        fetchInfo();
      }
    } catch (e) { setError(t.apiRegenerateError); }
    finally { setRegenerating(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestApi = async () => {
    if (!testPrompt.trim()) return;
    const user = auth.currentUser;
    if (!user) return;
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    try {
      const token = await user.getIdToken();
      const result = await testApiGenerate(token, testPrompt);
      if ('error' in result) setTestError(result.error);
      else setTestResult(result.text);
    } catch (e) { setTestError(t.apiTestError); }
    finally { setTestLoading(false); }
  };

  const bg = isLight ? 'bg-gray-50 text-gray-900' : 'bg-[#030712] text-gray-100';
  const card = isLight ? 'bg-white border-gray-200' : 'bg-[#0a0f1e]/80 border-white/10';
  const muted = isLight ? 'text-gray-500' : 'text-gray-400';

  const menuItems: { id: DevSubView; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-4 h-4 shrink-0" />, label: t.apiDashboard },
    { id: 'keys', icon: <Key className="w-4 h-4 shrink-0" />, label: t.apiKeys },
    { id: 'usage', icon: <BarChart3 className="w-4 h-4 shrink-0" />, label: t.apiUsage },
    { id: 'billing', icon: <CreditCard className="w-4 h-4 shrink-0" />, label: t.apiBilling },
    { id: 'docs', icon: <BookOpen className="w-4 h-4 shrink-0" />, label: t.apiDocs },
    { id: 'tester', icon: <Play className="w-4 h-4 shrink-0" />, label: t.apiTester },
    { id: 'logs', icon: <List className="w-4 h-4 shrink-0" />, label: t.apiLogs },
    { id: 'security', icon: <Shield className="w-4 h-4 shrink-0" />, label: t.apiSecurity },
    { id: 'settings', icon: <Settings className="w-4 h-4 shrink-0" />, label: t.apiSettings },
  ];

  if (!auth.currentUser) {
    return (
      <div className={`min-h-screen ${bg} p-6`}>
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <button onClick={onBack} className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest self-start">
            <ChevronLeft className="w-4 h-4" /> {t.back}
          </button>
          <div className={`rounded-2xl border p-8 text-center ${card}`}>
            <Key className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-lg font-black uppercase mb-2">{t.apiDevPanelTitle}</h2>
            <p className={`text-[11px] ${muted} mb-6`}>{t.apiLoginToManage}</p>
            {onLogin && (
              <button onClick={onLogin} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest">
                {t.apiSignIn}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} flex flex-col md:flex-row`}>
      {/* Header mobile */}
      <div className={`md:hidden flex items-center justify-between p-4 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
        <button onClick={onBack} className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase">
          <ChevronLeft className="w-4 h-4" /> {t.back}
        </button>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 shrink-0 border-r ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#0a0f1e]'}`}
      >
        <div className="p-4 border-b border-white/5 hidden md:block">
          <button onClick={onBack} className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" /> {t.back}
          </button>
        </div>
        <div className="p-3 space-y-1 overflow-y-auto">
          {menuItems.map((m) => (
            <MenuItem key={m.id} icon={m.icon} label={m.label} active={subView === m.id} onClick={() => { setSubView(m.id); setMenuOpen(false); }} isLight={isLight} />
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        {error && (
          <div className={`mb-4 p-4 rounded-xl ${isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/20 text-red-400'} text-[10px]`}>
            {error}
          </div>
        )}

        {loading && subView === 'dashboard' ? (
          <div className="flex justify-center py-20">
            <div className={`w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : (
          <>
            {/* 1. Dashboard */}
            {subView === 'dashboard' && info && (
              <div className="space-y-6 max-w-4xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-blue-500" /> {t.apiDashboard}
                </h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <p className={`text-[9px] uppercase tracking-widest ${muted} mb-1`}>{t.apiRequestsMonthShort}</p>
                    <p className="text-2xl font-black">{usage?.totalMonth ?? info.requestsUsed} <span className="text-sm font-normal text-gray-500">/ {info.requestLimit < 0 ? '∞' : info.requestLimit}</span></p>
                  </div>
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <p className={`text-[9px] uppercase tracking-widest ${muted} mb-1`}>{t.apiLimitToday}</p>
                    <p className="text-2xl font-black">{usage?.today ?? 0}</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <p className={`text-[9px] uppercase tracking-widest ${muted} mb-1`}>{t.apiPlanLimit}</p>
                    <p className="text-lg font-black">{info.requestLimit < 0 ? t.apiUnlimited : info.requestLimit}</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <p className={`text-[9px] uppercase tracking-widest ${muted} mb-1`}>{t.apiCostEst}</p>
                    <p className="text-lg font-black">${usage?.costEstimated ?? '0.0000'}</p>
                  </div>
                </div>
                <div className={`rounded-xl border p-4 ${card}`}>
                  <p className={`text-[9px] uppercase tracking-widest ${muted} mb-2`}>{t.apiAccountStatus}</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${info.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${info.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {info.active ? t.apiActive : t.apiBlocked}
                  </span>
                  {usage?.modelMostUsed && <p className={`text-[10px] ${muted} mt-2`}>{t.apiModelMostUsed}: {usage.modelMostUsed}</p>}
                </div>
                {usage?.weekData && usage.weekData.length > 0 && (
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <p className={`text-[9px] uppercase tracking-widest ${muted} mb-4`}>{t.apiUsageLast7}</p>
                    <div className="flex items-end gap-2 h-24">
                      {usage.weekData.map((d, i) => (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-t min-h-[4px] ${isLight ? 'bg-blue-500' : 'bg-blue-500/80'}`}
                            style={{ height: `${Math.max(4, (d.count / Math.max(1, Math.max(...usage.weekData.map(x => x.count)))) * 80)}px` }}
                          />
                          <span className="text-[8px] text-gray-500">{d.date.slice(8)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {onUpgrade && info.plan === 'free' && (
                  <button onClick={onUpgrade} className={`w-full py-4 rounded-xl border-2 ${isLight ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-amber-500/50 bg-amber-500/10 text-amber-400'} font-black uppercase text-[10px] tracking-widest`}>
                    {t.apiUpgrade}
                  </button>
                )}
              </div>
            )}

            {/* 2. API Keys */}
            {subView === 'keys' && (
              <div className="space-y-6 max-w-2xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-500" /> {t.apiKeys}
                </h1>
                <div className={`rounded-xl border p-6 ${card} space-y-4`}>
                  {info?.apiKey ? (
                    <>
                      <div className={`flex items-center gap-2 p-3 rounded-xl font-mono text-[10px] break-all ${isLight ? 'bg-gray-100' : 'bg-black/40'}`}>
                        <span className={muted}>sk_live_</span>
                        <span>{fullApiKey ? fullApiKey.slice(8) : '••••••••••••••••••••••••'}</span>
                      </div>
                      {fullApiKey && <p className={`text-amber-500/80 text-[8px] uppercase`}>{t.apiCopyNow}</p>}
                      <div className="flex gap-2">
                        {fullApiKey && (
                          <button onClick={() => copyToClipboard(fullApiKey)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 border border-blue-500/40 text-blue-400'} text-[9px] font-black uppercase`}>
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? t.apiCopied : t.apiCopy}
                          </button>
                        )}
                        <button onClick={handleRegenerateKey} disabled={regenerating} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-600/20 border border-amber-500/40 text-amber-400'} text-[9px] font-black uppercase disabled:opacity-50`}>
                          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                          {t.apiRegenerate}
                        </button>
                      </div>
                      <p className={`text-[8px] ${muted}`}>{t.apiStatus}: {info.active ? t.apiActive : t.apiInactive}</p>
                    </>
                  ) : (
                    <>
                      <p className={`text-[10px] ${muted}`}>{t.apiNoKeyYet}</p>
                      <button onClick={handleCreateKey} disabled={creating} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                        {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        {t.apiCreateKey}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 3. Uso */}
            {subView === 'usage' && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h1 className="text-xl font-black uppercase flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" /> {t.apiUsageConsumption}
                  </h1>
                  <div className="flex gap-2">
                    <button onClick={() => setUsageRange(7)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${usageRange === 7 ? 'bg-blue-600 text-white' : isLight ? 'bg-gray-200 text-gray-600' : 'bg-white/10 text-gray-400'}`}>{t.apiDays7}</button>
                    <button onClick={() => setUsageRange(30)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${usageRange === 30 ? 'bg-blue-600 text-white' : isLight ? 'bg-gray-200 text-gray-600' : 'bg-white/10 text-gray-400'}`}>{t.apiDays30}</button>
                  </div>
                </div>
                {usage && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`rounded-xl border p-4 ${card}`}>
                      <p className={`text-[9px] uppercase ${muted} mb-1`}>{t.apiRequestsPerDay}</p>
                      <p className="text-xl font-black">{usage.today} {t.apiToday}</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${card}`}>
                      <p className={`text-[9px] uppercase ${muted} mb-1`}>{t.apiTotalPeriod}</p>
                      <p className="text-xl font-black">{usage.totalMonth}</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${card}`}>
                      <p className={`text-[9px] uppercase ${muted} mb-1`}>{t.apiCostEst}</p>
                      <p className="text-xl font-black">${usage.costEstimated}</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${card}`}>
                      <p className={`text-[9px] uppercase ${muted} mb-1`}>{t.apiEndpointMostUsed}</p>
                      <p className="text-sm font-mono">{usage.endpointMostUsed || '-'}</p>
                    </div>
                  </div>
                )}
                {usage?.weekData && usage.weekData.length > 0 && (
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <p className={`text-[9px] uppercase tracking-widest ${muted} mb-4`}>{t.apiUsageChart}</p>
                    <div className="flex items-end gap-1 h-32">
                      {usage.weekData.map((d) => (
                        <div key={d.date} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full rounded-t ${isLight ? 'bg-blue-500' : 'bg-blue-500/80'}`}
                            style={{ height: `${Math.max(8, (d.count / Math.max(1, Math.max(...usage.weekData.map(x => x.count)))) * 100)}px` }}
                          />
                          <span className="text-[7px] text-gray-500 mt-1 truncate w-full text-center">{d.date.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Billing */}
            {subView === 'billing' && (
              <div className="space-y-6 max-w-2xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" /> {t.apiBilling}
                </h1>
                <div className={`rounded-xl border p-6 ${card} space-y-4`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] ${muted}`}>{t.apiCurrentPlan}</span>
                    <span className="font-black uppercase">{API_PLAN_LIMITS[info?.plan as keyof typeof API_PLAN_LIMITS]?.label || info?.plan}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] ${muted}`}>{t.apiMonthlyLimit}</span>
                    <span className="font-black">{info?.requestLimit ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] ${muted}`}>{t.apiRenewal}</span>
                    <span className="font-mono text-sm">{info?.renewDate || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] ${muted}`}>{t.apiValue}</span>
                    <span className="font-black">{getPlanPrice(info?.plan ?? 'free', t)}</span>
                  </div>
                  {onUpgrade && (
                    <button onClick={onUpgrade} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest">
                      {t.apiUpgradePlan}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 5. Documentação */}
            {subView === 'docs' && (
              <div className="space-y-6 max-w-3xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" /> {t.apiDocs}
                </h1>
                <div className={`rounded-xl border p-4 ${card}`}>
                  <p className={`text-[9px] uppercase ${muted} mb-2`}>{t.apiBaseUrl}</p>
                  <code className={`block p-3 rounded-lg font-mono text-[10px] ${isLight ? 'bg-gray-100' : 'bg-black/40'}`}>{API_BASE_URL}/api/v1</code>
                </div>
                <div className={`rounded-xl border p-4 ${card} space-y-4`}>
                  <p className={`text-[9px] uppercase ${muted}`}>{t.apiEndpoints}</p>
                  <ul className={`space-y-2 text-[10px] font-mono ${muted}`}>
                    <li>POST /api/v1/generate — Geração de texto</li>
                    <li>POST /api/v1/analyze — Análise de imagem</li>
                    <li>POST /api/v1/voice — Narração de texto</li>
                  </ul>
                </div>
                <div className={`rounded-xl border p-4 ${card} space-y-3`}>
                  <p className={`text-[9px] uppercase ${muted}`}>{t.apiExampleFetch}</p>
                  <pre className={`p-3 rounded-lg overflow-x-auto text-[9px] font-mono ${isLight ? 'bg-gray-100' : 'bg-black/60'}`}>{`fetch("${API_BASE_URL}/api/v1/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "sua_api_key"
  },
  body: JSON.stringify({ prompt: "Sua pergunta aqui" })
})`}</pre>
                  <button onClick={() => copyToClipboard(`fetch("${API_BASE_URL}/api/v1/generate", {\n  method: "POST",\n  headers: { "Content-Type": "application/json", "x-api-key": "sua_api_key" },\n  body: JSON.stringify({ prompt: "Sua pergunta" })\n})`)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400'} text-[9px] font-bold`}>
                    <Copy className="w-3 h-3" /> {t.apiCopy}
                  </button>
                </div>
              </div>
            )}

            {/* 6. Testador */}
            {subView === 'tester' && (
              <div className="space-y-6 max-w-2xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-500" /> {t.apiTester}
                </h1>
                <div className={`rounded-xl border p-6 ${card} space-y-4`}>
                  <label className={`block text-[10px] uppercase ${muted}`}>{t.apiEnterPrompt}</label>
                  <textarea
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder={t.apiTestApiPlaceholder}
                    className={`w-full p-4 rounded-xl font-mono text-sm resize-none ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-black/40 border-white/10'} border focus:ring-2 focus:ring-blue-500 outline-none`}
                    rows={4}
                  />
                  <button onClick={handleTestApi} disabled={testLoading} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                    {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {t.apiTestApi}
                  </button>
                  {testError && <p className="text-red-500 text-[10px]">{testError}</p>}
                  {testResult && (
                    <div className={`rounded-xl p-4 ${isLight ? 'bg-green-50 border border-green-200' : 'bg-green-500/10 border border-green-500/20'}`}>
                      <p className={`text-[9px] uppercase ${muted} mb-2`}>{t.apiResponse}</p>
                      <p className="text-sm whitespace-pre-wrap">{testResult}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. Logs */}
            {subView === 'logs' && (
              <div className="space-y-6 max-w-4xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <List className="w-5 h-5 text-blue-500" /> {t.apiLogsTitle}
                </h1>
                <div className={`rounded-xl border overflow-hidden ${card}`}>
                  {logs.length === 0 ? (
                    <p className={`p-6 text-center ${muted} text-[10px]`}>{t.apiNoRequestsYet}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className={`${isLight ? 'bg-gray-100' : 'bg-black/40'}`}>
                            <th className="text-left p-3">{t.apiDate}</th>
                            <th className="text-left p-3">{t.apiEndpoint}</th>
                            <th className="text-left p-3">{t.apiModel}</th>
                            <th className="text-left p-3">{t.apiStatus}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log, i) => (
                            <tr key={i} className={`border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                              <td className="p-3 font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '-'}</td>
                              <td className="p-3 font-mono text-blue-500">{log.endpoint}</td>
                              <td className="p-3">{log.model || '-'}</td>
                              <td className="p-3">{(log as any).status || 'ok'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 8. Segurança */}
            {subView === 'security' && (
              <div className="space-y-6 max-w-2xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" /> {t.apiSecurity}
                </h1>
                <div className={`rounded-xl border p-6 ${card} space-y-4`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] ${muted}`}>{t.apiLimitPerMin}</span>
                    <span className="font-mono">~15 req/min</span>
                  </div>
                  <p className={`text-[9px] ${muted}`}>{t.apiRegenerateHint}</p>
                  <button onClick={() => setSubView('keys')} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-gray-300'} text-[10px] font-bold`}>
                    <Key className="w-4 h-4" /> {t.apiGoToKeys}
                  </button>
                </div>
              </div>
            )}

            {/* 9. Configurações */}
            {subView === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <h1 className="text-xl font-black uppercase flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" /> {t.apiSettings}
                </h1>
                <div className={`rounded-xl border p-6 ${card} space-y-4`}>
                  <div>
                    <label className={`block text-[10px] uppercase ${muted} mb-1`}>{t.apiEmail}</label>
                    <p className="font-mono">{info?.email || auth.currentUser?.email || '-'}</p>
                  </div>
                  <p className={`text-[9px] ${muted}`}>{t.apiAccountHint}</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
