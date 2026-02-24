
import React from "react";
import { PlanConfig } from "./types";

interface PagamentoAprovadoProps {
  purchasedPlanId?: string | null;
  plans: PlanConfig[];
  onGoHome: () => void;
}

export default function PagamentoAprovado({ purchasedPlanId, plans, onGoHome }: PagamentoAprovadoProps) {
  const transactionId = `RS-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
  const date = new Date().toLocaleString('pt-BR');

  const isAnnual = purchasedPlanId?.includes('annual');
  const baseId = purchasedPlanId?.replace('_annual', '') || 'advanced';
  const basePlan = plans.find(p => p.id === baseId) || plans[1];
  
  let displayPrice = basePlan.price;
  if (baseId === 'advanced' && isAnnual) displayPrice = 'R$ 302,90';
  if (baseId === 'business' && isAnnual) displayPrice = 'R$ 493,90';
  
  const displayTitle = `${basePlan.name} ${isAnnual ? 'ANUAL' : 'MENSAL'}`;

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-4 md:p-6 font-sans overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Modal Container - Altura Reduzida */}
        <div className="bg-[#0a0f1e]/90 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 md:p-8 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative overflow-hidden group">
          
          {/* Botão de Fechar (X) - Mais compacto */}
          <button 
            onClick={onGoHome}
            className="absolute top-6 right-6 p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-all active:scale-90 z-20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center space-y-6">
            {/* Ícone de Sucesso - Escala Reduzida */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500/20 blur-2xl animate-pulse rounded-full"></div>
              <div className="relative w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(22,163,74,0.3)] border-2 border-white/10">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-[0.9]">
                Upgrade<br /><span className="text-green-500">Concluído</span>
              </h1>
              <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.4em] font-black">
                Transação Verificada via Gateway
              </p>
            </div>

            {/* Receipt Summary - Compactado */}
            <div className="bg-black/40 border border-white/5 rounded-3xl p-5 space-y-4 text-left">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[7px] font-mono text-gray-600 uppercase font-black tracking-widest">Produto</span>
                <span className="text-[9px] font-black text-white uppercase tracking-wider">
                  {displayTitle}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[7px] font-mono text-gray-600 uppercase font-black">Transação:</span>
                  <span className="text-[8px] font-mono text-gray-400">{transactionId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[7px] font-mono text-gray-600 uppercase font-black">Handshake:</span>
                  <span className="text-[8px] font-mono text-gray-400">{date}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2">
                  <span className="text-[7px] font-mono text-gray-600 uppercase font-black">Valor Liquidado:</span>
                  <span className="text-base font-black text-green-500">{displayPrice}</span>
                </div>
              </div>
            </div>

            <div className="pt-1">
               <div className="bg-[#05110a] border border-green-900/30 p-4 rounded-2xl flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e] shrink-0"></div>
                  <p className="flex-1 text-[7px] font-black text-green-500 uppercase tracking-widest text-center leading-relaxed">
                    Sincronização completa. Agentes DAI injetados em seu perfil com sucesso.
                  </p>
               </div>
            </div>
          </div>
        </div>

        <p className="text-[6px] font-mono text-gray-700 uppercase tracking-[1em] mt-8 text-center opacity-30">
          RealityScan Global Defense // Criptografia Ativa
        </p>
      </div>
    </div>
  );
}