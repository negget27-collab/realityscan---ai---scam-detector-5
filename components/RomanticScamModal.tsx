
import React from 'react';

interface RomanticScamModalProps {
  onClose: () => void;
  onActivate?: () => void;
}

export const RomanticScamModal: React.FC<RomanticScamModalProps> = ({ onClose, onActivate }) => {
  const handleConfirm = () => {
    if (onActivate) onActivate();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
      <div className="w-full max-w-3xl max-h-[90vh] relative bg-[#020617] rounded-[3rem] border border-pink-500/40 shadow-[0_0_120px_rgba(219,39,119,0.25)] overflow-hidden flex flex-col">
        
        {/* Top Decorative Scanning Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 overflow-hidden">
          <div className="h-full bg-pink-500 w-1/3 animate-[slide_3s_linear_infinite] shadow-[0_0_15px_#db2777]"></div>
        </div>
        
        <style>{`
          @keyframes slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
          .forensic-grid {
            background-image: radial-gradient(rgba(219, 39, 119, 0.1) 1px, transparent 1px);
            background-size: 30px 30px;
          }
        `}</style>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 md:p-14 space-y-12 forensic-grid">
          
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-pink-600/20 border border-pink-500/30 rounded-full">
                  <span className="text-[10px] font-mono text-pink-500 uppercase tracking-[0.4em] font-black">Protocolo Sentry v2.0.8</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-ping"></div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-pink-500/60 uppercase tracking-[0.5em] mb-1">Manual de Defesa Contra Fraudes</p>
                <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-tight">
                  Golpes <span className="text-pink-500">Emotivos</span>
                </h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-1 gap-12 text-gray-400">
            
            {/* Seção 1: Anatomia do Golpe */}
            <section className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-600/10 border border-pink-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest">ANATOMIA DO GOLPE</h3>
              </div>
              <p className="text-sm leading-relaxed border-l-2 border-pink-500/30 pl-6 py-1">
                O "Estelionato Sentimental" evoluiu. Criminosos agora utilizam <span className="text-white font-bold">GANs (Generative Adversarial Networks)</span> para criar identidades perfeitas. Eles não apenas roubam fotos; eles as <span className="text-pink-400 italic">inventam</span> para que não possam ser encontradas em buscas reversas comuns. O objetivo é a <span className="text-white font-bold">extorsão financeira gradual</span> através da criação de um vínculo neural de confiança.
              </p>
            </section>

            {/* Seção 2: Tecnologia RealityScan */}
            <section className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <svg className="w-32 h-32 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001z" />
                 </svg>
               </div>
               <h3 className="text-sm font-black text-pink-500 uppercase tracking-[0.3em]">MÉTODOS DE DETECÇÃO FORENSE</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <p className="text-[11px] font-black text-white uppercase tracking-wider">Identificação de Artefatos GAN</p>
                   <p className="text-[11px] leading-relaxed opacity-70">Nossa IA busca por assimetrias de pupila e inconsistências em acessórios (brincos, óculos) que modelos neurais frequentemente falham em renderizar com precisão física.</p>
                 </div>
                 <div className="space-y-2">
                   <p className="text-[11px] font-black text-white uppercase tracking-wider">Mapeamento de Contexto</p>
                   <p className="text-[11px] leading-relaxed opacity-70">Analisamos a profundidade de campo e o ruído digital do fundo. Em montagens de IA, o sujeito e o cenário possuem "assinaturas de sensor" divergentes.</p>
                 </div>
               </div>
            </section>

            {/* Seção 3: Sinais de Alerta Críticos */}
            <section className="space-y-8">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center">
                <span className="w-10 h-[1px] bg-pink-500 mr-4"></span>
                SINAIS DE ALERTA (RED FLAGS)
              </h3>
              <div className="space-y-4">
                {[
                  { title: "PERFEIÇÃO TÓXICA", desc: "Fotos que parecem ter iluminação de estúdio profissional em contextos cotidianos (ex: cozinhando ou caminhando)." },
                  { title: "CARREIRAS DE DISTÂNCIA", desc: "Sempre alegam ser militares, engenheiros em plataformas de petróleo ou médicos em missões da ONU." },
                  { title: "FOBIA DE VÍDEO", desc: "A câmera 'sempre quebra' ou a conexão é 'instável demais' para chamadas de vídeo ao vivo." },
                  { title: "PEDIDOS DE EMERGÊNCIA", desc: "Taxas alfandegárias para presentes, cirurgias urgentes de parentes ou problemas com cartões bloqueados." }
                ].map((item, i) => (
                  <div key={i} className="flex space-x-4 group p-4 rounded-2xl hover:bg-pink-600/5 transition-all">
                    <span className="text-pink-500 font-black text-lg font-mono">0{i+1}</span>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">{item.title}</p>
                      <p className="text-xs font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Estatísticas e Footer Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "VÍTIMAS/ANO", val: "4.2M+" },
                { label: "PRECISÃO IA", val: "99.2%" },
                { label: "PERDA MÉDIA", val: "R$ 12k" },
                { label: "AGENTES ATIVOS", val: "124" }
              ].map((stat, i) => (
                <div key={i} className="p-4 border border-white/5 rounded-2xl text-center bg-black/40">
                  <p className="text-[8px] font-mono text-gray-600 uppercase mb-1 font-black">{stat.label}</p>
                  <p className="text-sm font-black text-white">{stat.val}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Action Footer */}
        <div className="p-8 md:p-12 bg-[#020617] border-t border-white/5 flex flex-col items-center space-y-4">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest text-center">
            A ATIVAÇÃO DO MODO SENTRY AUMENTA O CONSUMO DE TOKENS DEVIDO À ANÁLISE PROFUNDA
          </p>
          <button 
            onClick={handleConfirm}
            className="w-full py-6 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black uppercase tracking-[0.4em] text-[12px] transition-all active:scale-[0.98] shadow-[0_20px_40px_rgba(219,39,119,0.3)]"
          >
            CONFIRMAR ENTENDIMENTO E ATIVAR
          </button>
        </div>
      </div>
    </div>
  );
};
