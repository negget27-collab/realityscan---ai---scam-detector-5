
import React, { useEffect, useRef, useState } from 'react';
import { AnalysisResult } from '../types';
import jsPDF from 'jspdf';
import { Download, RefreshCw, LayoutGrid, FileText } from 'lucide-react';
import { useI18n } from '../services/i18n-temp';

interface BulkSummaryProps {
  results: AnalysisResult[];
  onBack: () => void;
  onViewReport: (result: AnalysisResult) => void;
}

export const BulkSummary: React.FC<BulkSummaryProps> = ({ results, onBack, onViewReport }) => {
  const { t } = useI18n();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const totalAI = results.filter(r => r.score >= 50).length;
  const avgRisk = Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let y = margin;

      // Título
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RealityScan — Sumário de Lote Business', margin, y);
      y += 10;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y);
      y += 12;

      // Resumo
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumo', margin, y);
      y += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total de análises: ${results.length}`, margin, y);
      y += 6;
      pdf.text(`Detectados como IA: ${totalAI}`, margin, y);
      y += 6;
      pdf.text(`Risco médio: ${avgRisk}%`, margin, y);
      y += 14;

      // Tabela de resultados
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resultados', margin, y);
      y += 8;

      const contentW = pageW - margin * 2;
      const colW = { n: 8, file: contentW - 70, type: 22, score: 18, result: 22 };
      const thY = y;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('#', margin, thY);
      pdf.text('Arquivo', margin + colW.n, thY);
      pdf.text('Tipo', margin + colW.n + colW.file, thY);
      pdf.text('Score', margin + colW.n + colW.file + colW.type, thY);
      pdf.text('Resultado', margin + colW.n + colW.file + colW.type + colW.score, thY);
      y += 7;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;

      pdf.setFont('helvetica', 'normal');
      results.forEach((r, i) => {
        if (y > 270) {
          pdf.addPage();
          y = margin;
        }
        const label = r.score >= 50 ? 'IA' : 'REAL';
        const shortName = r.fileName.length > 35 ? r.fileName.slice(0, 32) + '...' : r.fileName;
        pdf.text(String(i + 1), margin, y);
        pdf.text(shortName, margin + colW.n, y);
        pdf.text(r.mediaType || '-', margin + colW.n + colW.file, y);
        pdf.text(`${r.score}%`, margin + colW.n + colW.file + colW.type, y);
        pdf.setTextColor(r.score >= 50 ? 200 : 0, r.score >= 50 ? 0 : 150, r.score >= 50 ? 0 : 100);
        pdf.text(label, margin + colW.n + colW.file + colW.type + colW.score, y);
        pdf.setTextColor(0, 0, 0);
        y += 7;
      });

      y += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('RealityScan — IA & Scan-detector', margin, y);
      pdf.text('Processamento de Alta Escala Operacional', margin, y + 5);

      pdf.save(`Sumario_Lote_RealityScan_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Falha ao gerar o PDF do sumário.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div ref={summaryRef} className="space-y-10 bg-[#030712] p-4 rounded-[2rem]">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Painel de Lote <span className="text-amber-500">Business</span></h1>
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.4em] font-black">Processamento de Alta Escala Operacional</p>
          </div>
          
          <div className="flex space-x-4">
            <div className="bg-gray-900/50 border border-white/5 p-4 rounded-2xl text-center min-w-[100px]">
              <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1">Total</p>
              <p className="text-2xl font-black text-white">{results.length}</p>
            </div>
            <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-2xl text-center min-w-[100px]">
              <p className="text-[8px] font-mono text-red-500/60 uppercase tracking-widest mb-1">Detectados</p>
              <p className="text-2xl font-black text-red-500">{totalAI}</p>
            </div>
            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl text-center min-w-[100px]">
              <p className="text-[8px] font-mono text-blue-500/60 uppercase tracking-widest mb-1">Risco Médio</p>
              <p className="text-2xl font-black text-blue-400">{avgRisk}%</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => (
            <div 
              key={result.id}
              onClick={() => onViewReport(result)}
              className="group relative bg-[#0a0f1e] border border-white/5 rounded-3xl overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all hover:scale-[1.02] shadow-xl"
            >
              {/* Media Preview Mini */}
              <div className="aspect-video w-full bg-gray-900 relative overflow-hidden">
                {result.mediaUrl ? (
                  result.mediaType === 'IMAGE' ? (
                    <img src={result.mediaUrl} alt={result.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <video src={result.mediaUrl} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-800" />
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                  <span className={`text-[8px] font-black uppercase tracking-widest ${result.score >= 50 ? 'text-red-500' : 'text-green-500'}`}>
                    {result.score >= 50 ? 'IA' : 'REAL'}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="max-w-[150px]">
                    <h3 className="text-[10px] font-black text-white uppercase truncate tracking-widest">{result.fileName}</h3>
                    <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">{result.mediaType}</p>
                  </div>
                  <span className={`text-xl font-black ${result.score >= 50 ? 'text-red-500' : 'text-green-500'}`}>
                    {result.score}%
                  </span>
                </div>
                
                <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${result.score >= 50 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${result.score}%` }}
                  ></div>
                </div>

                <button className="w-full py-2 bg-white/5 group-hover:bg-blue-600 border border-white/5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all no-print">
                  Ver Laudo Detalhado
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-10 no-print">
        <button 
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-blue-500 transition-all active:scale-95 shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isGeneratingPDF ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>{isGeneratingPDF ? 'GERANDO PDF...' : 'BAIXAR SUMÁRIO PDF'}</span>
        </button>
        <button 
          onClick={onBack}
          className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-gray-200 transition-all active:scale-95 shadow-xl"
        >
          Nova Análise em Massa
        </button>
      </div>
    </div>
  );
};
