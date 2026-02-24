import React, { useState, useEffect } from 'react';
import { Key, Zap, Crown, Check } from 'lucide-react';
import { auth } from '../services/firebase';
import { useI18n } from '../services/i18n-temp';

type PlanFeatureKey = 'apiBasicF1' | 'apiBasicF2' | 'apiBasicF3' | 'apiBasicF4' | 'apiProF1' | 'apiProF2' | 'apiProF3' | 'apiProF4' | 'apiEntF1' | 'apiEntF2' | 'apiEntF3' | 'apiEntF4';
const getApiPlansData = (t: Record<string, string>) => [
  { id: 'api_basic', name: 'Basic', requests: '5.000', unit: true, price: 49.9, features: ['apiBasicF1', 'apiBasicF2', 'apiBasicF3', 'apiBasicF4'] as PlanFeatureKey[], icon: Key, color: 'border-blue-500/40 bg-blue-500/5' },
  { id: 'api_pro', name: 'Pro', requests: '20.000', unit: true, price: 149.9, features: ['apiProF1', 'apiProF2', 'apiProF3', 'apiProF4'] as PlanFeatureKey[], icon: Zap, color: 'border-emerald-500/40 bg-emerald-500/5', popular: true },
  { id: 'api_enterprise', name: 'Enterprise', requests: t.apiUnlimited, unit: false, price: 499.9, features: ['apiEntF1', 'apiEntF2', 'apiEntF3', 'apiEntF4'] as PlanFeatureKey[], icon: Crown, color: 'border-amber-500/40 bg-amber-500/5' },
];

interface ApiPlansPageProps {
  currentPlan?: string;
  onSelectPlan?: (plan: { id: string; type: string; price: string; name: string; level?: string }) => void;
}

export const ApiPlansPage: React.FC<ApiPlansPageProps> = ({ currentPlan: propPlan, onSelectPlan }) => {
  const { t } = useI18n();
  const [currentPlan, setCurrentPlan] = useState<string | undefined>(propPlan);
  const [loadingPlan, setLoadingPlan] = useState(!!auth.currentUser && !propPlan);

  useEffect(() => {
    if (!auth.currentUser || propPlan) {
      setLoadingPlan(false);
      return;
    }
    let cancelled = false;
    auth.currentUser.getIdToken().then((token) => {
      if (cancelled) return;
      fetch('/api/dev/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (cancelled) return;
          setCurrentPlan(d?.plan ?? undefined);
        })
        .finally(() => {
          if (!cancelled) setLoadingPlan(false);
        });
    });
    return () => { cancelled = true; };
  }, [propPlan]);

  const effectivePlan = propPlan ?? currentPlan;

  const handleCheckout = (plan: { id: string; name: string; price: number }) => {
    if (!auth.currentUser) {
      alert(t.apiLoginToSubscribe);
      return;
    }
    if (onSelectPlan) {
      onSelectPlan({
        id: plan.id,
        type: 'subscription',
        price: `R$ ${plan.price.toFixed(2).replace('.', ',')}`,
        name: plan.name,
        level: plan.name,
      });
    }
  };

  const mapPlanId = (id: string) => id.replace('api_', '');

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 italic">
            {t.apiPlansTitle}
          </h1>
          <p className="text-[11px] text-gray-600 mt-2 max-w-xl mx-auto">
            {t.apiPlansSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getApiPlansData(t).map((plan) => {
            const Icon = plan.icon;
            const isCurrent = effectivePlan === mapPlanId(plan.id);
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col p-6 rounded-2xl border bg-white border-gray-200 shadow-sm ${
                  plan.popular ? 'ring-2 ring-emerald-500 shadow-md' : ''
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-full">
                    {t.apiMostPopular}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-gray-100">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-black uppercase text-gray-900">{plan.name}</h2>
                </div>
                <p className="text-[10px] text-gray-600 mb-4">
                  {plan.unit ? `${plan.requests} ${t.apiRequestsUnit}${t.apiPerMonth}` : plan.requests}
                </p>
                <ul className="space-y-2 mb-6 flex-grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[10px] text-gray-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {t[f]}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <div className="text-2xl font-black text-gray-900 mb-4">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                    <span className="text-[10px] font-normal text-gray-500 ml-1">{t.apiPerMonth}</span>
                  </div>
                  {loadingPlan ? (
                    <div className="py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-400 text-center">
                      <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin align-middle" />
                    </div>
                  ) : isCurrent ? (
                    <div className="py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-400 text-center">
                      {t.apiCurrentPlan}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckout(plan)}
                      className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-[#009ee3] hover:bg-[#0088cc] text-white flex items-center justify-center gap-2"
                    >
                      {t.apiCheckout}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[9px] text-gray-600 mt-8">
          {t.apiPaymentInfo}
        </p>
        <p className="text-center text-[9px] text-amber-600 mt-2">
          {t.apiCreateKeyHint}
        </p>
      </div>
    </div>
  );
};
