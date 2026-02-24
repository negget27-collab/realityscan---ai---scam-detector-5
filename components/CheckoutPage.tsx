import React, { useState } from "react";
import { db } from "../services/firebase";
import { useI18n } from "../services/i18n-temp";
import { doc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { peekReferralCode, clearReferralCode } from "../services/referralService";

interface CheckoutPageProps {
  plan: any;
  userId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function CheckoutPage({ plan, userId, onBack, onSuccess }: CheckoutPageProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);

  const handlePagar = async (gateway: 'mercadopago' | 'paypal' = 'mercadopago') => {
    if (!userId || userId === 'guest') {
      alert("Por favor, faça login com sua conta Google para realizar o upgrade.");
      return;
    }

    try {
      setLoading(true);
      setServerOffline(false);

      if (gateway === 'paypal') {
        const response = await fetch("/api/criar-pagamento-paypal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            planId: plan?.id,
            type: plan?.type || 'subscription',
            amount: plan?.amount,
            referralCode: peekReferralCode()
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || `Erro ${response.status}`);
        if (data.approveUrl) {
          window.location.href = data.approveUrl;
          return;
        }
        throw new Error("Link de checkout PayPal não recebido.");
      }

      const response = await fetch("/api/criar-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          planId: plan?.id,
          type: plan?.type || 'subscription',
          amount: plan?.amount,
          referralCode: peekReferralCode()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const data = await response.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("Link de checkout não recebido.");
      }
    } catch (err: any) {
      console.error("Falha ao conectar com server.js:", err.message);
      setServerOffline(true);
      if (err.message?.includes("PayPal não configurado")) {
        alert("PayPal ainda não está configurado. Use Mercado Pago ou configure PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET no servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSimularSucesso = async () => {
    if (!userId || userId === 'guest') {
      console.warn("Simulation attempted without valid userId");
      return;
    }
    
    console.log("Simulating success for user:", userId, "Plan:", plan);
    setLoading(true);
    try {
      const userRef = doc(db, "users", userId);
      
      if (plan.type === 'subscription') {
        const monthlyCredits = plan.id === 'business' ? 200 : 80;
        console.log("Updating subscription plan:", plan.id, "Credits:", monthlyCredits);
        await setDoc(userRef, {
          planId: plan.id,
          monthlyCredits: monthlyCredits,
          subscriptionActive: true,
          premium: true,
          subscriptionId: 'SIMULATED-' + Date.now(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else if (plan.type === 'credits') {
        console.log("Adding credits:", plan.amount);
        await setDoc(userRef, {
          credits: increment(plan.amount),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      console.log("Firestore update successful, triggering onSuccess");
      onSuccess();
    } catch (err) {
      console.error("Erro ao simular sucesso:", err);
      alert("Falha ao atualizar dados no Firebase durante simulação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#f8fafc] flex flex-col font-sans overflow-y-auto">
      {/* Header Estilo Print */}
      <header className="bg-[#009ee3] py-6 flex flex-col items-center justify-center text-center shadow-md relative">
        <button
          onClick={onBack}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black text-[10px] uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          {t.back}
        </button>
        <h1 className="text-white text-3xl font-black tracking-tighter uppercase italic">{t.finishPurchase}</h1>
        <p className="text-white/90 text-[11px] font-bold uppercase tracking-[0.25em] -mt-1">{t.realityScanForensics}</p>
      </header>

      <main className="w-full max-w-4xl mx-auto p-5 md:p-8 lg:px-12 space-y-6 animate-in fade-in duration-500">
        
        {/* Resumo do Plano - apenas texto */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-black text-gray-900 leading-none">{plan?.type === 'credits' ? t.creditsPackLabel : (plan?.level || t.levelAdvanced)}</h2>
            <p className="text-[10px] font-black text-[#22c55e] uppercase tracking-widest mt-1">{t.ready}</p>
          </div>
          <p className="text-[#2563eb] text-xl font-black">{plan?.price || "R$ 26,90"}</p>
        </div>

        {serverOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-3 text-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h4 className="text-xs font-black uppercase tracking-widest">{t.serverOfflineTitle}</h4>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {t.serverOfflineDesc}
            </p>
            <button 
              onClick={handleSimularSucesso}
              className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-amber-600 transition-all"
            >
              {t.simulateSuccessDemo}
            </button>
          </div>
        )}

        {/* Gateways */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.05)] border border-gray-100 space-y-4">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">{t.choosePaymentMethod}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handlePagar('mercadopago')}
              disabled={loading}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-[#009ee3] bg-[#009ee3]/5 hover:bg-[#009ee3]/15 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#009ee3]/30 border-t-[#009ee3] rounded-full animate-spin" />
                </div>
              ) : (
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none"><path d="M15.245 17.831h-2.733l1.231-7.484h2.732l-1.23 7.484zm5.492 0h-2.735l1.23-7.484h2.735l-1.23 7.484zm-5.241-9.276c.063-.378 0-.644-.523-.644h-1.769l-.623 3.769h1.47c.544 0 .944-.114 1.077-.644l.358-2.481zm-4.231 3.445l.407-2.481c.045-.227-.029-.378-.313-.378H8.307l-.772 4.639h2.211l.874-5.276.407-2.481h2.04l-1.54 7.757H9.169l-.772 4.639h2.211l.874-5.276z" fill="#009ee3"/></svg>
              )}
              <div className="text-left">
                <span className="block text-sm font-black text-gray-900">Mercado Pago</span>
                <span className="text-[9px] text-gray-500">{t.mpPaymentOptions}</span>
              </div>
            </button>
            <button
              onClick={() => handlePagar('paypal')}
              disabled={loading}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-[#003087] bg-[#003087]/5 hover:bg-[#003087]/15 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#003087]/30 border-t-[#003087] rounded-full animate-spin" />
                </div>
              ) : (
                <svg className="w-10 h-10" viewBox="0 0 24 24"><path fill="#003087" d="M7.076 21.337H2.47a.641.641 0 0 1-.635-.54L0 4.924a.64.64 0 0 1 .635-.641h4.018c1.907 0 3.406.44 4.381 1.302.876.773 1.318 1.884 1.318 3.267 0 1.383-.442 2.494-1.318 3.267-.975.862-2.474 1.302-4.381 1.302H3.492l-.444 2.706h4.028a.641.641 0 0 1 .635.54l.397 2.419a.64.64 0 0 1-.635.641zm2.5-12.2c.238-.238.553-.357.946-.357h2.551c1.907 0 3.406.44 4.381 1.302.876.773 1.318 1.884 1.318 3.267 0 1.383-.442 2.494-1.318 3.267-.975.862-2.474 1.302-4.381 1.302h-2.551a1.303 1.303 0 0 1-.946-.357l-.397 2.419a.64.64 0 0 1-.635.54H4.018a.641.641 0 0 1-.635-.54L2.47 4.924a.64.64 0 0 1 .635-.641h8.5c.393 0 .708.119.946.357.238.238.357.553.357.946v.397c0 .393-.119.708-.357.946a1.303 1.303 0 0 1-.946.357H9.076l-.444 2.706h2.551c.393 0 .708.119.946.357.238.238.357.553.357.946v.397c0 .393-.119.708-.357.946z"/></svg>
              )}
              <div className="text-left">
                <span className="block text-sm font-black text-gray-900">PayPal</span>
                <span className="text-[9px] text-gray-500">{t.paypalPaymentOptions}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Info de Criptografia - apenas texto */}
        <p className="text-center text-sm text-gray-500 font-medium px-4">
          {t.encryptedTransactionMsg}
        </p>

        {/* Botão Voltar */}
        <div className="space-y-4 pt-2">
          <button 
            onClick={onBack}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 border-2 border-gray-200 text-gray-600 hover:border-[#009ee3]/50 hover:text-[#009ee3] hover:bg-[#009ee3]/5 transition-all duration-300 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t.back}</span>
          </button>
        </div>

        {/* Métodos de Pagamento */}
        <div className="pt-8 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="h-[1px] flex-1 bg-gray-200"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.acceptCardsPixPaypal}</span>
            <div className="h-[1px] flex-1 bg-gray-200"></div>
          </div>
          
          <div className="flex items-center justify-center flex-wrap gap-6">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pix</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visa</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Elo</span>
            <span className="text-[10px] font-black text-[#003087] uppercase tracking-widest">PayPal</span>
          </div>
        </div>

        {/* Selos de confiança - apenas texto */}
        <div className="pt-8 space-y-2 text-center">
          <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{t.dataSecurity} — {t.endToEndEncryption}</p>
          <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{t.realVerdict} — {t.authenticitySeal}</p>
        </div>

        <div className="h-10"></div>
      </main>
    </div>
  );
}
