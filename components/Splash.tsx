import React, { useEffect, useState } from 'react';

interface SplashProps {
  onEnter: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onEnter }) => {
  const [loading, setLoading] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoading(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#030712] flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(37,99,235,0.08),transparent)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
        <div className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        <div className="absolute inset-x-0 top-3/4 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        <div className="absolute inset-y-0 left-1/4 w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
        <div className="absolute inset-y-0 right-1/4 w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        {/* Logo */}
        <div className="mb-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl" />
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-white/10">
              <svg className="w-14 h-14 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title - alinhamento único */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both w-full max-w-xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-sm leading-tight text-center">
            <span className="block text-gray-400 font-medium">- - - IA & Scan detector</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">RealityScan</span>
          </h1>
        </div>

        {/* Loading */}
        <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <div className="flex justify-between items-baseline font-mono text-[10px] uppercase tracking-widest">
            <span className="text-gray-500">inicializando</span>
            <span className="text-blue-400 tabular-nums font-bold">{loading}%</span>
          </div>
          <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-gray-900/70 border border-white/[0.08]">
            {/* Track gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-800/50 to-gray-900/50" />
            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-150 ease-out overflow-hidden"
              style={{ width: `${loading}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-1/2" />
              {/* Glow tip */}
              <div className="absolute right-0 top-0 bottom-0 w-3 min-w-[12px] bg-gradient-to-l from-cyan-400/80 to-transparent rounded-r-full" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-4 bg-white/60 rounded-full blur-sm -mr-1" />
            </div>
          </div>
          {loading === 100 && (
            <p className="text-center text-[10px] font-mono text-emerald-400 animate-in fade-in duration-500 flex items-center justify-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SISTEMA PRONTO
            </p>
          )}
        </div>

        {/* Button */}
        <button
          onClick={onEnter}
          disabled={loading < 100}
          className={`mt-10 group relative px-10 py-3.5 rounded-full font-bold tracking-widest text-sm uppercase transition-all duration-500 ${
            loading === 100
              ? 'opacity-100 translate-y-0 bg-white text-gray-900 hover:bg-blue-500 hover:text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:scale-105'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            Iniciar
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-gray-600 tracking-widest uppercase">
        v2.0.4
      </div>
    </div>
  );
}
