
import React, { useRef, useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { ScannerOverlay } from './ScannerOverlay';
import { getOrCreateDeviceId } from '../services/deviceId';

interface FaceScanModalProps {
  onClose: () => void;
  onComplete: (result: AnalysisResult) => void;
  consumeCredit: () => Promise<boolean>;
  onLimitReached?: () => void;
  isCurrentlyBusiness?: boolean;
  userId?: string;
}

export const FaceScanModal: React.FC<FaceScanModalProps> = ({ onClose, onComplete, consumeCredit, onLimitReached, isCurrentlyBusiness = false, userId }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const allowed = await consumeCredit();
    if (!allowed) { onLimitReached?.(); return; }
    
    setIsScanning(true);
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const base64 = canvasRef.current.toDataURL('image/jpeg');
    
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Device-Id": getOrCreateDeviceId() },
        body: JSON.stringify({
          type: 'recon',
          imagem: base64,
          userId: userId,
          deviceId: getOrCreateDeviceId()
        })
      });

      if (response.status === 403) {
        onLimitReached?.();
        const err = await response.json();
        throw new Error(err.error || "Créditos insuficientes");
      }

      const result = await response.json();
      
      onComplete({
        ...result,
        fileName: 'facescan_recon.jpg',
        mediaUrl: base64,
        mediaType: 'IMAGE'
      });
    } catch (err: any) {
      setError(err.message || "Falha no reconhecimento biométrico.");
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="w-full max-w-2xl relative bg-[#01040a] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.2)] border border-white/5">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">BioScan Protocol</h2>
            <p className={`text-[9px] font-mono uppercase tracking-[0.4em] font-black ${isCurrentlyBusiness ? 'text-amber-500' : 'text-blue-500'}`}>
              Identity Reconnaissance // Active
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera Display */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {error ? (
            <div className="p-10 text-center space-y-4">
              <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400 text-sm font-bold uppercase tracking-widest">{error}</p>
              <button onClick={startCamera} className="px-6 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest">Tentar Novamente</button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scan HUD Decor */}
              <div className="absolute inset-0 border-[20px] border-black/40 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-blue-500/30 rounded-[3rem] pointer-events-none">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
              </div>
            </>
          )}

          {isScanning && (
            <div className="absolute inset-0 z-50">
              <ScannerOverlay />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.4em] font-black">Pesquisando OSINT & Biometria...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-10 bg-[#0a0f1e]/50 border-t border-white/5 space-y-6">
          <div className="flex items-center space-x-4 opacity-50">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] font-black">Aguardando enquadramento facial ótimo</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={captureAndScan}
              disabled={!isCameraActive || isScanning}
              className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-[0.98] shadow-2xl ${
                isCurrentlyBusiness 
                  ? 'bg-amber-600 text-black hover:bg-amber-500 shadow-amber-500/20' 
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Executar Varredura Facial
            </button>
          </div>
          
          <p className="text-center text-[8px] font-mono text-gray-700 uppercase tracking-widest">
            A pesquisa visual completa utiliza agentes DAI v3.0 // RealityScan Global Recon
          </p>
        </div>
      </div>
    </div>
  );
};
