import React from 'react';

export const TermsOfUse: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const isLight = theme === 'light';
  return (
    <div className="space-y-6 pb-20 animate-in slide-in-from-right-10 duration-500">
      <div className={`rounded-[2.5rem] p-8 md:p-12 space-y-10 font-medium leading-relaxed shadow-2xl overflow-hidden relative ${isLight ? 'bg-white border border-gray-200 text-gray-600' : 'bg-[#0a0f1e] border border-white/5 text-gray-400'}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0"></div>

        <section className="space-y-4">
          <h3 className={`font-black text-sm uppercase tracking-widest flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <span className="w-8 h-[1px] bg-blue-500 mr-3"></span>
            1. Aceitação dos Termos
          </h3>
          <p className="text-xs">Ao acessar e utilizar o NGT, você declara ter lido, compreendido e aceitado integralmente estes Termos de Serviço. O uso de nossas ferramentas de análise forense implica na concordância com todos os protocolos de segurança e diretrizes operacionais aqui estabelecidos.</p>
        </section>

        <section className="space-y-4">
          <h3 className={`font-black text-sm uppercase tracking-widest flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <span className="w-8 h-[1px] bg-blue-500 mr-3"></span>
            2. Natureza da Tecnologia (IA Probabilística)
          </h3>
          <p className="text-xs">O NGT utiliza redes neurais avançadas para detecção de anomalias sintéticas. <strong>É fundamental compreender que os resultados são probabilidades estatísticas e não verdades absolutas.</strong> A IA pode apresentar falsos positivos ou negativos. Nossos relatórios são ferramentas de auxílio à decisão e não constituem prova pericial jurídica definitiva.</p>
        </section>

        <section className="space-y-4">
          <h3 className={`font-black text-sm uppercase tracking-widest flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <span className="w-8 h-[1px] bg-blue-500 mr-3"></span>
            3. Responsabilidade sobre Conteúdo
          </h3>
          <p className="text-xs">O usuário assume total responsabilidade legal pelas mídias (fotos, vídeos e áudios) submetidas ao sistema. É estritamente proibido o uso da plataforma para fins de assédio, difamação, "revenge porn" (deepnudes) ou qualquer atividade ilícita. A Defense Division colaborará com autoridades em caso de uso criminoso comprovado.</p>
        </section>

        <section className="space-y-4">
          <h3 className={`font-black text-sm uppercase tracking-widest flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <span className="w-8 h-[1px] bg-blue-500 mr-3"></span>
            4. Privacidade e LGPD (Biometria)
          </h3>
          <p className="text-xs">Dados biométricos faciais e harmônicos de voz são processados temporariamente para a execução do escaneamento. Em conformidade com a LGPD, mídias originais não são armazenadas permanentemente em nossos servidores após a conclusão da análise, a menos que o usuário opte por salvá-las em seu histórico criptografado pessoal.</p>
        </section>

        <section className="space-y-4">
          <h3 className={`font-black text-sm uppercase tracking-widest flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <span className="w-8 h-[1px] bg-blue-500 mr-3"></span>
            5. Assinaturas e Pagamentos
          </h3>
          <p className="text-xs">Planos Advanced e Business oferecem recursos estendidos e maior prioridade de processamento. Assinaturas são renovadas automaticamente via Mercado Pago. O usuário pode cancelar a renovação a qualquer momento através da central de gerenciamento, mantendo o acesso até o fim do ciclo vigente.</p>
        </section>

        <section className="space-y-4">
          <h3 className={`font-black text-sm uppercase tracking-widest flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <span className="w-8 h-[1px] bg-blue-500 mr-3"></span>
            6. Limitação de Responsabilidade
          </h3>
          <p className="text-xs">A Defense Division e o sistema NGT não se responsabilizam por danos diretos ou indiretos, perdas financeiras decorrentes de golpes digitais não identificados, ou decisões críticas tomadas exclusivamente com base nos laudos gerados pelo sistema.</p>
        </section>

        <p className="text-center text-[7px] font-mono text-gray-700 uppercase tracking-widest pt-8 border-t border-white/5">
          NGT Legal Department // Case ID: {Math.random().toString(36).substring(7).toUpperCase()}
        </p>
      </div>
    </div>
  );
};
