import React from 'react';

interface ScannerOverlayProps {
  previewUrl?: string;
  currentStepText?: string;
  currentStep?: number;
  totalSteps?: number;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  currentStepText,
  currentStep = 0,
  totalSteps = 4,
}) => {
  const progressPercent = totalSteps > 0 ? ((currentStep + 0.5) / totalSteps) * 100 : 0;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden rounded-[3rem] pointer-events-none flex flex-col items-center justify-center">
      {/* Fundo claro */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-sm" />

      {/* Conteúdo centralizado: Analisando + barras de progresso */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-sm px-8 space-y-8">
        <p className="text-gray-900 font-semibold text-lg tracking-tight">
          Analisando
        </p>

        {/* Barra contínua */}
        <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {/* Segmentos por step */}
        <div className="w-full flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
              <div
                className={`h-full transition-all duration-500 ${
                  i < currentStep
                    ? 'bg-emerald-500 w-full'
                    : i === currentStep
                    ? 'bg-blue-500 w-2/3 animate-pulse'
                    : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {currentStepText && (
          <p className="text-gray-500 text-xs text-center max-w-xs leading-relaxed">
            {currentStepText}
          </p>
        )}
      </div>
    </div>
  );
};
