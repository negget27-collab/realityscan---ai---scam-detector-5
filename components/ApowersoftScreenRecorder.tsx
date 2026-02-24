import React, { useEffect, useRef } from 'react';

const APOWERSOFT_SCRIPT_URL = 'https://api.apowersoft.com/screen-recorder?lang=pt';

interface ApowersoftScreenRecorderProps {
  /** Estilo do botão: ex. "recording-style-blue" */
  buttonStyle?: string;
  /** Texto no botão (ex.: "Inicie", "Gravar tela") */
  buttonText?: string;
  /** Classe CSS adicional no container */
  className?: string;
}

/**
 * Embed do Gravador de Tela da Apowersoft.
 * Gravações autorizadas pela plataforma Apowersoft; use para enviar o vídeo gerado à análise Sentry.
 * @see https://www.apowersoft.com/api/screen-recorder.html
 */
export const ApowersoftScreenRecorder: React.FC<ApowersoftScreenRecorderProps> = ({
  buttonStyle = 'recording-style-blue',
  buttonText = 'Inicie',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || scriptLoadedRef.current) return;

    const existing = document.querySelector(`script[src="${APOWERSOFT_SCRIPT_URL}"]`);
    if (existing) {
      scriptLoadedRef.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = APOWERSOFT_SCRIPT_URL;
    script.defer = true;
    script.onload = () => { scriptLoadedRef.current = true; };
    document.body.appendChild(script);
    return () => {
      // Não removemos o script ao desmontar para evitar quebrar outras instâncias
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <div className={`start-screen-recording ${buttonStyle}`}>
        <div>
          <div className="rec-dot" />
          <span>{buttonText}</span>
        </div>
      </div>
    </div>
  );
};
