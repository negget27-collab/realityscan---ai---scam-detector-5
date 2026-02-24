import React, { useRef, useState } from 'react';
import { Shield, Image, Video, X, ChevronRight, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { AnalysisResult } from '../types';
import { getMediaProtectionState, setMediaProtectionEnabled, MEDIA_PROTECTION_CONSENT_TEXT, getFileFingerprint, wasScanned, markAsScanned } from '../services/mediaProtectionService';
import { getOrCreateDeviceId } from '../services/deviceId';

const ALERT_LABELS: Record<string, string> = {
  ai_image: 'Possível imagem gerada por IA',
  deepfake: 'Vídeo pode ser deepfake',
  metadata: 'Metadados suspeitos',
  scam_known: 'Conteúdo já usado em golpes',
  high_risk: 'Risco alto de fraude',
};

function getAlertLabel(result: AnalysisResult): string {
  if (result.score >= 80) return ALERT_LABELS.high_risk;
  if (result.isAI && result.mediaType === 'VIDEO') return ALERT_LABELS.deepfake;
  if (result.isAI) return ALERT_LABELS.ai_image;
  if (result.scamAlert?.riskLevel === 'CRITICAL') return ALERT_LABELS.scam_known;
  const v = (result.verdict || '').toLowerCase();
  if ((v.includes('metadad') || v.includes('exif')) && result.score >= 40) return ALERT_LABELS.metadata;
  return result.verdict?.slice(0, 60) || 'Análise concluída';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Extrai metadados EXIF (Layer 2). Opcional — exifr pode não estar instalado. */
async function extractMetadata(file: File): Promise<Record<string, unknown> | null> {
  try {
    const exifr = await import('exifr');
    const meta = await exifr.parse(file, { pick: ['Make', 'Model', 'DateTimeOriginal', 'Software', 'LensModel', 'ExifImageWidth', 'ExifImageHeight'] });
    return meta ? (meta as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function extractVideoFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas'));
        return;
      }
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      video.remove();
      resolve(dataUrl);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      video.remove();
      reject(new Error('Erro ao processar vídeo'));
    };
  });
}

interface MediaProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumeCredit: () => Promise<boolean>;
  onLimitReached?: () => void;
  onResult?: (result: AnalysisResult) => void;
  userId?: string | null;
  theme?: 'dark' | 'light';
}

