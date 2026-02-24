import React, { useState } from 'react';
import { BusinessDatabase } from './BusinessDatabase';
import { ContractDocsPage } from './ContractDocsPage';
import { Database, FileCheck } from 'lucide-react';

interface BusinessPanelProps {
  onBack: () => void;
  onGoToScan?: () => void;
}

type BusinessSection = 'database' | 'contracts';

export const BusinessAdminPanel: React.FC<BusinessPanelProps> = ({ onBack }) => {
  const [section, setSection] = useState<BusinessSection>('database');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSection('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              section === 'database' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Database
          </button>
          <button
            onClick={() => setSection('contracts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              section === 'contracts' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Documentação de Contratos
          </button>
        </div>
        {section === 'database' && <BusinessDatabase onBack={onBack} />}
        {section === 'contracts' && <ContractDocsPage onBack={() => setSection('database')} theme="light" />}
      </div>
    </div>
  );
};
