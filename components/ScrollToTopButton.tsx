import React, { useState, useEffect } from 'react';

export const ScrollToTopButton: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const btnCls = theme === 'light'
    ? 'bg-white border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-500 shadow-lg'
    : 'bg-[#0a0f1e] border-white/10 text-gray-400 hover:border-blue-500 hover:text-blue-400';

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Voltar ao topo"
      className={`fixed bottom-8 right-8 z-[200] p-3 border rounded-xl transition-all duration-500 group active:scale-90 ${btnCls} ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
};
