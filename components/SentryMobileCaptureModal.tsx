import React, { useRef, useState } from 'react';
import { Camera, Image, X } from 'lucide-react';

interface SentryMobileCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (imageDataUrl: string) => void;
  consumeCredit: () => Promise<boolean>;
  onLimitReached?: () => void;
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const SentryMobileCaptureModal: React.FC<SentryMobileCaptureModalProps> = ({
  isOpen,
  onClose,
  onImageSelected,
  consumeCredit,
  onLimitReached,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError('Selecione uma imagem (JPG, PNG, etc.).');
      return;
    }
    const allowed = await consumeCredit();
    if (!allowed) {
      onLimitReached?.();
      return;
    }
    setIsScanning(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onImageSelected(dataUrl);
      onClose();
    } catch {
      setError('Falha ao ler o arquivo.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const allowed = await consumeCredit();
    if (!allowed) {
      onLimitReached?.();
      return;
    }
    setIsScanning(true);
    setError(null);
    try {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) throw new Error('Canvas');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      onImageSelected(dataUrl);
      stopCamera();
      onClose();
    } catch (err) {
      setError('Falha ao capturar foto.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0a0f1e] border border-blue-500/30 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-black text-white uppercase tracking-widest pr-10">Analisar imagem</h3>
        <p className="text-[10px] text-gray-400">Envie uma captura do feed ou tire uma foto para análise.</p>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
            {error}
          </div>
        )}

        {!isCameraActive ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-blue-400 disabled:opacity-50"
            >
              <Image className="w-8 h-8" />
              <span className="text-[10px] font-black uppercase">Galeria</span>
            </button>
            <button
              onClick={startCamera}
              disabled={isScanning}
              className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-blue-400 disabled:opacity-50"
            >
              <Camera className="w-8 h-8" />
              <span className="text-[10px] font-black uppercase">Câmera</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2">
              <button onClick={stopCamera} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-400 text-[10px] font-black uppercase">
                Voltar
              </button>
              <button
                onClick={handleCapturePhoto}
                disabled={isScanning}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase disabled:opacity-50"
              >
                {isScanning ? 'Analisando...' : 'Capturar e analisar'}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
