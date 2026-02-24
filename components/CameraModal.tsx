
import React, { useRef, useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { ScannerOverlay } from './ScannerOverlay';
import { Camera, Video, X, Zap, RefreshCw, Circle, Download, Brain, FileText } from 'lucide-react';
import { getOrCreateDeviceId } from '../services/deviceId';

interface CameraModalProps {
  onClose: () => void;
  onComplete: (result: AnalysisResult) => void;
  consumeCredit: () => Promise<boolean>;
  onLimitReached?: () => void;
  userId?: string;
}

/** Extrai um frame do vídeo para análise (frame do meio) */
const extractVideoFrame = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.onloadeddata = () => {
      const dur = video.duration;
      video.currentTime = (dur && !isNaN(dur)) ? dur * 0.5 : 0;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas')); return; }
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Video load')); };
    video.src = url;
  });
};

export const CameraModal: React.FC<CameraModalProps> = ({ onClose, onComplete, consumeCredit, onLimitReached, userId }) => {
  const [mode, setMode] = useState<'PHOTO' | 'VIDEO'>('PHOTO');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [lastRecordingBlob, setLastRecordingBlob] = useState<Blob | null>(null);
  const [lastMediaDataUrl, setLastMediaDataUrl] = useState<string | null>(null);
  const [lastMediaType, setLastMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
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

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const allowed = await consumeCredit();
    if (!allowed) { onLimitReached?.(); return; }

    setIsScanning(true);
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setLastMediaDataUrl(base64);
    setLastMediaType('IMAGE');
    setLastRecordingBlob(null);
    await sendForAnalysis(base64, 'IMAGE');
  };

  const startRecording = async () => {
    if (!videoRef.current?.srcObject) return;
    
    const allowed = await consumeCredit();
    if (!allowed) { onLimitReached?.(); return; }

    chunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setLastRecordingBlob(blob);
      setLastMediaType('VIDEO');
      try {
        const frameBase64 = await extractVideoFrame(blob);
        setLastMediaDataUrl(frameBase64);
        await sendForAnalysis(frameBase64, 'VIDEO');
      } catch (err) {
        setError('Falha ao extrair frame do vídeo.');
        setIsScanning(false);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const sendForAnalysis = async (mediaData: string, type: 'IMAGE' | 'VIDEO') => {
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Device-Id": getOrCreateDeviceId() },
        body: JSON.stringify({
          type: 'camera',
          imagem: mediaData,
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
      setAnalysisResult({
        ...result,
        fileName: type === 'IMAGE' ? 'capture.jpg' : 'capture.webm',
        mediaUrl: mediaData,
        mediaType: type
      });
    } catch (err: any) {
      setError(err.message || "Falha na análise da mídia.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownload = () => {
    if (lastRecordingBlob && lastMediaType === 'VIDEO') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(lastRecordingBlob);
      a.download = `RealityScan_Captura_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (lastMediaDataUrl && lastMediaType === 'IMAGE') {
      const a = document.createElement('a');
      a.href = lastMediaDataUrl;
      a.download = `RealityScan_Captura_${Date.now()}.jpg`;
      a.click();
    }
  };

  const handleFinish = () => {
    if (analysisResult) {
      let mediaUrl = lastMediaDataUrl || analysisResult.mediaUrl;
      if (lastMediaType === 'VIDEO' && lastRecordingBlob) {
        mediaUrl = URL.createObjectURL(lastRecordingBlob);
      }
      onComplete({
        ...analysisResult,
        mediaUrl,
        mediaType: lastMediaType || analysisResult.mediaType
      });
    }
  };

  const handleNewCapture = () => {
    setAnalysisResult(null);
    setLastRecordingBlob(null);
    setLastMediaDataUrl(null);
    setLastMediaType(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="w-full h-full md:h-auto md:max-w-4xl relative bg-[#01040a] md:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.2)] border border-white/5 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-500" />
              Captura Forense
            </h2>
            <p className="text-[8px] font-mono uppercase tracking-[0.4em] font-black text-blue-500/60">
              Media Acquisition Protocol // {mode} Mode
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Camera Display */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-400 text-sm font-bold uppercase tracking-widest max-w-xs mx-auto">{error}</p>
              <button onClick={startCamera} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                Tentar Novamente
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover" 
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-[1px] border-white/10"></div>
                
                {/* Corner Accents */}
                <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-blue-500/50"></div>
                <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-blue-500/50"></div>
                <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-blue-500/50"></div>
                <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-blue-500/50"></div>

                {/* Center Reticle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-white/20"></div>
                  <div className="absolute w-[1px] h-full bg-white/20"></div>
                </div>

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 rounded-full flex items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">REC {formatTime(recordingTime)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {isScanning && (
            <div className="absolute inset-0 z-50">
              <ScannerOverlay />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.4em] font-black">Agentes de raciocínio analisando...</p>
                </div>
              </div>
            </div>
          )}

          {/* Painel de resultados dos agentes de raciocínio */}
          {analysisResult && !isScanning && (
            <div className="absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
              <div className="flex items-center gap-2 p-4 border-b border-white/10">
                <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40">
                  <Brain className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Leitura da Situação</h3>
                  <p className="text-[9px] text-gray-500 font-mono">Agentes Gemini + OpenRouter</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">Nível de Risco</p>
                    <p className={`text-2xl font-black ${(analysisResult.score || 0) >= 50 ? 'text-red-500' : 'text-green-500'}`}>{analysisResult.score}%</p>
                  </div>
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${(analysisResult.score || 0) >= 50 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(analysisResult.score || 0, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">Análise</p>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                    {analysisResult.verdict || analysisResult.analysis || 'Sem análise detalhada.'}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center justify-center gap-2 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Download className="w-4 h-4" />
                  Baixar ({lastMediaType === 'VIDEO' ? 'Vídeo' : 'Foto'})
                </button>
                <button
                  onClick={handleFinish}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-2 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Ver Relatório Completo
                </button>
                <button
                  onClick={handleNewCapture}
                  className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Nova Captura
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={`p-8 md:p-12 bg-black border-t border-white/5 transition-opacity ${analysisResult ? 'hidden' : ''}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Mode Switcher */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
              <button 
                onClick={() => setMode('PHOTO')}
                disabled={isRecording || isScanning}
                className={`px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'PHOTO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Camera className="w-4 h-4" />
                Foto
              </button>
              <button 
                onClick={() => setMode('VIDEO')}
                disabled={isRecording || isScanning}
                className={`px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'VIDEO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Video className="w-4 h-4" />
                Vídeo
              </button>
            </div>

            {/* Main Action Button */}
            <div className="relative">
              {mode === 'PHOTO' ? (
                <button 
                  onClick={capturePhoto}
                  disabled={!isCameraActive || isScanning}
                  className="w-20 h-20 rounded-full border-4 border-white/20 p-1 hover:border-blue-500 transition-all active:scale-90 group"
                >
                  <div className="w-full h-full rounded-full bg-white group-hover:bg-blue-500 transition-colors flex items-center justify-center">
                    <Zap className="w-8 h-8 text-black" />
                  </div>
                </button>
              ) : (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isCameraActive || isScanning}
                  className={`w-20 h-20 rounded-full border-4 p-1 transition-all active:scale-90 group ${isRecording ? 'border-red-500/50' : 'border-white/20 hover:border-red-500'}`}
                >
                  <div className={`w-full h-full rounded-full transition-all flex items-center justify-center ${isRecording ? 'bg-red-600 scale-75 rounded-lg' : 'bg-white group-hover:bg-red-600'}`}>
                    {isRecording ? null : <Circle className="w-8 h-8 text-black fill-current" />}
                  </div>
                </button>
              )}
            </div>

            {/* Flip Camera / Help */}
            <div className="flex items-center gap-4">
              <button className="p-4 bg-white/5 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all">
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="hidden md:block text-right">
                <p className="text-[9px] font-black text-white uppercase tracking-widest">Qualidade: 1080p</p>
                <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest mt-1">H.264 / AAC Encoding</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
