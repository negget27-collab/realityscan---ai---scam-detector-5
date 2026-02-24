import React from 'react';
import { Bug, Zap, Shield, Code, FileText, ChevronRight } from 'lucide-react';

interface AutomationsPageProps {
  /** Ao clicar em "Solicitar Proposta", abre o atendente virtual com o serviço selecionado */
  onRequestQuote?: (serviceTitle: string, serviceId?: string) => void;
}

const services = [
  {
    id: 'audit',
    icon: FileText,
    title: 'Auditoria Técnica Completa',
    desc: 'Análise profunda do sistema — performance, segurança, arquitetura e dependências.',
    price: 'R$ 5k a R$ 30k',
    features: ['Pipeline de auditoria de código', 'Análise de performance e segurança', 'IA para sugestões e vulnerabilidades', 'Relatório técnico + documentação'],
  },
  {
    id: 'correction',
    icon: Bug,
    title: 'Correção e Refatoração Profissional',
    desc: 'Código limpo e estruturado. Bugs em React, APIs, autenticação e legado.',
    price: 'R$ 10k a R$ 100k',
    features: ['Bugs em React e backend', 'Ajuste de autenticação', 'Padronização e limpeza', 'Código corrigido + documentação'],
  },
  {
    id: 'performance',
    icon: Zap,
    title: 'Otimização e Performance',
    desc: 'Sistema mais rápido e escalável. Frontend, backend e infra.',
    price: 'Sob consulta',
    features: ['Lazy loading, code splitting, memoização', 'Otimização de queries e cache', 'Redis e escalabilidade', 'Redução de custo cloud'],
  },
  {
    id: 'antifraud',
    icon: Shield,
    title: 'Segurança e Anti-Fraude com IA',
    desc: 'Proteção inteligente. Detecção de login suspeito, transações e deepfake.',
    price: 'R$ 20k a R$ 200k',
    features: ['Score de risco e padrões anormais', 'Bloqueio automático', 'Análise de IP e geolocalização', 'Modelo IA para fraude e deepfake'],
  },
  {
    id: 'development',
    icon: Code,
    title: 'Desenvolvimento Sob Demanda',
    desc: 'Criação de novos sistemas, dashboards e integrações.',
    price: 'R$ 50k a R$ 500k+',
    features: ['Landing pages e painéis admin', 'APIs REST seguras', 'Integração com IA', 'Sistemas SaaS completos'],
  },
];

export const AutomationsPage: React.FC<AutomationsPageProps> = ({ onRequestQuote }) => {
  return (
    <div className="w-full text-gray-900">
      <section className="w-full py-12 md:py-16 px-6 md:px-12 lg:px-20">
        <h1 className="text-lg md:text-xl font-black tracking-tight text-amber-600 uppercase mb-4">
          Engenharia Inteligente de Software
        </h1>
        <p className="text-xs md:text-sm text-gray-600 leading-relaxed max-w-2xl">
          Não vendemos &quot;programação&quot;. Vendemos{' '}
          <span className="text-amber-600 font-bold">Correção</span>,{' '}
          <span className="text-amber-600 font-bold">Otimização</span>,{' '}
          <span className="text-amber-600 font-bold">Segurança</span>,{' '}
          <span className="text-amber-600 font-bold">Escalabilidade</span> e{' '}
          <span className="text-amber-600 font-bold">Performance</span>.{' '}
          Empresas pagam caro por isso.
        </p>
      </section>

      <div className="border-t border-gray-200">
        {services.map((s, idx) => (
          <section
            key={s.id}
            className={`w-full py-8 md:py-10 px-6 md:px-12 lg:px-20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 ${
              idx % 2 === 1 ? 'bg-gray-50' : ''
            }`}
          >
            <div className="flex-1 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="p-1.5 text-amber-600">
                  <s.icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                </div>
                <span className="text-amber-600 text-[10px] font-black uppercase tracking-wider">
                  {s.price}
                </span>
              </div>
              <h2 className="text-sm md:text-base font-black tracking-tight text-gray-900 uppercase mb-2">
                {s.title}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                {s.desc}
              </p>
              <ul className="space-y-1.5">
                {s.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-500 text-[11px]">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:shrink-0 lg:pl-8">
              <button
                onClick={() => onRequestQuote?.(s.title, s.id)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Solicitar Proposta
              </button>
            </div>
          </section>
        ))}
      </div>

      <section className="w-full py-12 md:py-16 px-6 md:px-12 lg:px-20 border-t border-gray-200 bg-gray-50">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 mb-8">
          Modelo de Cobrança
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Auditoria</p>
            <p className="text-xs md:text-sm text-amber-600 font-black">R$ 5k – 30k</p>
          </div>
          <div>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Correção</p>
            <p className="text-xs md:text-sm text-amber-600 font-black">R$ 10k – 100k</p>
          </div>
          <div>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Anti-Fraude</p>
            <p className="text-xs md:text-sm text-amber-600 font-black">R$ 20k – 200k</p>
          </div>
          <div>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Sistema Completo</p>
            <p className="text-xs md:text-sm text-amber-600 font-black">R$ 50k – 500k+</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-8 max-w-xl">
          Valores variam conforme porte da empresa. Fintech, e-commerce, marketplace e SaaS pagam por proteção e qualidade.
        </p>
      </section>
    </div>
  );
};
