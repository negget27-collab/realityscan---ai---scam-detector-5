import React, { useEffect, useState } from 'react';
import { getAnalysesHistory } from '../services/firebase';
import { auth } from '../services/firebase';
import { Database, Search, Download, FileText, ChevronRight, ArrowLeft, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { useI18n } from '../services/i18n-temp';
import { motion, AnimatePresence } from 'framer-motion';

interface BusinessDatabaseProps {
  onBack: () => void;
}

export const BusinessDatabase: React.FC<BusinessDatabaseProps> = ({ onBack }) => {
  const { t } = useI18n();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const data = await getAnalysesHistory(user.uid);
          setHistory(data);
        } catch (error) {
          console.error("Erro ao carregar histórico:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchHistory();
  }, []);

  const aiOnlyHistory = history.filter(item => item.isAI === true);
  const filteredHistory = aiOnlyHistory.filter(item => 
    item.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.verdict?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.date?.includes(searchTerm)
  );

  const exportToCSV = () => {
    const headers = ["ID", "Data", "Hora", "Arquivo", "Tipo", "Score", "IA", "Fonte", "Veredito"];
    const rows = filteredHistory.map(h => [
      h.id, h.date, h.time, h.fileName, h.mediaType, h.score, h.isAI ? "SIM" : "NÃO", h.source, h.verdict?.replace(/,/g, ';')
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `RealityScan_Database_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToTXT = (item: any) => {
    const content = `
REALITYSCAN FORENSIC REPORT
===========================
ID: ${item.id}
DATA: ${item.date}
HORA: ${item.time}
ARQUIVO: ${item.fileName || 'Sem Nome'}
TIPO: ${item.mediaType}
FONTE: ${item.source || 'TERMINAL'}

VEREDITO TÉCNICO
----------------
RISCO: ${item.score}%
STATUS: ${item.isAI ? 'IA DETECTADA' : 'AUTÊNTICO'}

ANÁLISE DETALHADA:
${item.verdict || 'Sem descrição detalhada disponível.'}

EVIDÊNCIAS ENCONTRADAS:
${item.findings?.map((f: string) => `- ${f}`).join('\n') || 'Nenhuma evidência específica listada.'}

---------------------------
Gerado em: ${new Date().toLocaleString()}
RealityScan Defense Division
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `RealityScan_Report_${item.id.slice(0,8)}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAnalyses = filteredHistory.length;
  const avgRisk = totalAnalyses > 0 
    ? Math.round(filteredHistory.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAnalyses) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 animate-in fade-in duration-700 font-sans">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <header className="mb-10">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-500 transition-colors group mb-6"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span>{t.backToTerminal}</span>
          </button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <Database className="w-7 h-7 text-blue-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tighter italic">
                  {t.databaseTitle.substring(0, 4)}<span className="text-blue-600">{t.databaseTitle.substring(4)}</span>
                </h1>
              </div>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em] font-bold">
                {t.databaseSubtitle}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:min-w-[220px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholderDb}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
              <button 
                onClick={exportToCSV}
                className="px-5 py-3.5 bg-gray-900 text-white rounded-xl flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all active:scale-[0.98] font-black text-[10px] uppercase tracking-wider"
              >
                <Download className="w-4 h-4" />
                <span>{t.exportCsv}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 font-bold">{t.totalProtocols}</p>
            <p className="text-3xl font-black text-gray-900">{totalAnalyses}</p>
            <p className="text-[9px] text-gray-400 mt-1">{t.aiAlertsStored}</p>
          </div>
          <div className="bg-red-50/80 p-6 rounded-2xl border border-red-100">
            <p className="text-[9px] font-mono text-red-500 uppercase tracking-wider mb-1 font-bold">{t.aiDetectedCard}</p>
            <p className="text-3xl font-black text-red-600">{totalAnalyses}</p>
            <p className="text-[9px] text-red-400/80 mt-1">{t.positiveScans}</p>
          </div>
          <div className="bg-blue-50/80 p-6 rounded-2xl border border-blue-100">
            <p className="text-[9px] font-mono text-blue-500 uppercase tracking-wider mb-1 font-bold">{t.avgRisk}</p>
            <p className="text-3xl font-black text-blue-600">{avgRisk}%</p>
            <p className="text-[9px] text-blue-400/80 mt-1">{t.avgOfAlerts}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest animate-pulse">{t.syncSecure}</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-600 mb-1">{t.noAiAlerts}</p>
            <p className="text-xs text-gray-400">{t.runAnalysisPrompt}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-5 py-4 text-[9px] font-black text-gray-500 uppercase tracking-wider">{t.dateTime}</th>
                    <th className="px-5 py-4 text-[9px] font-black text-gray-500 uppercase tracking-wider">{t.file}</th>
                    <th className="px-5 py-4 text-[9px] font-black text-gray-500 uppercase tracking-wider">{t.type}</th>
                    <th className="px-5 py-4 text-[9px] font-black text-gray-500 uppercase tracking-wider">{t.risk}</th>
                    <th className="px-5 py-4 text-[9px] font-black text-gray-500 uppercase tracking-wider">{t.source}</th>
                    <th className="px-5 py-4 text-[9px] font-black text-gray-500 uppercase tracking-wider text-right">{t.details}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => (
                    <tr 
                      key={item.id} 
                      className="border-b border-gray-50 hover:bg-red-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedAnalysis(item)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{item.date}</span>
                          <span className="text-xs text-gray-500">{item.time}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-red-500" />
                          </div>
                          <span className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{item.fileName || t.noName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono text-gray-500 uppercase">{item.mediaType}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${Math.min(item.score || 0, 100)}%` }}></div>
                          </div>
                          <span className="text-sm font-black text-red-600">{item.score}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono text-gray-500">{item.source || 'TERMINAL'}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="p-2 rounded-lg text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedAnalysis && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
              onClick={() => setSelectedAnalysis(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 24 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-2xl max-h-[65vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex-1 overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex justify-between items-start z-10">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-red-100 rounded-xl shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-[9px] font-mono text-red-600 uppercase tracking-wider font-bold mb-0.5">
                          {t.forensicRecord} #{selectedAnalysis.id?.slice(0, 8) || 'N/A'}
                        </p>
                        <h2 className="text-xl font-black text-gray-900 leading-tight">
                          {selectedAnalysis.fileName || t.noName}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedAnalysis.date} {t.atTime} {selectedAnalysis.time} • {selectedAnalysis.source || 'TERMINAL'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedAnalysis(null)}
                      className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-5 bg-red-50 rounded-xl border border-red-100">
                      <div>
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">{t.riskLevel}</p>
                        <p className="text-3xl font-black text-red-600">{selectedAnalysis.score}%</p>
                      </div>
                      <div className="w-32 h-2 bg-red-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full transition-all"
                          style={{ width: `${Math.min(selectedAnalysis.score || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">{t.technicalAnalysis}</h3>
                      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {selectedAnalysis.analysis || selectedAnalysis.verdict || t.noDetailedDesc}
                        </p>
                      </div>
                    </div>

                    {selectedAnalysis.findings && selectedAnalysis.findings.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">{t.evidenceLabel}</h3>
                        <ul className="space-y-2">
                          {selectedAnalysis.findings.map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                              <span className="text-sm text-gray-700">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedAnalysis.videoLink && (
                      <div>
                        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">{t.videoLinkLabel}</h3>
                        <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                          <a
                            href={selectedAnalysis.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline break-all font-medium"
                          >
                            {selectedAnalysis.videoLink}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => exportToTXT(selectedAnalysis)}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t.exportTxt}
                  </button>
                  <button 
                    onClick={() => setSelectedAnalysis(null)}
                    className="px-6 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                  >
                    {t.closeBtn}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
