import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ArrowLeft, Brain, FileText, BarChart3, Settings2, MessageSquare,
  Wrench, ClipboardList, Shield, LogOut, ChevronRight, BookOpen, FileCheck, Bug, Zap
} from 'lucide-react';
import { ContractDocsPage } from './ContractDocsPage';
import { auth } from '../services/firebase';
import { CorporateKnowledgeModal } from './CorporateKnowledgeModal';
import { ChatAssistant, type InitialServiceRequest } from './ChatAssistant';
import { AutomationsPage } from './AutomationsPage';
import { getStoredCorporateApiKey } from './CorporateApiLogin';

type CorporateSection = 'dashboard' | 'knowledge' | 'chat' | 'contracts' | 'automations' | 'reports' | 'requests' | 'settings';

interface CorporatePortalProps {
  onBack: () => void;
  onSwitchToUser?: () => void;
}

type ApiUsage = { requestsUsed: number; requestLimit: number; percent: number; alert: boolean; inTrial?: boolean; trialEndsAt?: string | null; plan: string };

export const CorporatePortal: React.FC<CorporatePortalProps> = ({ onBack, onSwitchToUser }) => {
  const [activeSection, setActiveSection] = useState<CorporateSection>('dashboard');
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialServiceRequest, setInitialServiceRequest] = useState<InitialServiceRequest | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);
  const [apiUsageLoading, setApiUsageLoading] = useState(false);

  useEffect(() => {
    if (activeSection !== 'dashboard') return;
    const key = getStoredCorporateApiKey();
    if (!key) return;
    setApiUsageLoading(true);
    fetch('/api/corporate-portal/usage', { headers: { 'X-Api-Key': key } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setApiUsage({ requestsUsed: d.requestsUsed, requestLimit: d.requestLimit, percent: d.percent ?? 0, alert: !!d.alert, inTrial: d.inTrial, trialEndsAt: d.trialEndsAt, plan: d.plan || 'free' }))
      .catch(() => {})
      .finally(() => setApiUsageLoading(false));
  }, [activeSection]);

  const handleSolicitarProposta = (serviceTitle: string, serviceId?: string) => {
    setInitialServiceRequest({ serviceTitle, serviceId });
    setIsChatOpen(true);
  };

  const menuItems: { id: CorporateSection; label: string; desc: string; icon: typeof Brain }[] = [
    { id: 'knowledge', label: 'Base de Conhecimento', desc: 'Documentos, manuais, políticas — treine a IA', icon: BookOpen },
    { id: 'chat', label: 'Chat IA Interno', desc: 'Assistente treinado com dados da empresa', icon: MessageSquare },
    { id: 'contracts', label: 'Documentação de Contratos', desc: 'Checklist e PDF para contratos assinados com empresas', icon: FileCheck },
    { id: 'automations', label: 'Automações', desc: 'Fluxos e integrações', icon: Settings2 },
    { id: 'reports', label: 'Análise e Relatórios', desc: 'Dashboards e métricas', icon: BarChart3 },
    { id: 'requests', label: 'Solicitações de Sistema', desc: 'Pedidos de desenvolvimento sob demanda', icon: ClipboardList },
    { id: 'settings', label: 'Configurações', desc: 'Usuários, permissões, integrações', icon: Shield },
  ];

  return (
    <div className={`min-h-screen font-sans ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'bg-white text-gray-900' : 'bg-[#030712] text-white'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-[400] backdrop-blur-xl border-b px-6 py-4 flex items-center justify-between ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'bg-white/95 border-gray-200 text-gray-900' : 'bg-[#030712]/90 border-white/5'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`p-2.5 rounded-xl border transition-all ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'border-gray-200 hover:border-amber-500/50 text-gray-600' : 'border-white/10 hover:border-amber-500/50 text-gray-400'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Building2 className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className={`text-lg font-black uppercase tracking-tight               ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'text-gray-900' : ''}`}>Elevare Tech AI</h1>
              <p className={`text-[9px] font-mono uppercase tracking-widest ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'text-amber-600' : 'text-amber-500/80'}`}>Portal Corporativo</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {auth.currentUser && (
            <span className={`text-[10px] truncate max-w-[120px] ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'text-gray-500' : 'text-gray-500'}`}>
              {auth.currentUser.email}
            </span>
          )}
          {onSwitchToUser && (
            <button
              onClick={onSwitchToUser}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'bg-gray-100 border-gray-200 hover:border-blue-500/50 text-gray-600 hover:text-blue-600' : 'bg-white/5 border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-blue-400'}`}
            >
              Modo Usuário
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeSection === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-2">
                  Painel Empresarial
                </h2>
                <p className="text-gray-400 text-sm">
                  Gerencie IA corporativa, automações e solicitações de desenvolvimento.
                </p>
              </div>

              {!apiUsageLoading && apiUsage && (
                <div className={`rounded-2xl border p-4 ${apiUsage.alert ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20">
                        <Zap className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">Uso da API</p>
                        <p className="text-[10px] text-gray-500">
                          {apiUsage.requestsUsed} / {apiUsage.requestLimit} requests
                          {apiUsage.inTrial && apiUsage.trialEndsAt && (
                            <span className="text-amber-400 ml-1"> · Trial até {new Date(apiUsage.trialEndsAt).toLocaleDateString('pt-BR')}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 max-w-[140px]">
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${apiUsage.alert ? 'bg-amber-500' : 'bg-amber-500/70'}`}
                          style={{ width: `${Math.min(apiUsage.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {apiUsage.alert && (
                    <p className="text-amber-400 text-[10px] font-bold mt-2">Atenção: você está próximo do limite. Considere fazer upgrade do plano.</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      if (item.id === 'knowledge') setShowKnowledgeModal(true);
                      else if (item.id === 'chat') setIsChatOpen(true);
                      else setActiveSection(item.id);
                    }}
                    className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 text-left group transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                        <item.icon className="w-6 h-6 text-amber-500" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <h3 className="mt-4 text-sm font-black uppercase tracking-tight text-white">
                      {item.label}
                    </h3>
                    <p className="mt-1 text-[10px] text-gray-500">{item.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection !== 'dashboard' && activeSection !== 'knowledge' && activeSection !== 'chat' && (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? '-m-6 md:-m-8 p-6 md:p-8 bg-white min-h-[calc(100vh-theme(spacing.24))]' : ''}
            >
              <button
                onClick={() => setActiveSection('dashboard')}
                className={`mb-6 flex items-center gap-2 text-[10px] font-black uppercase transition-colors ${['automations', 'reports', 'requests', 'settings', 'contracts'].includes(activeSection) ? 'text-gray-600 hover:text-amber-600' : 'text-gray-500 hover:text-amber-500'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao painel
              </button>
              {activeSection === 'contracts' && (
                <ContractDocsPage onBack={() => setActiveSection('dashboard')} theme="light" />
              )}
              {activeSection === 'automations' && (
                <AutomationsPage onRequestQuote={handleSolicitarProposta} />
              )}
              {activeSection === 'reports' && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-black uppercase mb-2 text-gray-900">Análise e Relatórios</h3>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    Dashboards, métricas e relatórios automáticos. Em breve.
                  </p>
                </div>
              )}
              {activeSection === 'requests' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-black uppercase mb-2 text-gray-900">Solicitações de Sistema</h3>
                    <p className="text-gray-600 text-sm max-w-2xl">
                      Solicite desenvolvimento sob demanda. Ao clicar em &quot;Solicitar proposta&quot;, o atendente virtual abre e responde em voz sobre o serviço.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm text-left">
                      <div className="p-3 rounded-xl bg-amber-100 w-fit mb-4">
                        <FileText className="w-8 h-8 text-amber-600" />
                      </div>
                      <p className="text-[10px] font-mono text-amber-600 uppercase tracking-wider mb-1">R$ 5K a R$ 30K</p>
                      <h4 className="text-lg font-black uppercase text-gray-900 mb-2">Auditoria Técnica Completa</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Análise profunda do sistema — performance, segurança, arquitetura e dependências.
                      </p>
                      <ul className="space-y-2 mb-6 text-xs text-gray-700">
                        <li className="flex items-center gap-2">→ Pipeline de auditoria de código</li>
                        <li className="flex items-center gap-2">→ Análise de performance e segurança</li>
                        <li className="flex items-center gap-2">→ IA para sugestões e vulnerabilidades</li>
                        <li className="flex items-center gap-2">→ Relatório técnico + documentação</li>
                      </ul>
                      <button
                        onClick={() => handleSolicitarProposta('Auditoria Técnica Completa', 'auditoria')}
                        className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black uppercase tracking-wider transition-all"
                      >
                        Solicitar proposta
                      </button>
                    </div>
                    <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm text-left">
                      <div className="p-3 rounded-xl bg-amber-100 w-fit mb-4">
                        <Bug className="w-8 h-8 text-amber-600" />
                      </div>
                      <p className="text-[10px] font-mono text-amber-600 uppercase tracking-wider mb-1">R$ 10K a R$ 100K</p>
                      <h4 className="text-lg font-black uppercase text-gray-900 mb-2">Correção e Refatoração Profissional</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Código limpo e estruturado. Bugs em React, APIs, autenticação e legado.
                      </p>
                      <ul className="space-y-2 mb-6 text-xs text-gray-700">
                        <li className="flex items-center gap-2">→ Bugs em React e backend</li>
                        <li className="flex items-center gap-2">→ Ajuste de autenticação</li>
                        <li className="flex items-center gap-2">→ Padronização e limpeza</li>
                        <li className="flex items-center gap-2">→ Código corrigido + documentação</li>
                      </ul>
                      <button
                        onClick={() => handleSolicitarProposta('Correção e Refatoração Profissional', 'refatoracao')}
                        className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black uppercase tracking-wider transition-all"
                      >
                        Solicitar proposta
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeSection === 'settings' && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-12 text-center">
                  <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-black uppercase mb-2 text-gray-900">Configurações</h3>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    Usuários, permissões, integrações e LGPD. Em breve.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CorporateKnowledgeModal
        isOpen={showKnowledgeModal}
        onClose={() => setShowKnowledgeModal(false)}
        theme="dark"
      />

      <ChatAssistant
        isOpen={isChatOpen}
        onClose={() => { setIsChatOpen(false); setInitialServiceRequest(null); }}
        isCorporateMode={true}
        initialServiceRequest={initialServiceRequest}
        onClearInitialRequest={() => setInitialServiceRequest(null)}
      />
    </div>
  );
};
