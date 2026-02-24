import React from 'react';
import { Shield, Mail, ExternalLink } from 'lucide-react';
import { useI18n } from '../services/i18n-temp';
import { footerLinks, type ViewType } from './footerLinks';

interface AppFooterProps {
  onNavigate: (view: ViewType) => void;
  onOpenLanguage?: () => void;
  variant?: 'dark' | 'light';
}

export const AppFooter: React.FC<AppFooterProps> = ({ onNavigate, onOpenLanguage, variant = 'dark' }) => {
  const { lang, t } = useI18n();
  const links = footerLinks[lang] || footerLinks.PT;

  const isDark = variant === 'dark';
  const textMuted = isDark ? 'text-gray-500 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600';
  const textStrong = isDark ? 'text-gray-300' : 'text-gray-800';
  const borderCls = isDark ? 'border-white/5' : 'border-gray-200';
  const bgCls = isDark ? 'bg-[#030712]/50' : 'bg-gray-50';

  return (
    <footer className={`mt-20 border-t ${borderCls} ${bgCls}`}>
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <span className={`text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Reality<span className="text-blue-500">Scan</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest max-w-[200px]">
              {t.defenseDivision} // 2025
            </p>
            {onOpenLanguage && (
              <button
                onClick={onOpenLanguage}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-blue-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {t.language}
              </button>
            )}
          </div>

          {/* Product */}
          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${textStrong} mb-4`}>{links.product.title}</h4>
            <ul className="space-y-3">
              {links.product.links.map((item) => (
                <li key={item.label}>
                  {'view' in item ? (
                    <button onClick={() => onNavigate(item.view)} className={`text-[11px] font-bold ${textMuted} transition-colors flex items-center gap-1.5`}>
                      {item.label}
                    </button>
                  ) : (
                    <a href={(item as any).href} target="_blank" rel="noopener noreferrer" className={`text-[11px] font-bold ${textMuted} transition-colors flex items-center gap-1.5`}>
                      {(item as any).label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${textStrong} mb-4`}>{links.company.title}</h4>
            <ul className="space-y-3">
              {links.company.links.map((item) => (
                <li key={item.label}>
                  {'view' in item ? (
                    <button onClick={() => onNavigate(item.view)} className={`text-[11px] font-bold ${textMuted} transition-colors flex items-center gap-1.5`}>
                      {item.label}
                    </button>
                  ) : (
                    <a href={(item as any).href} target="_blank" rel="noopener noreferrer" className={`text-[11px] font-bold ${textMuted} transition-colors flex items-center gap-1.5`}>
                      {(item as any).label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-6">
            <div>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${textStrong} mb-4`}>{links.legal.title}</h4>
              <ul className="space-y-3">
                {links.legal.links.map((item) => (
                  <li key={item.label}>
                    <a href={(item as any).href} className={`text-[11px] font-bold ${textMuted} transition-colors flex items-center gap-1.5`}>
                      {(item as any).label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${textStrong} mb-4`}>{links.support.title}</h4>
              <ul className="space-y-3">
                {links.support.links.map((item) => (
                  <li key={item.label}>
                    <a href={(item as any).href} className={`text-[11px] font-bold ${textMuted} transition-colors flex items-center gap-1.5`}>
                      {(item as any).label}
                      <Mail className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={`mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em]">
            © 2025 RealityScan. {lang === 'PT' ? 'Todos os direitos reservados.' : lang === 'ES' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
              {lang === 'PT' ? 'Criptografia ativa' : lang === 'ES' ? 'Cifrado activo' : 'Active encryption'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Sistema operacional" />
          </div>
        </div>
      </div>
    </footer>
  );
};
