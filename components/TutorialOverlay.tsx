import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Upload, Mic, Camera, Share2, ChevronRight, Sparkles } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Shield,
    title: 'Bem-vindo ao RealityScan',
    content: 'Sua proteção contra golpes, deepfakes e conteúdo gerado por IA. Analise imagens, vídeos e áudios em segundos.',
    button: 'Começar',
    accent: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Upload,
    title: 'Análise Principal',
    content: 'Arraste ou selecione fotos e vídeos para análise forense. O sistema detecta artefatos de IA, manipulações e sinais de fraude.',
    button: 'Próximo',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Share2,
    title: 'FeedScam — Monitor de Redes Sociais',
    content: 'Ative o monitor e escolha a rede (Instagram, TikTok, etc.). O miniHUD analisa seu feed em tempo real, detectando conteúdo com IA e alertando sobre possíveis golpes.',
    button: 'Continuar',
    accent: 'from-violet-500 to-purple-600',
  },
  {
    icon: Mic,
    title: 'AI Voice Forensic',
    content: 'Identifique clones de voz e deepfakes de áudio. Ideal para verificar ligações suspeitas ou áudios recebidos.',
    button: 'Próximo',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    icon: Camera,
    title: 'FaceScan & BioScan',
    content: 'Valide identidades em tempo real pela câmera. Detecte deepfakes faciais e verifique se a pessoa na tela é real.',
    button: 'Próximo',
    accent: 'from-pink-500 to-rose-600',
  },
  {
    icon: Sparkles,
    title: 'Tudo pronto!',
    content: 'Você tem 3 análises grátis. Faça upgrade para planos Advanced ou Business e desbloqueie mais recursos. Fique seguro.',
    button: 'Explorar',
    accent: 'from-blue-600 to-indigo-700',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#0a0f1e] border border-white/10 rounded-[2rem] p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-blue-500' : i < currentStep ? 'w-1.5 bg-blue-500/50' : 'w-1.5 bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={`flex justify-center`}>
            <div className={`p-5 rounded-2xl bg-gradient-to-br ${step.accent} shadow-lg`}>
              <Icon className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              {step.title}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <button
              onClick={onComplete}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Pular tutorial
            </button>
            <button
              onClick={handleNext}
              className={`flex-1 max-w-[200px] py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 bg-gradient-to-r ${step.accent} text-white hover:opacity-90`}
            >
              <span className="flex items-center justify-center gap-2">
                {step.button}
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          </div>

          <p className="text-[8px] text-gray-600 text-center">
            {currentStep + 1} de {STEPS.length}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
