/**
 * Documentação para Contratos Assinados com Empresas
 * Sistema com agentes especializados + checklist baseado em documentação oficial (CND, INSS, FGTS, INPI, JUCEB, etc.)
 */
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { FileCheck, Shield, FileText, PenTool, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';

/** Checklist completo pesquisado: documentação necessária para contratos com empresas no Brasil */
const DOC_CHECKLIST = {
  certidoes: {
    title: 'Certidões e Regularidade Fiscal',
    items: [
      'Certidão de Regularidade Fiscal (CND) – Receita Federal e PGFN',
      'Certidão do INSS – regularidade previdenciária',
      'Certidão do FGTS – quitação do fundo de garantia',
      'Certidão Negativa de Débitos Trabalhistas – Justiça do Trabalho',
      'Comprovante de Situação Cadastral no CNPJ (Receita Federal)',
    ],
  },
  contratoAnexos: {
    title: 'Contrato e Anexos',
    items: [
      'Contrato digitalizado a partir do original assinado',
      'Formulário de Requerimento preenchido (quando exigido registro)',
      'Guia de Recolhimento da União (GRU) com comprovante de pagamento',
      'Procuração com outorga de poderes específicos (se aplicável)',
      'Tradução juramentada para documentos em idioma estrangeiro',
      'Declaração de autenticidade das cópias (advogado, contador ou técnico contábil)',
    ],
  },
  assinaturas: {
    title: 'Assinaturas e Autenticação',
    items: [
      'Contrato assinado fisicamente ou digitalmente (e-CPF/e-CNPJ)',
      'Autenticação por profissional competente (advogado, contador ou técnico contábil) com certificado digital, quando exigido',
      'Protocolo junto ao órgão competente (INPI, JUCEB, etc.) quando for o caso',
    ],
  },
  documentosPessoais: {
    title: 'Documentos dos Sócios/Responsáveis (quando aplicável)',
    items: [
      'RG e CPF atualizados (situação regular na Receita)',
      'Comprovante de residência (últimos 90 dias)',
      'Certidão de estado civil (casamento, nascimento ou averbação)',
    ],
  },
};

interface ContractDocsPageProps {
  onBack: () => void;
  companyName?: string;
  theme?: 'dark' | 'light';
}

export const ContractDocsPage: React.FC<ContractDocsPageProps> = ({
  onBack,
  companyName = 'Empresa Contratada',
  theme = 'dark',
}) => {
  const [customName, setCustomName] = useState(companyName);
  const [isGenerating, setIsGenerating] = useState(false);
  const isLight = theme === 'light';

  const generatePDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 25;
      const lineH = 6;
      const titleH = 8;

      // Capa
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Documentação para Contratos', margin, y);
      y += titleH;
      doc.text('Assinados com Empresas', margin, y);
      y += lineH * 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Contratante / Razão Social: ${customName || '—'}`, margin, y);
      y += lineH;
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y);
      y += lineH * 2;
      doc.setFontSize(10);
      doc.text('Este documento consolida o checklist de documentação necessária com base em exigências da Receita Federal, INSS, FGTS, Justiça do Trabalho, INPI e órgãos de registro empresarial.', margin, y, { maxWidth: pageW - 2 * margin });
      y += lineH * 4;

      const addSection = (title: string, items: string[]) => {
        if (y > 260) {
          doc.addPage();
          y = 25;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, y);
        y += lineH + 2;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        items.forEach((item) => {
          if (y > 275) {
            doc.addPage();
            y = 25;
          }
          doc.text(`• ${item}`, margin + 3, y);
          y += lineH;
        });
        y += lineH;
      };

      addSection(DOC_CHECKLIST.certidoes.title, DOC_CHECKLIST.certidoes.items);
      addSection(DOC_CHECKLIST.contratoAnexos.title, DOC_CHECKLIST.contratoAnexos.items);
      addSection(DOC_CHECKLIST.assinaturas.title, DOC_CHECKLIST.assinaturas.items);
      addSection(DOC_CHECKLIST.documentosPessoais.title, DOC_CHECKLIST.documentosPessoais.items);

      // Rodapé última página
      if (y > 250) doc.addPage();
      y = 270;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Gerado pelo sistema de Documentação de Contratos — Portal Corporativo. Consulte sempre um advogado ou contador para a documentação específica do seu caso.', margin, y, { maxWidth: pageW - 2 * margin });

      doc.save(`Documentacao_Contratos_${(customName || 'Empresa').replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={isLight ? 'bg-white text-gray-900' : ''}>
      <button
        onClick={onBack}
        className={`mb-6 flex items-center gap-2 text-[10px] font-black uppercase transition-colors ${isLight ? 'text-gray-600 hover:text-amber-600' : 'text-gray-500 hover:text-amber-500'}`}
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao painel
      </button>

      <div className="space-y-8">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-tight mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Documentação para Contratos Assinados
          </h2>
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Checklist e procedimentos com base em exigências da Receita Federal, INSS, FGTS, Justiça do Trabalho, INPI e órgãos de registro. Use os agentes abaixo para organizar a documentação e gere o PDF para anexar ao processo.
          </p>
        </div>

        <div className={`rounded-xl border p-4 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
            Razão social / nome da empresa (para o PDF)
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Ex: Empresa XYZ Ltda"
            className={`w-full max-w-md px-4 py-2.5 rounded-xl border text-sm font-medium ${isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white placeholder-gray-500'}`}
          />
        </div>

        {/* Agentes especializados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-6 rounded-2xl border ${isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>Agente Certidões</h3>
            </div>
            <p className={`text-[10px] ${isLight ? 'text-amber-800/80' : 'text-amber-300/90'}`}>
              CND, INSS, FGTS, Débitos Trabalhistas e Situação Cadastral CNPJ.
            </p>
            <ul className="mt-3 space-y-1.5">
              {DOC_CHECKLIST.certidoes.items.slice(0, 3).map((item, i) => (
                <li key={i} className={`flex items-start gap-2 text-[10px] ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`p-6 rounded-2xl border ${isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>Agente Contrato e Anexos</h3>
            </div>
            <p className={`text-[10px] ${isLight ? 'text-amber-800/80' : 'text-amber-300/90'}`}>
              Contrato digitalizado, GRU, procuração, tradução e declaração de autenticidade.
            </p>
            <ul className="mt-3 space-y-1.5">
              {DOC_CHECKLIST.contratoAnexos.items.slice(0, 3).map((item, i) => (
                <li key={i} className={`flex items-start gap-2 text-[10px] ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`p-6 rounded-2xl border ${isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <PenTool className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>Agente Assinaturas</h3>
            </div>
            <p className={`text-[10px] ${isLight ? 'text-amber-800/80' : 'text-amber-300/90'}`}>
              Assinatura física ou digital (e-CPF/e-CNPJ) e autenticação por profissional competente.
            </p>
            <ul className="mt-3 space-y-1.5">
              {DOC_CHECKLIST.assinaturas.items.map((item, i) => (
                <li key={i} className={`flex items-start gap-2 text-[10px] ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Checklist completo colapsável */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <div className={`px-6 py-4 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
            <h3 className={`text-sm font-black uppercase flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              <FileCheck className="w-5 h-5 text-amber-500" />
              Checklist completo da documentação necessária
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {Object.entries(DOC_CHECKLIST).map(([key, { title, items }]) => (
              <div key={key}>
                <h4 className={`text-xs font-black uppercase mb-2 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>{title}</h4>
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[11px] ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
                      <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Gerar documentação em PDF
              </>
            )}
          </button>
          <p className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
            O PDF inclui capa, checklist completo e referência às fontes (Receita, INSS, FGTS, INPI, JUCEB).
          </p>
        </div>
      </div>
    </div>
  );
};
