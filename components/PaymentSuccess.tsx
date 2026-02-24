import React, { useEffect } from 'react';
import { PlanConfig } from '../types';
import { motion } from 'framer-motion';

interface PaymentSuccessProps {
  plan: PlanConfig;
  onFinish: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ plan, onFinish }) => {
  const transactionId = `RS-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
  const date = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-4 md:p-6 font-sans animate-in fade-in duration-1000 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/8 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.06)_0%,transparent_70%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 1, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#0a0f1e] backdrop-blur-3xl border-2 border-green-500/30 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_80px_rgba(34,197,94,0.2)] relative overflow-hidden"
        >
          <button
            onClick={onFinish}
            className="absolute top-6 right-6 p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-all active:scale-90 z-20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center space-y-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="relative inline-block"
            >
              <div className="absolute inset-0 bg-green-500/30 blur-2xl rounded-full"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)] border-2 border-green-400/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>

            <div className="space-y-2 min-h-[4rem]" role="alert" aria-live="polite">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white drop-shadow-sm [text-shadow:0_0_20px_rgba(34,197,94,0.3)]">
                Compra realizada com sucesso!
              </h1>
              <p className="text-sm md:text-base text-gray-200 font-medium">
                Obrigado por confiar no RealityScan. Seu plano foi ativado.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-500">Plano</span>
                <span className="text-white bg-blue-600/20 px-3 py-1 rounded-lg border border-blue-500/30">{plan.name}</span>
              </div>
              <div className="space-y-2 bg-black/40 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-mono text-gray-500 uppercase font-bold">ID:</span>
                  <span className="font-mono text-gray-400">{transactionId}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-mono text-gray-500 uppercase font-bold">Data:</span>
                  <span className="font-mono text-gray-400">{date}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5 text-sm">
                  <span className="font-bold text-gray-400">Investimento:</span>
                  <span className="font-black text-green-400">{plan.price}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></div>
              <p className="flex-1 text-xs text-green-400 font-medium text-center">
                Acesso concedido. Suas ferramentas já estão disponíveis no seu perfil.
              </p>
            </div>

            <button
              onClick={onFinish}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-lg shadow-green-500/20 transition-all active:scale-[0.98]"
            >
              Continuar ao terminal
            </button>
          </div>
        </motion.div>

        <p className="text-center text-[8px] font-mono text-gray-600 uppercase tracking-[0.3em] mt-6 opacity-60">
          RealityScan · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
