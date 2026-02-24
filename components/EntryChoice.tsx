import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Building2, ChevronRight, Lightbulb, Cpu, Zap, Info, BookOpen, X } from 'lucide-react';
import { FaInstagram, FaFacebookF, FaTiktok, FaWhatsapp } from 'react-icons/fa';

const MODE_KEY = 'rs_app_mode';

export type AppMode = 'user' | 'corporate';

interface EntryChoiceProps {
  onSelect: (mode: AppMode) => void;
}

export const EntryChoice: React.FC<EntryChoiceProps> = ({ onSelect }) => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleSelect = (mode: AppMode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (_) {}
    onSelect(mode);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-white flex flex-col items-center justify-center overflow-hidden h-screen">
      <div className="fixed top-3 left-3 z-[100] flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-blue-100 flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors shadow-sm border border-gray-200"
          title="Informações sobre todos os serviços"
          aria-label="Informações"
        >
          <Info className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => { try { window.close(); } catch (_) {} }}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-600 hover:text-red-600 transition-colors shadow-sm border border-gray-200"
          title="Fechar o app"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-4 sm:px-6 max-h-[100vh] py-4 overflow-hidden">
        <div className="w-full flex flex-col items-center text-center">
          <h1 className="text-lg font-black tracking-tight text-gray-900 mb-1 text-center">
            Como deseja <span className="text-blue-600">entrar</span>?
          </h1>
          <p className="text-xs text-gray-500 mb-4 text-center">
            Escolha o modo de acesso ao RealityScan
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelect('user')}
              className="group p-4 text-center border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 flex flex-col items-center min-h-0 rounded-xl"
            >
              <User className="w-6 h-6 text-blue-500 mb-2" strokeWidth={1.5} />
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">
                Usuário comum
              </h2>
              <p className="text-[11px] text-gray-600 leading-snug mb-2 text-center line-clamp-3">
                Análise forense, detecção de IA, golpes e deepfakes. API para devs. Terminal completo para uso pessoal e profissional.
              </p>
              <span className="inline-flex items-center gap-1 text-blue-600 text-[9px] font-black uppercase tracking-widest group-hover:gap-1.5 transition-all">
                Entrar <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelect('corporate')}
              className="group p-4 text-center border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all duration-200 flex flex-col items-center min-h-0 rounded-xl"
            >
              <Building2 className="w-6 h-6 text-amber-500 mb-2" strokeWidth={1.5} />
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">
                Empresa
              </h2>
              <p className="text-[11px] text-gray-600 leading-snug mb-2 text-center line-clamp-3">
                IA corporativa, base de conhecimento, automações, suporte e desenvolvimento sob demanda. Elevare Tech AI.
              </p>
              <span className="inline-flex items-center gap-1 text-amber-600 text-[9px] font-black uppercase tracking-widest group-hover:gap-1.5 transition-all">
                Acessar portal <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </motion.button>
          </div>

          <div className="w-full border-t border-gray-200 pt-4 pb-1 flex flex-col items-center">
            <h3 className="text-amber-600 font-black text-[10px] uppercase tracking-widest text-center mb-2">
              Área Corporativa – Elevare Tech AI
            </h3>
            <div className="rounded-xl bg-gray-50/80 border border-gray-100 px-4 py-3 space-y-2 w-full max-w-lg">
              <div className="flex gap-2 items-start text-left">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Soluções inteligentes desenvolvidas para empresas que desejam automatizar processos, reduzir custos operacionais e evoluir tecnologicamente.
                </p>
              </div>
              <div className="flex gap-2 items-start text-left">
                <Cpu className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Na área corporativa, sua empresa conta com uma inteligência artificial exclusiva, capaz de analisar dados, responder equipes, automatizar tarefas, gerar relatórios e desenvolver sistemas sob demanda.
                </p>
              </div>
              <div className="flex gap-2 items-start text-left">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Com a Elevare Tech AI, sua organização ganha um centro de inteligência digital completo, com suporte 24h, automações personalizadas e desenvolvimento contínuo de soluções tecnológicas para impulsionar produtividade, segurança e crescimento sustentável.
                </p>
              </div>
              <div className="flex gap-2 items-start text-left">
                <BookOpen className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Treine a IA para fazer o que sua empresa precisa. Explore a base do conhecimento.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 w-full flex flex-col items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1">Usado por criadores e empresas</p>
              <p className="text-[9px] text-gray-500 italic leading-snug max-w-xs mx-auto">&quot;Verifico fotos e vídeos antes de publicar. Indispensável.&quot;</p>
              <p className="text-[9px] text-gray-500 italic leading-snug max-w-xs mx-auto mt-0.5">&quot;A API integrou em um dia. Suporte excelente.&quot;</p>
            </div>
            <p className="text-[8px] text-gray-400 font-mono uppercase tracking-widest text-center">
              RealityScan · Modo dual usuário / corporativo
            </p>
            <div className="flex items-center justify-center gap-3">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-pink-100 flex items-center justify-center text-gray-600 hover:text-pink-600 transition-colors" title="Seguir no Instagram" aria-label="Instagram">
            <FaInstagram size={20} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-blue-100 flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors" title="Seguir no Facebook" aria-label="Facebook">
            <FaFacebookF size={20} />
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-800 hover:text-white flex items-center justify-center text-gray-600 transition-colors" title="Seguir no TikTok" aria-label="TikTok">
            <FaTiktok size={20} />
          </a>
          <a href="https://wa.me" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-green-100 flex items-center justify-center text-gray-600 hover:text-green-600 transition-colors" title="WhatsApp" aria-label="WhatsApp">
            <FaWhatsapp size={20} />
          </a>
            </div>
          </div>
        </div>
      </div>

      {showInfoModal && (
        <div className="fixed inset-0 z-[95] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Informações — Todos os serviços</h2>
              <button type="button" onClick={() => setShowInfoModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Fechar">×</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-6 text-left text-gray-700">
              <section>
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Modo Usuário comum</h3>
                <p className="text-[11px] leading-relaxed mb-2">
                  Terminal completo para uso pessoal e profissional: análise forense de imagens, vídeos e áudios; detecção de conteúdo gerado por IA e deepfakes; identificação de golpes e perfis suspeitos; módulo anti-golpe romântico; FaceScan (análise biométrica facial); Sentry (monitoramento de feed em tempo real com detecção de IA e scam); câmera forense para captura e análise; relatórios simples e em PDF; chat com agente de raciocínio e análise de mídia (conforme plano). Planos: Livre (scans limitados), Advanced e Business com mais análises e recursos.
                </p>
              </section>
              <section>
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2">Modo Empresa — Área corporativa (Elevare Tech AI)</h3>
                <p className="text-[11px] leading-relaxed mb-2">
                  Acesso via API Key. IA corporativa treinada na base de conhecimento da empresa; automações; suporte e desenvolvimento sob demanda; documentação de contratos; painel business e banco de dados. Soluções para automatizar processos, reduzir custos e evoluir tecnologicamente. Suporte 24h, automações personalizadas e desenvolvimento contínuo.
                </p>
              </section>
              <section>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Serviços de automação (portal corporativo)</h3>
                <ul className="space-y-4 text-[11px]">
                  <li>
                    <strong className="text-gray-900">Auditoria Técnica Completa</strong> — Análise profunda do sistema: performance, segurança, arquitetura e dependências. Pipeline de auditoria de código, análise de performance e segurança, IA para sugestões e vulnerabilidades, relatório técnico e documentação. Faixa: R$ 5k a R$ 30k.
                  </li>
                  <li>
                    <strong className="text-gray-900">Correção e Refatoração Profissional</strong> — Código limpo e estruturado. Atuação em bugs em React, APIs, autenticação e legado; ajuste de autenticação; padronização e limpeza; código corrigido e documentação. Faixa: R$ 10k a R$ 100k.
                  </li>
                  <li>
                    <strong className="text-gray-900">Otimização e Performance</strong> — Sistema mais rápido e escalável. Frontend, backend e infra: lazy loading, code splitting, memoização; otimização de queries e cache; Redis e escalabilidade; redução de custo em nuvem. Preço sob consulta.
                  </li>
                  <li>
                    <strong className="text-gray-900">Segurança e Anti-Fraude com IA</strong> — Proteção inteligente: detecção de login suspeito, transações e deepfake. Score de risco e padrões anormais, bloqueio automático, análise de IP e geolocalização, modelo de IA para fraude e deepfake. Faixa: R$ 20k a R$ 200k.
                  </li>
                  <li>
                    <strong className="text-gray-900">Desenvolvimento Sob Demanda</strong> — Criação de novos sistemas, dashboards e integrações. Inclui landing pages e painéis admin, APIs REST seguras, integração com IA e sistemas SaaS completos. Faixa: R$ 50k a R$ 500k+.
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Solicitações de sistema</h3>
                <p className="text-[11px] leading-relaxed">
                  Pedidos diretos de <strong>Auditoria Técnica Completa</strong> e de <strong>Correção e Refatoração Profissional</strong>, com abertura do atendente virtual para solicitar proposta personalizada.
                </p>
              </section>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button type="button" onClick={() => setShowInfoModal(false)} className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-[11px] font-bold uppercase">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function getStoredAppMode(): AppMode | null {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'user' || m === 'corporate' ? m : null;
  } catch {
    return null;
  }
}
