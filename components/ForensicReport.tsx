
import { getI18n } from '../services/i18n-temp';
import { saveFeedback } from '../services/firebase';

import React, { useRef, useEffect, useState } from 'react';
import { AnalysisResult } from '../types';
import jsPDF from 'jspdf';
import { Download, Share2, RefreshCw, FileText, MessageSquare, CheckCircle2 } from 'lucide-react';
import { VideoPlayerWithControls } from './VideoPlayerWithControls';

const PDF_ENABLED_KEY = 'rs_business_pdf_enabled';

interface ForensicReportProps {
  result: AnalysisResult;
  onReset: () => void;
  mediaPreview: { url: string, type: 'IMAGE' | 'VIDEO' | 'AUDIO' } | null;
  userLang?: string;
  userId?: string;
  isBusinessPlan?: boolean;
}

export const ForensicReport: React.FC<ForensicReportProps> = ({ result, onReset, mediaPreview, userLang = 'PT', userId, isBusinessPlan }) => {
  const isAI = result.score >= 50;
  const pdfEnabled = !isBusinessPlan || localStorage.getItem(PDF_ENABLED_KEY) === 'true';
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'FALSE_POSITIVE' | 'FALSE_NEGATIVE' | 'OTHER' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const t = getI18n(userLang);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 18;
      let y = 20;
      const lineH = 6;
      const addText = (text: string, fontSize = 10, isBold = false) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = pdf.splitTextToSize(text, pageW - margin * 2);
        lines.forEach((line: string) => {
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.text(line, margin, y);
          y += lineH;
        });
      };
      const addSpace = (n = 1) => { y += lineH * n; };

      addText('RELATÓRIO FORENSE REALITYSCAN', 16, true);
      addSpace(2);
      addText(`Protocolo: ${result.id || 'N/A'} | Data: ${new Date().toLocaleString('pt-BR')}`, 9);
      addSpace(2);
      addText(`Veredito: ${isAI ? t.probableAI : t.probableReal}`, 12, true);
      addText(`${t.riskScore}: ${result.score}%`, 11);
      addSpace(2);

      if (mediaPreview?.type === 'IMAGE' && mediaPreview.url) {
        try {
          let imgData = mediaPreview.url;
          if (mediaPreview.url.startsWith('blob:')) {
            const resp = await fetch(mediaPreview.url);
            const blob = await resp.blob();
            imgData = await new Promise<string>((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(r.result as string);
              r.onerror = rej;
              r.readAsDataURL(blob);
            });
          }
          const imgFormat = imgData.includes('image/png') ? 'PNG' : 'JPEG';
          const imgW = pageW - margin * 2;
          const imgH = Math.min(60, imgW * 0.75);
          if (y + imgH > 270) { pdf.addPage(); y = 20; }
          pdf.addImage(imgData, imgFormat, margin, y, imgW, imgH);
          y += imgH + lineH;
        } catch (_) {}
      } else if (mediaPreview?.type === 'VIDEO') {
        addText(`${t.reportFileName}: ${result.fileName || '—'}`, 9);
        if (mediaPreview?.url && !mediaPreview.url.startsWith('blob:')) {
          addText(`Link: ${mediaPreview.url}`, 8);
        }
        addSpace(1);
      }

      addText(t.evidence, 10, true);
      result.findings.forEach((f) => addText(`• ${f}`));
      addSpace(2);
      const fullAnalysis = result.analysis || result.verdict || '';
      if (fullAnalysis) {
        addText(t.reportForensicDetailed, 10, true);
        addSpace(1);
        addText(fullAnalysis, 9);
      }
      if (result.groundingLinks && result.groundingLinks.length > 0) {
        addSpace(2);
        addText(t.verificationSources, 10, true);
        result.groundingLinks.slice(0, 5).forEach((l) => {
          addText(`• ${l.title}`, 8);
          addText(`  ${l.uri}`, 7);
        });
      }
      pdf.save(`Relatorio_RealityScan_${result.id || 'scan'}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Falha ao gerar o PDF do relatório.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    const verdict = isAI ? t.probableAI : t.probableReal;
    const shareText = `RELATÓRIO FORENSE REALITYSCAN\n\n` +
      `Veredito: ${verdict}\n` +
      `Probabilidade de IA: ${result.score}%\n` +
      `ID do Protocolo: ${result.id || 'N/A'}\n\n` +
      `Analise suas mídias com precisão forense no RealityScan!`;
    
    const shareUrl = window.location.origin; 
    
    const shareData = {
      title: 'RealityScan - Relatório de Autenticidade',
      text: shareText,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nLink: ${shareUrl}`);
        alert('Resumo do relatório copiado para a área de transferência!');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        await navigator.clipboard.writeText(`${shareText}\n\nLink: ${shareUrl}`);
        alert('Resumo do relatório copiado para a área de transferência!');
      }
    }
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto min-h-screen bg-gradient-to-b from-[#030712] via-[#050a18] to-[#030712] flex flex-col font-sans animate-in fade-in duration-700">
      <div ref={reportRef} className="flex-grow space-y-10 px-6 pt-4 pb-20">
        <div className="relative w-full rounded-[2rem] overflow-hidden border border-white/10 bg-gray-900/50 shadow-2xl shadow-blue-500/5 ring-1 ring-white/5">
          {mediaPreview?.type === 'IMAGE' ? (
            <div className="aspect-[4/3] w-full">
              <img src={mediaPreview.url} alt="Analysed" className="w-full h-full object-cover" />
            </div>
          ) : mediaPreview?.type === 'VIDEO' ? (
            <div className="aspect-video w-full">
              <VideoPlayerWithControls src={mediaPreview.url} className="w-full h-full aspect-video" />
            </div>
          ) : (
            <div className="aspect-[4/3] w-full flex items-center justify-center bg-blue-600/5">
              <FileText className="w-20 h-20 text-blue-500 opacity-20" />
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h3 className="text-gray-400 font-bold text-sm">{t.riskScore}</h3>
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">ID: {result.id || 'N/A'}</p>
            {result.confidence && (
              <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                result.confidence === 'HIGH' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                result.confidence === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {result.confidence === 'HIGH' ? 'Alta confiança' : result.confidence === 'MEDIUM' ? 'Confiança média' : 'Baixa confiança'}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`text-7xl md:text-8xl font-black tracking-tighter ${isAI ? 'text-red-500' : 'text-green-500'}`}>
              {result.score}%
            </div>
            <p className="text-[9px] text-gray-500 font-medium">prob. IA</p>
          </div>
        </div>

       <div className="space-y-6 pt-6">
  <h3 className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em]">
    {t.evidence}
  </h3>

  <ul className="space-y-6">
    {result.findings.map((finding, idx) => (
      <li key={idx} className="flex space-x-6">
        <span className="text-blue-500 font-black text-xl leading-none">&gt;</span>
        <p className="text-gray-400 text-sm leading-relaxed font-medium">
          {finding}
        </p>
      </li>
    ))}
  </ul>

  {/* Informações do protocolo (substitui relatório duplicado) */}
  <div className="space-y-4 pt-10 border-t border-white/5">
    <h3 className="text-amber-500 font-black text-[10px] uppercase tracking-[0.4em]">
      {t.reportMetadata}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-[#0a0f1e] border border-white/5 rounded-xl p-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{t.reportProtocolId}</p>
        <p className="text-gray-300 text-sm font-mono truncate">{result.id || "N/A"}</p>
      </div>
      <div className="bg-[#0a0f1e] border border-white/5 rounded-xl p-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{t.reportMediaType}</p>
        <p className="text-gray-300 text-sm">{result.mediaType || result.fileName?.split(".").pop()?.toUpperCase() || "—"}</p>
      </div>
      <div className="bg-[#0a0f1e] border border-white/5 rounded-xl p-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{t.reportConfidence}</p>
        <p className="text-gray-300 text-sm">{result.confidence || "—"}</p>
      </div>
      <div className="bg-[#0a0f1e] border border-white/5 rounded-xl p-4 sm:col-span-2">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{t.reportFileName}</p>
        <p className="text-gray-300 text-sm truncate">{result.fileName || "—"}</p>
      </div>
    </div>
    {result.scamAlert && (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <p className="text-[9px] text-amber-400 uppercase tracking-widest mb-1">{result.scamAlert.type}</p>
        <p className="text-gray-300 text-sm">{result.scamAlert.description}</p>
      </div>
    )}
  </div>
</div>


        {result.groundingLinks && result.groundingLinks.length > 0 && (
          <div className="space-y-6 pt-10 border-t border-white/5">
            <h3 className="text-gray-600 font-black text-[9px] uppercase tracking-[0.4em]">
              {t.verificationSources}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {result.groundingLinks.map((link, idx) => (
                <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="block p-5 bg-[#0a0f1e]/60 border border-white/5 rounded-[1.5rem] hover:border-blue-500 transition-all">
                  <p className="text-[11px] font-black text-white uppercase truncate">{link.title}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="pt-12 space-y-4 no-print">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <button onClick={handleDownloadPDF} disabled={isGeneratingPDF || !pdfEnabled} title={!pdfEnabled ? 'Ative o relatório PDF no Painel Business' : undefined} className="w-full sm:w-auto px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center space-x-2 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {isGeneratingPDF ? (
                   <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                   <Download className="w-4 h-4" />
                )}
                <span>{isGeneratingPDF ? t.generating : t.downloadPdf}</span>
             </button>
             <button onClick={onReset} className="w-full sm:w-auto px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center space-x-2 hover:bg-blue-500 transition-all">
                <RefreshCw className="w-4 h-4" />
                <span>{t.newAnalysis}</span>
             </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <button onClick={handleShare} className="w-full sm:w-auto px-12 py-5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center space-x-2 hover:bg-amber-500/20 transition-all">
                <Share2 className="w-4 h-4" />
                <span>{t.share}</span>
             </button>
             
             <button 
               onClick={() => setIsFeedbackOpen(true)} 
               className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center space-x-2 hover:bg-white/10 transition-all"
             >
                <MessageSquare className="w-4 h-4" />
                <span>{t.reportErrorBtn}</span>
             </button>
          </div>
        </div>

        {/* Feedback Modal */}
        {isFeedbackOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#0a0f1e] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
              {feedbackSubmitted ? (
                <div className="text-center space-y-4 py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">{t.feedbackSent}</h3>
                  <p className="text-gray-400 text-sm">{t.feedbackThanks}</p>
                  <button 
                    onClick={() => { setIsFeedbackOpen(false); setFeedbackSubmitted(false); }}
                    className="mt-6 px-10 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    {t.close}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">{t.reportAnalysis}</h3>
                    <p className="text-gray-400 text-xs">{t.reportAnalysisDesc}</p>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => setFeedbackType('FALSE_POSITIVE')}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${feedbackType === 'FALSE_POSITIVE' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest">{t.falsePositive}</p>
                      <p className="text-[9px] opacity-60">{t.falsePositiveDesc}</p>
                    </button>
                    
                    <button 
                      onClick={() => setFeedbackType('FALSE_NEGATIVE')}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${feedbackType === 'FALSE_NEGATIVE' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest">{t.falseNegative}</p>
                      <p className="text-[9px] opacity-60">{t.falseNegativeDesc}</p>
                    </button>
                    
                    <button 
                      onClick={() => setFeedbackType('OTHER')}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${feedbackType === 'OTHER' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest">{t.otherReason}</p>
                      <p className="text-[9px] opacity-60">{t.otherReasonDesc}</p>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t.additionalContext}</label>
                    <textarea 
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Ex: Eu mesmo gravei este vídeo ontem..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none h-24 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setIsFeedbackOpen(false)}
                      className="flex-1 py-4 bg-white/5 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      disabled={!feedbackType || isSubmittingFeedback}
                      onClick={async () => {
                        if (!feedbackType) return;
                        setIsSubmittingFeedback(true);
                        try {
                          await saveFeedback(userId || 'guest', result.id || 'unknown', {
                            type: feedbackType,
                            comment: feedbackText,
                            score: result.score,
                            verdict: result.verdict
                          });
                          setFeedbackSubmitted(true);
                        } catch (err) {
                          alert('Erro ao enviar feedback.');
                        } finally {
                          setIsSubmittingFeedback(false);
                        }
                      }}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                    >
                      {isSubmittingFeedback ? t.sending : t.send}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};