export const MediaProtectionModal: React.FC<MediaProtectionModalProps> = ({
  isOpen,
  onClose,
  consumeCredit,
  onLimitReached,
  onResult,
  userId,
  theme = 'dark',
}) => {
  const [step, setStep] = useState<'consent' | 'scan' | 'results'>('consent');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';
  const state = getMediaProtectionState();

  const handleActivate = () => {
    setMediaProtectionEnabled(true);
    setStep('scan');
    setError(null);
  };

  const handleSkipConsent = () => {
    onClose();
  };

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowed = await consumeCredit();
    if (!allowed) {
      onLimitReached?.();
      e.target.value = '';
      return;
    }

    const validFiles = files.filter((f) => /^image\//.test(f.type) || /^video\//.test(f.type));
    if (validFiles.length === 0) {
      setError('Selecione apenas imagens ou vídeos.');
      e.target.value = '';
      return;
    }

    const toScan = validFiles.filter((f) => !wasScanned(getFileFingerprint(f)));
    const skippedCount = validFiles.length - toScan.length;
    if (toScan.length === 0) {
      setError(skippedCount > 0 ? `${skippedCount} arquivo(s) já analisado(s) anteriormente. Selecione mídias novas.` : 'Nenhum arquivo para analisar.');
      e.target.value = '';
      return;
    }

    setIsScanning(true);
    setError(null);
    setProgress({ current: 0, total: toScan.length });
    const scanResults: AnalysisResult[] = [];

    for (let i = 0; i < toScan.length; i++) {
      const file = toScan[i];
      setProgress({ current: i + 1, total: toScan.length });
      const allowedPerFile = await consumeCredit();
      if (!allowedPerFile) {
        onLimitReached?.();
        break;
      }
      try {
        let dataUrl: string;
        const mediaType = /^video\//.test(file.type) ? 'VIDEO' : 'IMAGE';
        if (mediaType === 'VIDEO') {
          dataUrl = await extractVideoFrame(file);
        } else {
          dataUrl = await readFileAsDataUrl(file);
        }

        const metadata = /^image\//.test(file.type) ? await extractMetadata(file) : null;
        const body = JSON.stringify({
          type: 'sentry',
          texto: 'Analise esta mídia. Detecte se foi gerada ou adulterada por IA, deepfake ou manipulação. Informe nível de risco e presença de IA. Considere metadados EXIF se fornecidos (ausência, software suspeito, inconsistências).',
          imagens: [dataUrl],
          userId: userId || undefined,
          deviceId: getOrCreateDeviceId(),
          metadata: metadata || undefined,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });

        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Device-Id': getOrCreateDeviceId() },
          body,
        });

        if (res.status === 403) {
          onLimitReached?.();
          break;
        }

        const data = await res.json();
        const result: AnalysisResult = {
          ...data,
          id: `mp_${Date.now()}_${i}`,
          fileName: file.name,
          mediaUrl: dataUrl,
          mediaType: mediaType as 'IMAGE' | 'VIDEO',
          score: Number(data.score) || 0,
          isAI: data.isAI ?? data.score >= 50,
        };
        scanResults.push(result);
        markAsScanned(getFileFingerprint(file));
        onResult?.(result);
      } catch (err: any) {
        setError(err.message || 'Falha ao analisar ' + file.name);
      }
    }

    setResults(scanResults);
    setIsScanning(false);
    setStep('results');
    e.target.value = '';
  };

  const handleNewScan = () => {
    setResults([]);
    setStep('scan');
    setError(null);
  };

  const handleClose = () => {
    setStep(state.enabled ? 'scan' : 'consent');
    setResults([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const bg = isLight ? 'bg-gray-50' : 'bg-[#030712]';
  const cardBg = isLight ? 'bg-white border-gray-200' : 'bg-[#0a0f1e]/90 border-white/10';
  const text = isLight ? 'text-gray-900' : 'text-gray-100';
  const muted = isLight ? 'text-gray-600' : 'text-gray-400';

  return (
    <div className={`fixed inset-0 z-[700] flex items-center justify-center p-4 ${isLight ? 'bg-black/40' : 'bg-black/90'} backdrop-blur-xl animate-in fade-in duration-300`}>
      <div className={`w-full max-w-lg ${cardBg} border rounded-[2rem] shadow-2xl overflow-hidden ${text}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <h2 className="text-sm font-black uppercase tracking-widest">Proteção Mídia</h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {step === 'consent' && (
            <>
              <div className="space-y-4">
                <p className={`text-xs ${muted} whitespace-pre-line`}>{MEDIA_PROTECTION_CONSENT_TEXT}</p>
                <p className={`text-[10px] ${muted} italic`}>
                  Transparência = aprovado nas lojas. Seu app analisa mídias para proteger contra golpes e deepfakes.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSkipConsent}
                  className="flex-1 py-3 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest hover:bg-white/5"
                >
                  Agora não
                </button>
                <button
                  onClick={handleActivate}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  Ativar proteção
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 'scan' && (
            <>
              <p className={`text-[11px] ${muted}`}>
                Selecione fotos ou vídeos da sua galeria. Analisaremos cada um em busca de IA, deepfakes e manipulações.
              </p>
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                  {error}
                </div>
              )}
              {isScanning ? (
                <div className="py-8 flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Analisando {progress.current} de {progress.total}...
                  </p>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-2xl border-2 border-dashed border-blue-500/40 hover:border-blue-500/70 hover:bg-blue-500/5 flex flex-col items-center gap-3 transition-all"
                >
                  <div className="flex gap-4">
                    <Image className="w-10 h-10 text-blue-400" />
                    <Video className="w-10 h-10 text-blue-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Selecionar mídias</span>
                  <span className="text-[9px] text-gray-500">Imagens e vídeos</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleSelectFiles}
              />
            </>
          )}

          {step === 'results' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest">Resultados</h3>
                <button
                  onClick={handleNewScan}
                  className="text-[9px] font-black uppercase text-blue-400 hover:text-blue-300"
                >
                  Nova análise
                </button>
              </div>
              {results.length === 0 ? (
                <p className={`text-[10px] ${muted} text-center py-6`}>Nenhum resultado.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {results.map((r) => {
                    const isRisky = r.score >= 50 || r.isAI;
                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-xl border ${
                          isRisky ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {r.mediaUrl && (
                            <img
                              src={r.mediaUrl}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-gray-500 truncate">{r.fileName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {isRisky ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span className={`text-[10px] font-bold ${isRisky ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {getAlertLabel(r)}
                              </span>
                            </div>
                            <p className="text-[9px] text-gray-500 mt-1">
                              Risco {r.score}% • {r.confidence}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
