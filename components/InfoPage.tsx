import { auth } from "../services/firebase";
import { peekReferralCode } from "../services/referralService";
import React, { useState, useEffect } from "react";
import { PlanConfig } from "../types";
import { Shield, Zap, Briefcase, Lock, CreditCard, CheckCircle, Handshake, Code2, Key, BarChart3 } from 'lucide-react';
import { useI18n } from "../services/i18n-temp";
import { getPlanPrice, getCreditsPrice, getFromPriceText, getPerScanText } from "../services/priceConverter";

interface InfoPageProps {
  onBack: () => void;
  plans: PlanConfig[];
  onSelectPlan: (plan: PlanConfig) => void;
  purchasedPlanId?: string | null;
  onDevApiClick?: () => void;
  onApiPlansClick?: () => void;
  theme?: 'dark' | 'light';
}

export const InfoPage: React.FC<InfoPageProps> = ({
  onBack,
  plans,
  onSelectPlan,
  purchasedPlanId,
  onDevApiClick,
  onApiPlansClick,
  theme = 'dark',
}) => {
  const { lang, t } = useI18n();
  const handleSelect = (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (plan) onSelectPlan(plan);
  };

  const handleCredits = (pack: { amount: number, price: string, id: string }) => {
    onSelectPlan({
      id: pack.id,
      level: "Créditos Avulsos",
      name: `${pack.amount} Scans`,
      price: getCreditsPrice(lang as 'PT' | 'EN' | 'ES', pack.id),
      description: "Créditos que não expiram para uso sob demanda.",
      features: [`${pack.amount} ANÁLISES FORENSES`, "SEM VALIDADE", "ATIVAÇÃO IMEDIATA"],
      cta: "Comprar Agora",
      colorClass: "bg-purple-600",
      type: "credits",
      amount: pack.amount
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const isAdvancedActive = purchasedPlanId?.startsWith('advanced');
  const isBusinessActive = purchasedPlanId?.startsWith('business');
  const isLivreActive = !purchasedPlanId || purchasedPlanId === 'community' || purchasedPlanId === 'free';

  const creditPacks = [
  { amount: 5, price: getCreditsPrice(lang as 'PT' | 'EN' | 'ES', "credits_5"), id: "credits_5" },
  { amount: 20, price: getCreditsPrice(lang as 'PT' | 'EN' | 'ES', "credits_20"), id: "credits_20" },
  { amount: 50, price: getCreditsPrice(lang as 'PT' | 'EN' | 'ES', "credits_50"), id: "credits_50" }
];
     
const comprarCreditos = async (planId: string) => {
  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Faça login primeiro");
      return;
    }

    const res = await fetch("/api/criar-pagamento", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user.uid,
        planId: planId,
        referralCode: peekReferralCode()
      })
    });

    const data = await res.json();
    console.log("BACKEND:", data);

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      alert("Erro ao gerar pagamento");
      console.log(data);
    }

  } catch (err) {
    console.error("ERRO:", err);
    alert("Erro ao gerar pagamento");
  }
};





  const isLight = theme === 'light';

  const freeFeatureKeys: (keyof typeof t)[] = ['featureFreeScans', 'featureImageAnalysis', 'featureFaceScan', 'featureLimitedChat', 'featureSimpleReport'];
  const advancedFeatureKeys: (keyof typeof t)[] = ['feature80Scans', 'featureAntiRomance', 'featureDaiPrecision', 'featurePrioritySupport', 'featureModeratedChatVideos'];
  const businessFeatureKeys: (keyof typeof t)[] = ['feature200Scans', 'featureJudicialReports', 'featurePdfReports', 'featureBusinessPanel', 'featureDatabase', 'featureBlockchainAudit', 'featureScansPerUpload', 'featureModeratedChatVideos'];

      return (
    <div className={`font-sans selection:bg-blue-600 animate-in fade-in duration-700 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
      <div className="w-full max-w-[90rem] mx-auto px-4 md:px-8 lg:px-12 space-y-12 pb-20">

        <div className="text-center space-y-4">
          <h2 className={`text-3xl font-black uppercase tracking-widest italic ${isLight ? 'text-gray-900' : 'text-white'}`}>🔵 {t.monthlySubscription}</h2>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>{t.autoRecurrence}</p>
        </div>

        {/* Grid de Planos - Aproveitamento do espaço lateral */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-stretch p-3 md:p-4 lg:p-5 rounded-xl ${isLight ? 'bg-gray-50/80' : 'bg-white/[0.02]'}`}>
          
          {/* CARD 01: LIVRE */}
          <div className={`flex flex-col p-6 rounded-3xl border backdrop-blur-xl transition-all duration-500 relative group ${isLight ? 'bg-gray-100/90 border-gray-200 hover:border-gray-300' : 'border-white/5 bg-[#0a0f1e]/60 hover:border-white/20'}`}>
            <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
              <Shield className="w-12 h-12 text-pink-500" />
            </div>
            <div className="mb-3 space-y-1">
              <p className={`text-[7px] font-mono uppercase tracking-[0.2em] font-black ${isLight ? 'text-gray-500' : 'text-gray-600'}`}>{t.levelFree}</p>
              <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-pink-500">{t.planNameLivre}</h2>
            </div>
            <p className={`text-[10px] leading-relaxed font-medium mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{t.idealCasual}</p>
            <ul className="flex-grow space-y-2 mb-6">
              {freeFeatureKeys.map((key, i) => (
                <li key={i} className={`flex items-start space-x-2 text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                  <svg className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  <span>{t[key]}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto space-y-3">
              <h3 className={`text-xl font-black tracking-tighter italic uppercase ${isLight ? 'text-gray-900' : 'text-white'}`}>{t.planNameLivre}</h3>
              <button disabled className={`w-full py-2.5 border rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] ${isLight ? 'bg-gray-200/80 border-gray-200 text-gray-500' : 'bg-[#1e293b]/50 border-white/5 text-gray-500'}`}>
                {isLivreActive ? t.planActive : t.available}
              </button>
            </div>
          </div>

          {/* CARD 02: ADVANCED */}
          <div className="flex flex-col p-6 rounded-3xl bg-[#3b82f6] shadow-[0_40px_80px_-15px_rgba(59,130,246,0.3)] transition-all duration-500 relative z-10 border border-white/20 group">
            <div className="absolute bottom-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
              <Zap className="w-16 h-16 text-white" />
            </div>
            <div className="absolute top-4 right-4 bg-white text-blue-600 text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-xl">{t.mostPopular}</div>
            
            <div className="mb-3 space-y-1">
              <p className="text-[7px] font-mono text-white/70 uppercase tracking-[0.2em] font-black">{t.levelAdvanced}</p>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic">{t.planNameAdvanced}</h2>
            </div>

            <p className="text-[10px] text-white leading-relaxed font-bold mb-4">{t.fullProtection}</p>
            
            <ul className="flex-grow space-y-2 mb-6">
              {advancedFeatureKeys.map((key, i) => (
                <li key={i} className="flex items-start space-x-2 text-[8px] font-black uppercase tracking-widest text-white">
                  <svg className="w-3 h-3 text-white/80 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  <span>{t[key]}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-xl font-black text-white tracking-tighter italic uppercase">{getPlanPrice(lang as 'PT' | 'EN' | 'ES', 'advanced')}</h3>
                  <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">{t.monthly}</p>
                </div>
              </div>
              <button 
                onClick={isAdvancedActive ? undefined : () => onSelectPlan({ ...plans[1], type: 'subscription' })} 
                disabled={isAdvancedActive || isBusinessActive}
                className={`w-full py-2.5 border rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${
                  isAdvancedActive 
                  ? 'bg-blue-900/40 border-blue-400 text-blue-100' 
                  : isBusinessActive
                    ? 'bg-blue-900/10 border-blue-800 text-blue-400 opacity-50'
                    : 'bg-white/10 hover:bg-white/20 border-white/30 text-white'
                }`}
              >
                {isAdvancedActive ? t.planActive : isBusinessActive ? t.upgradeComplete : t.signMonthly}
              </button>
            </div>
          </div>

          {/* CARD 03: BUSINESS */}
          <div className={`flex flex-col p-6 rounded-3xl border transition-all duration-500 shadow-2xl relative overflow-hidden group ${isLight ? 'border-amber-400/40 bg-amber-50/80 hover:border-amber-500/60' : 'border-amber-500/20 bg-[#0a0f1e] hover:border-amber-500/40'}`}>
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Briefcase className="w-32 h-32 text-amber-500" />
            </div>
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-blue-600/20 border border-blue-500/40 text-blue-400 text-[7px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-2xl backdrop-blur-md z-20">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{t.badgeCorp}</span>
            </div>
            
            <div className="mb-3 space-y-1">
              <p className={`text-[7px] font-mono uppercase tracking-[0.2em] font-black ${isLight ? 'text-gray-600' : 'text-gray-600'}`}>{t.levelBusiness}</p>
              <h2 className={`text-xl md:text-2xl font-black tracking-tighter uppercase italic ${isLight ? 'text-gray-900' : 'text-white'}`}>{t.planNameBusiness}</h2>
            </div>
            
            <p className={`text-[10px] leading-relaxed font-medium mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{t.maxSecurity}</p>
            
            <ul className="flex-grow space-y-2 mb-6">
              {businessFeatureKeys.map((key, i) => (
                <li key={i} className={`flex items-start space-x-2 text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                  <svg className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  <span>{t[key]}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className={`text-xl font-black tracking-tighter italic uppercase ${isLight ? 'text-gray-900' : 'text-white'}`}>{getPlanPrice(lang as 'PT' | 'EN' | 'ES', 'business')}</h3>
                  <p className={`text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>{t.monthly}</p>
                </div>
              </div>
              <button 
                onClick={isBusinessActive ? undefined : () => onSelectPlan({ ...plans[2], type: 'subscription' })} 
                disabled={isBusinessActive}
                className={`w-full py-2.5 border rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${
                  isBusinessActive
                  ? 'bg-amber-900/40 border-amber-500 text-amber-500'
                  : isLight
                    ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white'
                    : 'bg-[#1e293b]/30 border-white/10 hover:border-blue-500 text-white'
                }`}
              >
                {isBusinessActive ? t.planActive : t.requestMonthly}
              </button>
            </div>
          </div>

        </div>

{/* ================= CREDITOS ================= */}
<div className="mt-16 w-full">

<h2 className={`text-2xl font-bold text-center mb-6 ${isLight ? 'text-gray-900' : ''}`}>
⚡ {t.creditsSection}
</h2>

<div className="grid md:grid-cols-3 gap-4 lg:gap-6">

{creditPacks.map((item,i)=>(

<div key={i}
className={`rounded-xl p-4 lg:p-6 text-center transition flex flex-col ${isLight ? 'bg-white border border-gray-200 hover:border-purple-400 shadow-sm' : 'bg-[#0b1120]/80 border border-white/10 hover:border-purple-500/40'}`}>

  <div className={`text-4xl font-bold ${isLight ? 'text-gray-900' : ''}`}>{item.amount}</div>
  <div className={isLight ? 'text-gray-600' : 'text-gray-400'}>{t.scansLabel}</div>

  <div className="text-2xl font-bold text-purple-500 mt-4">
    {item.price}
  </div>

  <button
    onClick={()=>handleCredits(item)}
    className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:scale-105 transition font-black uppercase text-[10px] tracking-widest"
  >
    {t.buyNow}
  </button>

</div>
))}

</div>
</div>

        {/* Seção API para Desenvolvedores */}
        <div className={`relative overflow-hidden rounded-2xl p-5 md:p-6 space-y-4 border ${isLight ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200' : 'bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-purple-600/10 border-blue-500/30'}`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-8 h-8 text-blue-400" />
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest">{t.newBadge}</span>
              </div>
              <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tight italic ${isLight ? 'text-gray-900' : 'text-white'}`}>{t.apiForDevelopers}</h2>
              <p className={`text-[11px] leading-relaxed max-w-xl ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                {t.apiForDevelopersDesc} {t.apiPlansInfo}
              </p>
              <ul className="flex flex-wrap gap-2">
                <li className={`flex items-center gap-1.5 text-[9px] ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  <Key className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t.apiKeySecure}</span>
                </li>
                <li className={`flex items-center gap-1.5 text-[9px] ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t.apiConsumptionLogs}</span>
                </li>
              </ul>
              <div className="flex gap-2 mt-2">
                {onDevApiClick && (
                  <>
                    <button
                      onClick={onDevApiClick}
                      className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25"
                    >
                      {t.devPanel}
                    </button>
                    {onApiPlansClick && (
                      <button
                        onClick={onApiPlansClick}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 shadow-md' : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'}`}
                      >
                        {t.viewApiPlans}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className={`flex-shrink-0 p-4 rounded-2xl font-mono text-[8px] overflow-x-auto max-w-full ${isLight ? 'bg-gray-100 border border-gray-200 text-gray-600' : 'bg-black/30 border border-white/5 text-gray-400'}`}>
              <p className="text-blue-400 mb-2">POST /api/v1/generate | /api/v1/analyze | /api/v1/voice</p>
              <pre className="whitespace-pre-wrap break-all">{`fetch(".../api/v1/generate", {
  headers: { "x-api-key": "sk_live_xxx" },
  body: JSON.stringify({ prompt: "..." })
})`}</pre>
            </div>
          </div>
        </div>
  




        {/* Checkout Seguro & Global - apenas descrições, sem containers */}
          <div className={`pt-8 border-t ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
            <div className="text-center mb-6">
              <h3 className={`text-xl md:text-2xl font-black uppercase italic tracking-tighter mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>{t.secureCheckout}</h3>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>{t.encryptedProcessing}</p>
            </div>

            <div className={`space-y-4 max-w-2xl mx-auto text-center ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              <p className="text-[11px] leading-relaxed">
                <span className="font-black text-[#009ee3]">{t.mercadoPago}</span> — BRL • Brasil. {t.mercadoPagoDesc} {t.mpFeatures}
              </p>
              <p className="text-[11px] leading-relaxed">
                <span className="font-black text-[#0070ba]">{t.paypalGlobal}</span> — USD • Global. {t.paypalDesc} {t.ppFeatures}
              </p>
              <p className="text-[11px] leading-relaxed">
                <span className={`font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>{t.totalSecurity}</span> — {t.ssl256}. {t.noDataRetention}. {t.activation60s}
              </p>
            </div>
          </div>
        


        

        <div className="pt-4 text-center opacity-5">
           <p className="text-[7px] font-mono uppercase tracking-[1.5em] font-black">RealityScan Defense Division // 2025</p>
        </div>

      </div>
    </div>
  );
};
