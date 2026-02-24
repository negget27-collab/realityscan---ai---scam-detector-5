















import { analyzeMedia, reconPerson } from './services/geminiService';

import React, { useState, useRef, useEffect, useMemo, Suspense, lazy } from 'react';

import { AnalysisResult, AppState, PlanConfig } from './types';
import { ScannerOverlay } from './components/ScannerOverlay';
import { ForensicReport } from './components/ForensicReport';
import { Splash } from './components/Splash';
import { TutorialOverlay } from './components/TutorialOverlay';
import { EntryChoice, getStoredAppMode, type AppMode } from './components/EntryChoice';
import { CorporatePortal } from './components/CorporatePortal';
import { CorporateApiLogin, getStoredCorporateApiKey, clearStoredCorporateApiKey } from './components/CorporateApiLogin';
import { EmailVerificationGate } from './components/EmailVerificationGate';
import PagamentoAprovado from './PagamentoAprovado';

const InfoPage = lazy(() => import('./components/InfoPage').then(m => ({ default: m.InfoPage })));
const CheckoutPage = lazy(() => import('./components/CheckoutPage').then(m => ({ default: m.default })));
const PaymentSuccess = lazy(() => import('./components/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const BulkSummary = lazy(() => import('./components/BulkSummary').then(m => ({ default: m.BulkSummary })));
import { FaceScanModal } from './components/FaceScanModal';
import { CameraModal } from './components/CameraModal';
import { RomanticScamModal } from './components/RomanticScamModal';
import { SentryMiniHUD } from './components/SentryMiniHUD';
import { UpgradeAdBanner, setLimitReached } from './components/UpgradeAdBanner';
import { SocialNetworkPickerModal } from './components/SocialNetworkPickerModal';
import { ChatAssistant } from './components/ChatAssistant';
import { Brain, Share2, VolumeX, Zap } from 'lucide-react';

const BusinessAdminPanel = lazy(() => import('./components/BusinessAdminPanel').then(m => ({ default: m.BusinessAdminPanel })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DevApiPanel = lazy(() => import('./components/DevApiPanel').then(m => ({ default: m.DevApiPanel })));
const ApiPlansPage = lazy(() => import('./components/ApiPlansPage').then(m => ({ default: m.ApiPlansPage })));
import { AppFooter } from './components/AppFooter';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { healthService } from './services/SystemHealthService';


import { auth, db, saveUserData, incrementAnalysisCount, saveAnalysisResult, logout, deleteUserAccount, handleAuthRedirectResult } from './services/firebase';
import { getOrCreateDeviceId } from './services/deviceId';
import { captureReferralFromUrl, clearReferralCode } from './services/referralService';
import { runSentryScan, runSentryScanFromImage, normalizeSentryError } from './services/SentryService';
import { useSentryMobileFlow, pipSupported } from './utils/deviceCapabilities';
import { SentryMobileCaptureModal } from './components/SentryMobileCaptureModal';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, onSnapshot, updateDoc } from "firebase/firestore";
import { useI18n } from './services/i18n-temp';
import { useTheme } from './contexts/ThemeContext';
import { getPlanPrice, getFromPriceText, getCreditsPrice } from './services/priceConverter';



const INITIAL_PLANS: PlanConfig[] = [

  {
    id: 'community',
    level: 'Nível 01: Plano livre',
    name: 'Livre',
    price: 'Livre',
    description: 'Ideal para usuários casuais e verificações rápidas.',
    features: ['3 SCANS GRÁTIS', 'ANÁLISE DE IMAGEM', 'FACESCAN', 'CHAT LIMITADO', 'RELATÓRIO SIMPLES'],
    cta: 'Plano Atual',
    colorClass: 'glass-panel bg-gray-900/20 border-white/5',
    type: 'subscription'
  },
  {
    id: 'advanced',
    level: 'Nível 02: Advanced',
    name: 'Advanced',
    price: 'R$ 21,90',
    description: 'Proteção forense completa para indivíduos e profissionais.',
    highlight: 'MAIS POPULAR',
    features: ['80 SCANS POR MÊS', 'ANTI-GOLPE ROMÂNTICO', 'MÓDULO DAI PRECISION', 'SUPORTE PRIORITÁRIO', 'CHAT MODERADO + (SCAN VÍDEOS E FOTOS)'],
    cta: 'Assinar Advanced',
    colorClass: 'bg-gradient-to-br from-blue-600 to-indigo-800 shadow-[0_25px_50px_-12px_rgba(37,99,235,0.4)]',
    type: 'subscription'
  },
  {
    id: 'business',
    level: 'Nível 03: Business',
    name: 'Business',
    price: 'R$ 34,90',
    description: 'Segurança máxima para empresas e análise em escala.',
    highlight: 'CORP',
    features: ['200 SCANS POR MÊS', 'RELATÓRIOS JUDICIAIS', 'RELATÓRIOS EM PDF', 'PAINEL BUSINESS', 'BANCO DE DADOS', 'AUDITORIA BLOCKCHAIN', 'ATÉ 20 SCANS POR UPLOAD + PDF', 'CHAT MODERADO + (SCAN VÍDEOS E FOTOS)'],
    cta: 'Solicitar Business',
    colorClass: 'bg-[#0a0f1e] border-2 border-amber-500/40 shadow-lg',
    type: 'subscription'
  }
];

const SCAN_STEPS = [
  "Iniciando Módulos de Deep Learning...",
  "Mapeando vetores biométricos e harmônicos...",
  "Analisando frequências de áudio sintético...",
  "Consolidando veredito de autenticidade..."
];


const MAX_FREE_ANALYSES = 3;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  // Retorno de pagamento: sessionStorage (index.html) OU URL com status=approved (fallback)
  const isReturnFromPayment = typeof window !== 'undefined' && (
    sessionStorage.getItem('rs_return_from_payment') === '1' ||
    (window.location?.search && /status=approved|collection_id/.test(window.location.search))
  );
  // Persistência de Splash para evitar repetição ao atualizar
  const [showSplash, setShowSplash] = useState(() => (isReturnFromPayment ? false : !sessionStorage.getItem('rs_splash_seen')));
  // Tutorial: exibido apenas na primeira vez (localStorage persiste até limpar cache)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('rs_tutorial_seen'));
  // Modo app: usuário comum ou corporativo (após splash)
  const [appMode, setAppMode] = useState<AppMode | null>(() => (isReturnFromPayment ? 'user' : getStoredAppMode()));
  const [showEntryChoice, setShowEntryChoice] = useState(() => !isReturnFromPayment && !getStoredAppMode());
  const [showCorporateLogin, setShowCorporateLogin] = useState(false);
  const [corporateApiKeyVerified, setCorporateApiKeyVerified] = useState(false);
  
  const [view, setView] = useState<'HOME' | 'INFO' | 'CHECKOUT' | 'PROFILE' | 'SUCCESS' | 'EXTERNAL_SUCCESS' | 'BUSINESS_PANEL' | 'ADMIN' | 'DEV_API' | 'API_PLANS' | 'LOGIN'>(() => (isReturnFromPayment ? 'EXTERNAL_SUCCESS' : 'HOME'));
  const [apiPlansFrom, setApiPlansFrom] = useState<'INFO' | 'DEV_API'>('DEV_API');
  const [profileSubView, setProfileSubView] = useState<'MAIN' | 'TERMS' | 'PLAN' | 'HISTORY'>('MAIN');
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  
  const [plans] = useState<PlanConfig[]>(INITIAL_PLANS);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showSocialNetworkPicker, setShowSocialNetworkPicker] = useState(false);
  const [socialNetworkPickerMode, setSocialNetworkPickerMode] = useState<'activate' | 'openOnly'>('activate');
  const [state, setState] = useState<AppState>({
    isScanning: false,
    currentResult: null,
    bulkResults: null,
    batchProgress: { current: 0, total: 0 },
    error: null,
    userStats: null,
  });
  const [preview, setPreview] = useState<{ url: string, type: 'IMAGE' | 'VIDEO' | 'AUDIO' } | null>(null);
  const cameFromBulkRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisCount, setAnalysisCount] = useState<number>(0);
  const [isRomanticMode, setIsRomanticMode] = useState(false);
  const [showRomanticModal, setShowRomanticModal] = useState(false);
  const [isFaceScanModalOpen, setIsFaceScanModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'LIMIT' | 'PREMIUM'>('LIMIT');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [isChatAudioPlaying, setIsChatAudioPlaying] = useState(false);
  const [canUseReasoningFree, setCanUseReasoningFree] = useState(false);
  const [showReasoningAgentModal, setShowReasoningAgentModal] = useState(false);
  const { theme, setTheme, toggleTheme } = useTheme();
  const [notification, setNotification] = useState<{message: string, visible: boolean, type?: 'error' | 'success' | 'warning'}>({
    message: '',
    visible: false
  });
  
  const [isSentryActive, setIsSentryActive] = useState(false);
  const [sentryPipWindow, setSentryPipWindow] = useState<Window | null>(null);
  const [isSentryScanning, setIsSentryScanning] = useState(false);
  const [lastSentryResult, setLastSentryResult] = useState<AnalysisResult | null>(null);
  const [lastSentryError, setLastSentryError] = useState<string | null>(null);
  const [sentryHistory, setSentryHistory] = useState<Array<{ result: AnalysisResult; timestamp: string }>>([]);
  const sentryStreamRef = useRef<MediaStream | null>(null);
  const sentryVideoRef = useRef<HTMLVideoElement | null>(null);
  const sentryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sentryScanTriggerRef = useRef<(videoLink?: string) => void>(() => {});
  const hasSentrySetupOnceRef = useRef(false);
  const consumeCreditRef = useRef<() => Promise<boolean>>(async () => false);
  const [showSentryMobileCapture, setShowSentryMobileCapture] = useState(false);
  const isSentryMobileFlow = useSentryMobileFlow();
  const userRef = useRef<User | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { lang: userLang, setLang: setUserLang, t } = useI18n();

  const plansWithPrices = useMemo(() => plans.map(p => ({
    ...p,
    price: p.id === 'community' ? (userLang === 'PT' ? 'Livre' : userLang === 'EN' ? 'Free' : 'Gratis') : getPlanPrice(userLang as 'PT' | 'EN' | 'ES', p.id as 'advanced' | 'business')
  })), [plans, userLang]);

  const effectivePlanId = state.userStats?.plan || 'community';
  
  const isCurrentlyBusiness = effectivePlanId.startsWith('business');
  const isCurrentlyAdvanced = effectivePlanId.startsWith('advanced');
  const hasPremiumAccess = isCurrentlyBusiness || isCurrentlyAdvanced;
  const normalizedPlanId = effectivePlanId.replace('_annual', '');
  const activePlanDetails = plansWithPrices.find(p => p.id === normalizedPlanId) || plansWithPrices[0];

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const isReturnFromMercadoPago = status === "approved" || params.has("collection_id") || params.has("payment_id") || params.has("preference_id");

    if (status === "approved") {
      clearReferralCode();
      window.history.replaceState({}, document.title, "/");
      sessionStorage.setItem("rs_pending_payment_sync", "1");
      try { sessionStorage.setItem("rs_splash_seen", "1"); localStorage.setItem("rs_app_mode", "user"); } catch (_) {}
      setTheme("light");
      setShowSplash(false);
      setShowEntryChoice(false);
      setAppMode("user");
      setView("EXTERNAL_SUCCESS"); // Tela elegante de compra — sem splash nem escolha de modo
    }

    let unsubscribe: (() => void) | undefined;
    const initAuth = async () => {
      // Não processar redirect OAuth quando voltando do Mercado Pago – evita sobrescrever
      // o usuário atual com resultado pendente de login anterior (Google, etc.)
      if (!isReturnFromMercadoPago) {
        try {
          await handleAuthRedirectResult();
        } catch (e) {
          console.warn("[Auth] Redirect result:", e);
        }
      }
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setIsAuthLoading(false);
      } else if (sessionStorage.getItem("rs_pending_payment_sync")) {
        sessionStorage.removeItem("rs_pending_payment_sync");
        const docRef = doc(db, "users", firebaseUser.uid);
        const applyUserStats = (d: Record<string, unknown>) => {
          setState(prev => ({
            ...prev,
            userStats: {
              plan: (d.planId as string) || (d.plan as string) || "community",
              credits: (d.credits as number) ?? 0,
              monthlyCredits: (d.monthlyCredits as number) ?? 0,
              subscriptionActive: !!(d.subscriptionActive),
              subscriptionId: d.subscriptionId as string | undefined,
              planExpiresAt: d.planExpiresAt as string | undefined,
              referralCode: (d.referralCode as string) ?? null,
              referralCount: (d.referralCount as number) ?? 0,
              referralCreditsEarned: (d.referralCreditsEarned as number) ?? 0
            }
          }));
        };
        const syncPlan = () => {
          getDocFromServer(docRef)
            .catch(() => getDoc(docRef))
            .then((snap) => {
              if (snap?.exists()) {
                applyUserStats(snap.data() as Record<string, unknown>);
              }
            })
            .catch(() => {});
        };
        syncPlan();
        setTimeout(syncPlan, 500);
        setTimeout(syncPlan, 1500);
        setTimeout(syncPlan, 3500);
      }
    });
    };
    initAuth();
    return () => unsubscribe?.();
  }, []);







useEffect(() => {
    if (!user) {
      setAnalysisCount(0);
      setProfilePic(null);
      setUserName(null);
      setState(prev => ({ ...prev, userStats: null }));
      return;
    }

    console.log("Attaching Firestore listener for:", user.uid);
    const loadingTimeout = setTimeout(() => setIsAuthLoading(false), 5000);

    let unsubscribeFirestore: (() => void) | null = null;
    let retryCount = 0;
    const maxRetries = 5;
    let isMounted = true;

    const subscribe = async () => {
      if (!user?.uid || !isMounted) return;
      
      console.log(`[Firestore] Syncing for:`, user.uid);
      
      const userDocRef = doc(db, "users", user.uid);

      // Layer 1: Fetch do servidor (evita cache) para garantir que bloqueio admin seja respeitado
      try {
        const initialSnap = await getDocFromServer(userDocRef).catch(() => getDoc(userDocRef));
        if (isMounted && initialSnap.exists()) {
          const data = initialSnap.data();
          console.log("[Firestore] Initial data fetch success:", data);
          if (data?.status === 'blocked' || data?.status === 'bloqueado') {
            await logout();
            setView('HOME');
            return;
          }
          updateLocalState(data);
          setIsAuthLoading(false);
        }
      } catch (err) {
        console.warn("[Firestore] Initial fetch failed, relying on listener:", err);
      }
      
      // Layer 2: Real-time listener
      unsubscribeFirestore = onSnapshot(userDocRef, (snapshot) => {
        if (!isMounted) return;
        retryCount = 0; 
        clearTimeout(loadingTimeout);
        
        if (!snapshot.exists()) {
          console.warn("[Firestore] Document does not exist for user:", user.uid);

  


      
        
      
          // Fallback to basic info from auth
          setUserName(user.displayName || user.email);
          setProfilePic(user.photoURL);
          setAnalysisCount(0);
          setState(prev => ({
            ...prev,
            userStats: {
              plan: 'community',
              credits: 0,
              monthlyCredits: 0,
              subscriptionActive: false
            }
          }));
          setIsAuthLoading(false);
          
          return;
        }

        const data = snapshot.data();
        console.log("[Firestore] Real-time update received:", data);
        if (data?.status === 'blocked' || data?.status === 'bloqueado') {
          logout().then(() => setView('HOME'));
          return;
        }
        updateLocalState(data);
        setIsAuthLoading(false);
        
      }, (err) => {
        console.error("[Firestore] Sync error:", err);
        if (isMounted && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`[Firestore] Retrying in ${delay}ms...`);
          setTimeout(subscribe, delay);
        } else if (isMounted) {
          clearTimeout(loadingTimeout);
          setIsAuthLoading(false);
          
        }
      });
    };

    const updateLocalState = (data: any) => {
      setAnalysisCount(data.analysisCount || 0);
      setProfilePic(data.photoURL || data.profilePic || user?.photoURL);
      setUserName(data.displayName || user?.displayName || user?.email);
      if (data.language) setUserLang(data.language as 'PT' | 'EN' | 'ES', { persist: true });

      setState(prev => ({
        ...prev,
        userStats: {
          plan: data.planId || data.plan || 'community',
          credits: data.credits || 0,
          monthlyCredits: data.monthlyCredits || 0,
          subscriptionActive: data.subscriptionActive || false,
          subscriptionId: data.subscriptionId,
          planExpiresAt: data.planExpiresAt,
          referralCode: data.referralCode || null,
          referralCount: data.referralCount || 0,
          referralCreditsEarned: data.referralCreditsEarned || 0
        }
      }));
    };

    subscribe();

    return () => {
      isMounted = false;
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [user?.uid]);
  const consumeCredit = async (): Promise<boolean> => {
    const deviceId = getOrCreateDeviceId();

    if (user && state.userStats) {
      const monthlyCredits = Number(state.userStats.monthlyCredits || 0);
      const credits = Number(state.userStats.credits || 0);
      if (monthlyCredits > 0) {
        await updateDoc(doc(db, "users", user.uid), { monthlyCredits: monthlyCredits - 1 });
        return true;
      }
      if (credits > 0) {
        await updateDoc(doc(db, "users", user.uid), { credits: credits - 1 });
        return true;
      }
    }

    try {
      const r = await fetch(`/api/check-free-usage?deviceId=${encodeURIComponent(deviceId)}`, {
        headers: { 'X-Device-Id': deviceId }
      });
      const data = await r.json();
      return !!data.allowed;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    consumeCreditRef.current = consumeCredit;
    userRef.current = user;
  });

  const handleChatIconClick = () => {
    if (hasPremiumAccess) {
      setChatMode('reasoning');
      setIsChatOpen(true);
      return;
    }
    if (isCurrentlyBusiness) {
      setChatMode('corporate');
      setIsChatOpen(true);
      return;
    }
    const deviceId = getOrCreateDeviceId();
    fetch(`/api/check-free-reasoning?deviceId=${encodeURIComponent(deviceId)}`, { headers: { 'X-Device-Id': deviceId } })
      .then(r => r.json())
      .then(r => {
        if (r.allowed) {
          setCanUseReasoningFree(true);
          setChatMode('reasoning');
          setIsChatOpen(true);
        } else {
          setShowReasoningAgentModal(true);
        }
      })
      .catch(() => setShowReasoningAgentModal(true));
  };

  const handleChatClose = () => {
    const wasReasoning = chatMode === 'reasoning';
    setIsChatOpen(false);
    setChatMode(null);
    const deviceId = getOrCreateDeviceId();
    if (wasReasoning && !hasPremiumAccess) {
      fetch('/api/mark-reasoning-session-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
        body: JSON.stringify({ deviceId })
      }).catch(() => {});
    }
  };

  const handleEnterTerminal = () => {
    sessionStorage.setItem('rs_splash_seen', 'true');
    setShowSplash(false);
    setShowEntryChoice(true);
  };

  const [loginFromEntryChoice, setLoginFromEntryChoice] = useState(false);
  const handleEntrySelect = (mode: AppMode) => {
    setAppMode(mode);
    setShowEntryChoice(false);
    if (mode === 'user') {
      setView('LOGIN');
      setLoginFromEntryChoice(true);
    } else {
      setLoginFromEntryChoice(false);
    }
  };

  const handleSwitchToEntryChoice = () => {
    try { localStorage.removeItem('rs_app_mode'); } catch (_) {}
    setAppMode(null);
    setShowEntryChoice(true);
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('rs_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  const isSentryScanningRef = useRef(false);
  useEffect(() => { isSentryScanningRef.current = isSentryScanning; }, [isSentryScanning]);

  const SENTRY_SESSION_LIMIT: Record<string, number> = { advanced: 2, business: 4 };

  useEffect(() => {
    if (!isSentryActive) return;

    const executeSentryScan = async (videoLink?: string) => {
      if (isSentryScanningRef.current) return;
      if (!sentryStreamRef.current || !sentryCanvasRef.current) {
        showNotification("Compartilhamento de tela encerrado. Desative e ative o Sentry novamente para compartilhar a tela.", "warning");
        return;
      }

      const plan = effectivePlanId?.toLowerCase?.() || '';
      const limit = plan.startsWith('business') ? SENTRY_SESSION_LIMIT.business : SENTRY_SESSION_LIMIT.advanced;
      if (sentryHistory.length >= limit) {
        showNotification(
          plan.startsWith('business')
            ? 'Limite de 4 análises por sessão atingido. Desative e reative o Sentry para nova sessão.'
            : 'Limite de 2 análises por sessão atingido. Desative e reative o Sentry para nova sessão.',
          'warning'
        );
        return;
      }

      setLastSentryError(null);
      setIsSentryScanning(true);

      try {
        showNotification("Capturando 3 imagens (4s)...", "success");
        const fullResult = await runSentryScan({
          stream: sentryStreamRef.current,
          canvas: sentryCanvasRef.current,
          userId: userRef.current?.uid,
          consumeCredit: consumeCreditRef.current,
          videoLink: videoLink || undefined,
        });

        setLastSentryResult(fullResult);
        setSentryHistory((prev) => [...prev.slice(-19), { result: fullResult, timestamp: new Date().toISOString() }]);

        if (fullResult.score >= 50) {
          showNotification(`⚠️ Conteúdo com IA detectado! Risco: ${fullResult.score}%`, "warning");
        }
      } catch (err: any) {
        if (err?.code === "CREDITS_INSUFFICIENT") {
          setUpgradeReason("LIMIT");
          setIsLimitModalOpen(true);
        }
        const sentryErr = normalizeSentryError(err);
        console.error("[Sentry] Falha:", sentryErr.message);
        setLastSentryError(sentryErr.message);
        showNotification(sentryErr.message, "error");
      } finally {
        setIsSentryScanning(false);
      }
    };

    sentryScanTriggerRef.current = executeSentryScan;
    if (typeof window !== 'undefined' && typeof (window as any).BroadcastChannel !== 'undefined') {
      const bc = new (window as any).BroadcastChannel('rs-sentry');
      bc.onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'analyze') {
          const link = e.data.videoLink;
          setTimeout(() => sentryScanTriggerRef.current?.(link), 0);
        }
      };
      return () => { bc.close(); sentryScanTriggerRef.current = () => {}; };
    }
    return () => { sentryScanTriggerRef.current = () => {}; };
  }, [isSentryActive, sentryHistory.length, effectivePlanId]);

  useEffect(() => {
    if (isLimitModalOpen && upgradeReason === 'LIMIT') setLimitReached();
  }, [isLimitModalOpen, upgradeReason]);

  useEffect(() => {
    let interval: number;
    if (state.isScanning) {
      interval = window.setInterval(() => {
        setCurrentStep(prev => (prev + 1) % SCAN_STEPS.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [state.isScanning]);

  const showNotification = (message: string, type: 'error' | 'success' | 'warning' = 'success') => {
    setNotification({ message, visible: true, type });
    setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 6000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    // 🔥 DESCONTA CRÉDITO
const allowed = await consumeCredit();

if (!allowed) {
  setUpgradeReason("LIMIT");
  setIsLimitModalOpen(true);
  return;
}
    if (files.length > 1 && !isCurrentlyBusiness) {
      showNotification("Análise em lote apenas para Plano Business.", "warning");
      return;
    }
    setState({ isScanning: true, currentResult: null, bulkResults: null, batchProgress: { current: 1, total: files.length }, error: null });
    try {
      const results: AnalysisResult[] = [];
      for (let i = 0; i < files.length; i++) {
        setState(prev => ({ ...prev, batchProgress: { current: i + 1, total: files.length } }));
        const result = await new Promise<AnalysisResult>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const mType: 'IMAGE' | 'VIDEO' | 'AUDIO' =
files[i].type.startsWith('video') ? 'VIDEO' :
files[i].type.startsWith('audio') ? 'AUDIO' : 'IMAGE';

const formData = new FormData();
formData.append("file", files[i]);
if (user?.uid) formData.append("userId", user.uid);
formData.append("deviceId", getOrCreateDeviceId());

const analysis = await fetch("/api/scan", {
  method: "POST",
  body: formData
}).then(async r => {
  if (r.status === 403) {
    const err = await r.json();
    setUpgradeReason("LIMIT");
    setIsLimitModalOpen(true);
    throw new Error(err.error || "Créditos insuficientes");
  }
  if (r.status === 503) {
    const err = await r.json();
    throw new Error(err.error || "Serviço temporariamente indisponível.");
  }
  return r.json();
});

const finalResult: AnalysisResult = {
  ...analysis,
  id: Math.random().toString(36),
  fileName: files[i].name,
  mediaUrl: URL.createObjectURL(files[i]),
  mediaType: mType
};

resolve(finalResult);


            } catch (err) {
  reject(err);
}
};

reader.readAsDataURL(files[i]);
});

results.push(result);

        if (user) {
          const isAIClassified = result.isAI === true || (typeof result.score === 'number' && result.score >= 50);
          if (isAIClassified) {
            const source = view === 'BUSINESS_PANEL' ? "Terminal Business" : "Terminal RealityScan";
            await saveAnalysisResult(user.uid, result, source);
          }
        }
      }
      if (!hasPremiumAccess && user) {
        for (let i = 0; i < files.length; i++) await incrementAnalysisCount(user.uid);
      }
      if (results.length === 1) {
        setPreview({ url: results[0].mediaUrl!, type: results[0].mediaType! });
        setState(prev => ({ ...prev, isScanning: false, currentResult: results[0] }));
      } else {
        setState(prev => ({ ...prev, isScanning: false, bulkResults: results }));
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, isScanning: false, error: err.message }));
      showNotification(err.message || "Erro na análise.", "error");
    }
  };

  const handleActivateSentryDirect = async () => {
    if (isSentryMobileFlow) {
      setIsSentryActive(true);
      setLastSentryResult(null);
      setLastSentryError(null);
      setSentryHistory([]);
      showNotification("Modo mobile ativo. Clique em Nova análise para enviar foto ou tirar captura.", "success");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } as any, audio: true });
      sentryStreamRef.current = stream;
      if (sentryVideoRef.current) {
        sentryVideoRef.current.srcObject = stream;
        await sentryVideoRef.current.play();
      }
      setIsSentryActive(true);
      setLastSentryResult(null);
      setLastSentryError(null);
      setSentryHistory([]);
      showNotification("Monitor ativo. Pause o vídeo/foto no feed e clique em Nova análise.", "success");
      stream.getVideoTracks()[0].onended = () => { setIsSentryActive(false); setLastSentryResult(null); setSentryPipWindow(null); };
    } catch (err: any) {
      console.error("Sentry Activation Error:", err);
      showNotification("Compartilhamento cancelado. Selecione a aba da rede social no diálogo do navegador.", "warning");
    }
  };

  /** Abre PiP primeiro (gesto do usuário), depois getDisplayMedia. Usado no fluxo do modal em 2 etapas. */
  const handleConfirmAndStartWithPip = async () => {
    hasSentrySetupOnceRef.current = true;
    if (isSentryMobileFlow) {
      await handleActivateSentryDirect();
      return;
    }
    if (!('documentPictureInPicture' in window)) {
      showNotification("Janela flutuante disponível apenas no Chrome/Edge 116+.", "warning");
      return;
    }
    try {
      const dw = await (window as any).documentPictureInPicture.requestWindow({ width: 320, height: 260 });
      const styles = document.querySelectorAll('link, style');
      styles.forEach((s) => dw.document.head.appendChild(s.cloneNode(true)));
      dw.document.body.style.backgroundColor = '#030712';
      dw.document.body.style.margin = '0';
      dw.document.body.className = 'bg-[#030712] text-white overflow-hidden h-full';
      dw.addEventListener('pagehide', () => setSentryPipWindow(null));
      setSentryPipWindow(dw);
      setIsSentryActive(true);
      setLastSentryResult(null);
      setLastSentryError(null);
      setSentryHistory([]);

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } as any, audio: true });
      sentryStreamRef.current = stream;
      if (sentryVideoRef.current) {
        sentryVideoRef.current.srcObject = stream;
        await sentryVideoRef.current.play();
      }
      showNotification("Monitor ativo em janela flutuante. Pause o vídeo/foto no feed e clique em Nova análise.", "success");
      stream.getVideoTracks()[0].onended = () => { setIsSentryActive(false); setLastSentryResult(null); setSentryPipWindow(null); };
    } catch (err: any) {
      console.error("Sentry PiP+Activation Error:", err);
      setSentryPipWindow(null);
      setIsSentryActive(false);
      showNotification(err?.name === 'NotAllowedError' ? "Compartilhamento cancelado. Selecione a aba da rede social no diálogo." : "Falha ao ativar. Use Chrome/Edge 116+ para janela flutuante.", "warning");
    }
  };

  const handleToggleSentry = async () => {
    if (!hasPremiumAccess) {
      setUpgradeReason('PREMIUM');
      setIsLimitModalOpen(true);
      return;
    }
    if (!isSentryActive) {
      if (isSentryMobileFlow) {
        hasSentrySetupOnceRef.current = true;
        await handleActivateSentryDirect();
      } else if (hasSentrySetupOnceRef.current) {
        setShowSocialNetworkPicker(false);
        if (pipSupported()) {
          await handleConfirmAndStartWithPip();
        } else {
          await handleActivateSentryDirect();
        }
      } else {
        setSocialNetworkPickerMode('activate');
        setShowSocialNetworkPicker(true);
      }
    } else {
      setIsSentryActive(false);
      setLastSentryResult(null);
      setLastSentryError(null);
      if (sentryStreamRef.current) {
        sentryStreamRef.current.getTracks().forEach(t => t.stop());
        sentryStreamRef.current = null;
      }
    }
  };

  const handleOpenNetworkPicker = () => {
    setSocialNetworkPickerMode('openOnly');
    setShowSocialNetworkPicker(true);
  };

  const handleSocialNetworkSelected = async (_networkId: string, _url: string) => {
    setShowSocialNetworkPicker(false);
    if (socialNetworkPickerMode === 'openOnly') {
      showNotification(t.networkOpenedHint, "success");
      return;
    }
    hasSentrySetupOnceRef.current = true;
    await handleActivateSentryDirect();
  };

  const handleRomanticToggle = () => {
    if (!hasPremiumAccess) {
      showNotification("FAÇA UPGRADE PARA ATIVAR", "warning");
      return;
    }
    if (isRomanticMode) setIsRomanticMode(false);
    else setShowRomanticModal(true);
  };

  const resetAnalysis = () => {
    cameFromBulkRef.current = false;
    setState(prev => ({
      ...prev,
      isScanning: false,
      currentResult: null,
      bulkResults: null,
      batchProgress: { current: 0, total: 0 },
      error: null
    }));

    setPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo(0, 0);

    // Re-sincroniza plano/créditos ao voltar do relatório (evita plano sumir até F5)
    if (user) {
      handleSyncAccount();
    }
  };

  /** Volta do laudo para o Painel de Lote (mantém bulkResults) */
  const handleBackFromReport = () => {
    if (cameFromBulkRef.current || state.bulkResults) {
      cameFromBulkRef.current = false;
      setState(prev => ({ ...prev, currentResult: null }));
      window.scrollTo(0, 0);
    } else {
      resetAnalysis();
    }
  };

  const handleFinishSuccess = () => {
    try { sessionStorage.removeItem('rs_return_from_payment'); } catch (_) {}
    window.history.replaceState({}, '', '/');
    setView('HOME');
    // Force a sync after a short delay to ensure DB has updated
    setTimeout(handleSyncAccount, 1500);
  };

  const handleSyncAccount = async () => {
    if (!user) return;
    console.log("Manual Sync Triggered for:", user.uid);
    try {
      const { getDoc, doc } = await import("firebase/firestore");
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Manual Sync Data:", data);
        setState(prev => ({
          ...prev,
          userStats: {
            plan: data.planId || data.plan || 'community',
            credits: data.credits || 0,
            monthlyCredits: data.monthlyCredits || 0,
            subscriptionActive: data.subscriptionActive || false,
            subscriptionId: data.subscriptionId,
            planExpiresAt: data.planExpiresAt,
            referralCode: data.referralCode || null,
            referralCount: data.referralCount || 0,
            referralCreditsEarned: data.referralCreditsEarned || 0
          }
        }));
      }
    } catch (err) {
      console.error("Manual sync failed:", err);
    }
  };

  if (showSplash) return <Splash onEnter={handleEnterTerminal} />;
  if (showEntryChoice) return <EntryChoice onSelect={handleEntrySelect} />;
  if (appMode === 'corporate') {
    const corporateApiKey = getStoredCorporateApiKey();
    if (!corporateApiKey) {
      return (
        <CorporateApiLogin
          onSuccess={() => setCorporateApiKeyVerified(true)}
          onBack={handleSwitchToEntryChoice}
        />
      );
    }
    return (
      <CorporatePortal
        onBack={() => {
          clearStoredCorporateApiKey();
          handleSwitchToEntryChoice();
        }}
        onSwitchToUser={() => {
          clearStoredCorporateApiKey();
          try { localStorage.setItem('rs_app_mode', 'user'); } catch (_) {}
          setAppMode('user');
        }}
      />
    );
  }
  if (showTutorial) return <TutorialOverlay onComplete={handleTutorialComplete} />;
  if (isAuthLoading) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (user && !isGuest && !user.emailVerified) {
    return <EmailVerificationGate user={user} onLogout={() => setView('LOGIN')} />;
  }

  if (view === 'ADMIN') {
    if (user?.email !== 'negget27@gmail.com') {
      return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="text-red-500 font-black">Acesso negado.</div></div>;
    }
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <AdminDashboard onBack={() => setView('HOME')} userEmail={user?.email || ''} onNavigate={(v) => setView(v)} />
      </Suspense>
    );
  }

  const rootBgClass = view === 'LOGIN' || view === 'API_PLANS' ? 'bg-white text-gray-900' : theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-[#030712] text-gray-100';

  // Tela de sucesso de compra em tela cheia (fora do layout) para a mensagem aparecer sempre
  if (view === 'SUCCESS' || view === 'EXTERNAL_SUCCESS') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#030712]">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <PaymentSuccess plan={selectedPlan || plansWithPrices[1]} onFinish={handleFinishSuccess} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans relative overflow-x-hidden ${rootBgClass}`} data-theme={theme}>
      <video ref={sentryVideoRef} width={isSentryActive ? 320 : 1} height={isSentryActive ? 240 : 1} className="fixed pointer-events-none opacity-0 -z-50 -left-[9999px]" muted playsInline />
      <canvas ref={sentryCanvasRef} className="hidden" />

      {notification.visible && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[600] px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 flex items-center space-x-3 ${
          notification.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
          notification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
          'bg-green-500/10 border-green-500/30 text-green-400'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            notification.type === 'error' ? 'bg-red-500' : 
            notification.type === 'warning' ? 'bg-amber-500' : 
            'bg-green-500'
          }`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
        </div>
      )}

      {view !== 'CHECKOUT' && (
        <div className="fixed bottom-6 left-6 z-[350] flex items-center gap-2">
          {isChatAudioPlaying && (
            <button
              onClick={() => {
                window.speechSynthesis?.cancel();
                setIsChatAudioPlaying(false);
              }}
              title={t.chatVoiceStop}
              className="w-12 h-12 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-2xl flex items-center justify-center hover:bg-amber-500/30 transition-all animate-in slide-in-from-left-4 duration-300"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleChatIconClick}
            className={`w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-[0_15px_30px_rgba(37,99,235,0.4)] hover:scale-110 active:scale-95 transition-all animate-in slide-in-from-left-10 duration-500 group ${isChatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <Brain className="w-7 h-7 group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      )}

      <ChatAssistant
        isOpen={isChatOpen && (chatMode === 'reasoning' || chatMode === 'corporate')}
        onClose={handleChatClose}
        userName={userName}
        onAudioPlayingChange={setIsChatAudioPlaying}
        isCorporateMode={chatMode === 'corporate'}
      />

      <header className={`fixed top-0 left-0 w-full z-[450] backdrop-blur-xl px-6 py-4 flex items-center justify-between ${(view === 'API_PLANS' || theme === 'light') ? 'bg-white/90 border-b border-gray-200' : 'bg-[#030712]/80 border-b border-white/5'}`}>
        <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
          {(view !== 'HOME' || state.currentResult) && (
            <button onClick={() => { if (state.currentResult) handleBackFromReport(); else if (view === 'LOGIN') { setShowEntryChoice(true); setAppMode(null); setLoginFromEntryChoice(false); } else if (view === 'PROFILE') { if (profileSubView !== 'MAIN') setProfileSubView('MAIN'); else setView('HOME'); } else setView('HOME'); }} className={`p-2.5 rounded-xl border flex items-center justify-center hover:border-blue-500 transition-all active:scale-95 shadow-xl group shrink-0 ${(view === 'API_PLANS' || theme === 'light') ? 'border-gray-200 bg-gray-100 text-gray-700' : 'border-white/10 bg-[#0a0f1e]'}`}>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {(user || userName) && (
            <span className={`text-sm font-bold truncate max-w-[140px] md:max-w-[200px] ${(view === 'API_PLANS' || theme === 'light') ? 'text-gray-700' : 'text-gray-300'}`} title={userName || user?.email || undefined}>
              {userName || user?.displayName || user?.email || 'Usuário'}
            </span>
          )}
        </div>

        <div className={`flex-1 text-center px-4 ${(view === 'API_PLANS' || theme === 'light') ? 'text-gray-900' : 'text-white'}`}>
          {state.currentResult ? (
            <div className="animate-in slide-in-from-top-2 duration-500">
              <h1 className="text-base font-black uppercase tracking-tight leading-none truncate">{t.reportTitle}</h1>
            </div>
          ) : view === 'PROFILE' ? (
            <div className="animate-in slide-in-from-top-2 duration-500">
               <h1 className="text-base font-black uppercase tracking-tight leading-none truncate">{t.userCenter}</h1>
               <p className="text-[7px] font-mono text-blue-500/60 uppercase tracking-[0.4em] font-black mt-1 truncate">NGT Terminal v2.5</p>
            </div>
          ) : view === 'BUSINESS_PANEL' ? (
            <div className="animate-in slide-in-from-top-2 duration-500">
               <h1 className="text-lg font-black uppercase tracking-tighter leading-none truncate italic">{t.terminalBusiness.split(' ')[0]} <span className="text-amber-500">{t.terminalBusiness.split(' ')[1]}</span></h1>
               <p className="text-[7px] font-mono text-amber-500/60 uppercase tracking-[0.3em] font-black mt-1 truncate">Industrial Forensic Protocol v4.2</p>
            </div>
          ) : view === 'INFO' ? (
            <h1 className="text-base font-black uppercase tracking-tight leading-none truncate">{t.monthlySubscription}</h1>
          ) : view === 'CHECKOUT' ? (
            <h1 className="text-base font-black uppercase tracking-tight leading-none truncate">{t.checkoutTitle}</h1>
          ) : (view === 'SUCCESS' || view === 'EXTERNAL_SUCCESS') ? (
            <h1 className="text-base font-black uppercase tracking-tight leading-none truncate">{t.upgradeComplete}</h1>
          ) : (view === 'HOME' && !state.isScanning && !state.currentResult) ? (
            <h1 className={`text-xl md:text-2xl font-black tracking-tighter animate-in zoom-in-95 duration-500 ${theme === 'light' ? 'text-gray-900' : ''}`}><span className="text-[10px] md:text-xs text-gray-500 font-medium">----IA & Scan-detector</span><span className="ml-1"> Reality</span><span className="text-blue-500">Scan</span></h1>
          ) : null}
        </div>

        <div className="flex-1 flex items-center justify-end space-x-2">
            <button onClick={toggleTheme} title={theme === 'light' ? 'Tema escuro' : 'Tema claro'} className={`p-2.5 rounded-xl border flex items-center justify-center hover:border-blue-500 transition-all active:scale-95 shadow-xl group ${(view === 'API_PLANS' || theme === 'light') ? 'border-gray-200 bg-gray-100 text-gray-700' : 'border-white/10 bg-[#0a0f1e]'}`}>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          </button>
            <button onClick={() => setShowLanguageModal(true)} title={t.language} className={`p-2.5 rounded-xl border flex items-center justify-center hover:border-blue-500 transition-all active:scale-95 shadow-xl group ${(view === 'API_PLANS' || theme === 'light') ? 'border-gray-200 bg-gray-100 text-gray-700' : 'border-white/10 bg-[#0a0f1e]'}`}>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
          </button>
          {view === 'BUSINESS_PANEL' ? (
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-2 animate-in fade-in duration-500">
              <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest italic whitespace-nowrap">Node: Global</span>
            </div>
          ) : (
            <>
              {isCurrentlyBusiness && (
                <button onClick={() => setView('BUSINESS_PANEL')} title={t.painelBusiness} className={`p-2.5 rounded-xl border flex items-center justify-center hover:border-amber-500 transition-all active:scale-95 shadow-xl group ${(view === 'API_PLANS' || theme === 'light') ? 'border-gray-200 bg-gray-100 text-gray-700' : 'border-white/10 bg-[#0a0f1e]'}`}>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </button>
              )}
              {view !== 'INFO' && (
                <button onClick={() => setView('INFO')} className={`p-2.5 rounded-xl border flex items-center justify-center hover:border-amber-500 transition-all active:scale-95 shadow-xl group ${theme === 'light' ? 'border-gray-200 bg-gray-100 text-gray-700' : 'border-white/10 bg-[#0a0f1e]'}`}>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                </button>
              )}
            </>
          )}
          <button onClick={() => { setView('PROFILE'); setProfileSubView('MAIN'); }} className={`p-2.5 rounded-xl border flex items-center justify-center hover:border-blue-500 transition-all active:scale-95 shadow-xl group relative ${theme === 'light' ? 'border-gray-200 bg-gray-100 text-gray-700' : 'border-white/10 bg-[#0a0f1e]'}`}>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {/* AI Analyst Pulse */}
            <div className="absolute -top-1 -left-1 flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              <div className="absolute w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            </div>
          </button>
        </div>
      </header>

      <div className="pt-20 md:pt-24 px-4 pb-8">
        <SentryMiniHUD isActive={isSentryActive} onDeactivate={() => setIsSentryActive(false)} lastResult={lastSentryResult} lastError={lastSentryError} isScanning={isSentryScanning} onNotification={showNotification} sentryHistory={sentryHistory} onAnalyzeAgain={isSentryMobileFlow ? () => setShowSentryMobileCapture(true) : (videoLink) => sentryScanTriggerRef.current?.(videoLink)} pipSupported={pipSupported()} pipWindow={sentryPipWindow} setPipWindow={setSentryPipWindow} />
        {showSentryMobileCapture && (
          <SentryMobileCaptureModal
            isOpen={showSentryMobileCapture}
            onClose={() => setShowSentryMobileCapture(false)}
            onImageSelected={async (imageDataUrl) => {
              const plan = effectivePlanId?.toLowerCase?.() || '';
              const limit = plan.startsWith('business') ? SENTRY_SESSION_LIMIT.business : SENTRY_SESSION_LIMIT.advanced;
              if (sentryHistory.length >= limit) {
                setShowSentryMobileCapture(false);
                showNotification(
                  plan.startsWith('business')
                    ? 'Limite de 4 análises por sessão atingido. Desative e reative o Sentry.'
                    : 'Limite de 2 análises por sessão atingido. Desative e reative o Sentry.',
                  'warning'
                );
                return;
              }
              setShowSentryMobileCapture(false);
              setLastSentryError(null);
              setIsSentryScanning(true);
              try {
                const fullResult = await runSentryScanFromImage({
                  imageDataUrl,
                  userId: user?.uid,
                  consumeCredit: async () => true,
                });
                setLastSentryResult(fullResult);
                setSentryHistory((prev) => [...prev.slice(-19), { result: fullResult, timestamp: new Date().toISOString() }]);
                if (fullResult.score >= 50) {
                  showNotification(`⚠️ Conteúdo com IA detectado! Risco: ${fullResult.score}%`, "warning");
                }
              } catch (err: any) {
                if (err?.code === "CREDITS_INSUFFICIENT") {
                  setUpgradeReason("LIMIT");
                  setIsLimitModalOpen(true);
                }
                const sentryErr = normalizeSentryError(err);
                setLastSentryError(sentryErr.message);
                showNotification(sentryErr.message, "error");
              } finally {
                setIsSentryScanning(false);
              }
            }}
            consumeCredit={async () => consumeCreditRef.current()}
            onLimitReached={() => { setShowSentryMobileCapture(false); setUpgradeReason('LIMIT'); setIsLimitModalOpen(true); }}
          />
        )}
        {showSocialNetworkPicker && (
          <SocialNetworkPickerModal
            isOpen={showSocialNetworkPicker}
            onClose={() => setShowSocialNetworkPicker(false)}
            onSelect={handleSocialNetworkSelected}
            mode={socialNetworkPickerMode}
            onConfirm={socialNetworkPickerMode === 'activate' ? handleConfirmAndStartWithPip : undefined}
          />
        )}
        {showRomanticModal && <RomanticScamModal onClose={() => setShowRomanticModal(false)} onActivate={() => { setIsRomanticMode(true); setShowRomanticModal(false); }} />}
        {isFaceScanModalOpen && (
          <FaceScanModal
    consumeCredit={consumeCredit}
    onLimitReached={() => { setIsFaceScanModalOpen(false); setUpgradeReason('LIMIT'); setIsLimitModalOpen(true); }}
    onClose={() => setIsFaceScanModalOpen(false)} 
    onComplete={(res) => { 
      setIsFaceScanModalOpen(false); 
      setPreview({url: res.mediaUrl!, type: 'IMAGE'}) 
    }} 
  />
        )}
        {isCameraModalOpen && (
          <CameraModal 
            onClose={() => setIsCameraModalOpen(false)}
            consumeCredit={consumeCredit}
            onLimitReached={() => { setIsCameraModalOpen(false); setUpgradeReason('LIMIT'); setIsLimitModalOpen(true); }}
            userId={user?.uid}
            onComplete={(res) => {
              setIsCameraModalOpen(false);
              setPreview({ url: res.mediaUrl!, type: res.mediaType as any });
              setState(prev => ({ ...prev, currentResult: res }));
            }}
          />
        )}
        
        {showLanguageModal && (
          <div
            className="fixed inset-0 z-[700] flex items-center justify-center p-4"
            onClick={() => setShowLanguageModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-modal-title"
          >
            <div
              className="bg-[#0a0f1e] border border-blue-500/30 rounded-xl p-4 w-full max-w-[260px] shadow-2xl space-y-3 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowLanguageModal(false)} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors rounded-lg" aria-label="Fechar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="text-center space-y-0.5 pr-6">
                <h3 id="language-modal-title" className="text-[11px] font-black text-white uppercase tracking-tight">{t.systemLanguage}</h3>
                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">{t.selectTranslation}</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { id: 'PT', label: 'Português', sub: 'Brasil' },
                  { id: 'EN', label: 'English', sub: 'United States' },
                  { id: 'ES', label: 'Español', sub: 'España' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={async () => { await setUserLang(lang.id as 'PT' | 'EN' | 'ES'); setShowLanguageModal(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all border text-left ${userLang === lang.id ? 'bg-blue-600/15 border-blue-500/60' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                  >
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${userLang === lang.id ? 'text-blue-400' : 'text-white'}`}>{lang.label}</p>
                      <p className="text-[7px] font-mono text-gray-500 uppercase">{lang.sub}</p>
                    </div>
                    {userLang === lang.id && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-center text-[6px] font-mono text-gray-600 uppercase tracking-wider leading-tight">{t.langChangesInstant}</p>
            </div>
          </div>
        )}

        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <div className="w-full max-w-lg bg-[#01040a] rounded-[2.5rem] p-10 border border-blue-500/40 text-center space-y-6 shadow-[0_0_60px_rgba(37,99,235,0.2)]">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white">{t.limitModalTitle}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                {upgradeReason === 'LIMIT' ? t.limitModalDesc : t.limitModalPremium}
              </p>
              {upgradeReason === 'LIMIT' && (
                <p className="text-amber-400/90 text-xs font-bold italic">
                  {[t.upgradeAd1, t.upgradeAd2, t.upgradeAd3, t.upgradeAd4, t.upgradeAd5][Math.floor(Math.random() * 5)]}
                </p>
              )}
              <p className="text-blue-400 text-xs font-bold">{getFromPriceText(userLang as 'PT' | 'EN' | 'ES')}</p>
              <button
                onClick={() => { setIsLimitModalOpen(false); setView('INFO'); }}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-black uppercase text-sm tracking-widest text-white shadow-lg shadow-blue-500/30 transition-all"
              >
                {t.subscribeNow}
              </button>
              {upgradeReason === 'LIMIT' && (
                <p className="text-gray-500 text-[10px]">Ou compre 10 análises por R$ 9,90</p>
              )}
              {upgradeReason === 'LIMIT' && (
                <button
                  onClick={() => { setIsLimitModalOpen(false); setView('INFO'); }}
                  className="w-full py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition-all"
                >
                  Comprar 10 análises — R$ 9,90
                </button>
              )}
              <button onClick={() => setIsLimitModalOpen(false)} className="text-xs font-bold text-gray-500 hover:text-gray-400 uppercase transition-colors">{t.later}</button>
            </div>
          </div>
        )}

        {showReasoningAgentModal && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <div className="w-full max-w-lg bg-[#01040a] rounded-[2.5rem] p-10 border border-blue-500/40 text-center space-y-6 shadow-[0_0_60px_rgba(37,99,235,0.2)]">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-white">{t.reasoningAgentModalTitle}</h2>
              <p className="text-gray-400 text-sm leading-relaxed text-left">{t.reasoningAgentModalDesc}</p>
              <p className="text-blue-400/90 text-xs leading-relaxed text-left whitespace-pre-line">{t.reasoningAgentModalBenefits}</p>
              <button
                onClick={() => { setShowReasoningAgentModal(false); setView('INFO'); }}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-black uppercase text-sm tracking-widest text-white shadow-lg shadow-blue-500/30 transition-all"
              >
                {t.subscribeNow}
              </button>
              <button onClick={() => setShowReasoningAgentModal(false)} className="text-xs font-bold text-gray-500 hover:text-gray-400 uppercase transition-colors">{t.later}</button>
            </div>
          </div>
        )}

        {!user && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rs_pending_payment_sync') && (
          <div className="mx-4 mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">{t.paymentReceived}</p>
            <button onClick={() => { setView('PROFILE'); setProfileSubView('MAIN'); }} className="shrink-0 py-2 px-4 bg-green-600 rounded-xl font-black text-[9px] uppercase tracking-widest text-white">{t.enter}</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto">
        <main className="flex-1 min-w-0 max-w-4xl mx-auto">
          <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
          {view === 'INFO' ? <InfoPage theme={theme} onBack={() => setView('HOME')} plans={plansWithPrices} onSelectPlan={(p) => { setSelectedPlan(p); setView('CHECKOUT'); }} purchasedPlanId={effectivePlanId} onDevApiClick={() => setView('DEV_API')} onApiPlansClick={() => { setApiPlansFrom('INFO'); setView('API_PLANS'); }} /> :
           view === 'CHECKOUT' && selectedPlan ? <CheckoutPage plan={selectedPlan} userId={user?.uid || 'guest'} onBack={() => setView(selectedPlan?.id?.startsWith?.('api_') ? 'API_PLANS' : 'INFO')} onSuccess={() => setView('SUCCESS')} /> :
           view === 'SUCCESS' || view === 'EXTERNAL_SUCCESS' ? <PaymentSuccess plan={selectedPlan || plansWithPrices[1]} onFinish={handleFinishSuccess} /> :
           view === 'LOGIN' ? <LoginPage onLogin={() => { setView('HOME'); setLoginFromEntryChoice(false); }} onBack={() => { if (loginFromEntryChoice) { setShowEntryChoice(true); setAppMode(null); setLoginFromEntryChoice(false); } else { setView('PROFILE'); } }} onGuestLogin={() => { setView('HOME'); setLoginFromEntryChoice(false); }} /> :
           view === 'PROFILE' ? <ProfilePage onBack={() => setView('HOME')} onOpenLoginPage={() => setView('LOGIN')} profilePic={profilePic} userName={userName} userEmail={user?.email || null} purchasedPlanId={effectivePlanId} credits={state.userStats?.credits} monthlyCredits={state.userStats?.monthlyCredits} plans={plansWithPrices} onUpgrade={() => setView('INFO')} onLogout={async () => { healthService.clearPendingAlerts(); await logout(); setView('LOGIN'); }} onDeleteAccount={async () => { await deleteUserAccount(); setView('LOGIN'); }} isGuest={isGuest} profileSubView={profileSubView} setProfileSubView={setProfileSubView} onSync={handleSyncAccount} onAdminClick={() => setView('ADMIN')} userId={user?.uid ?? null} onGoToDatabase={() => setView('BUSINESS_PANEL')} onGoToApiDev={() => setView('DEV_API')} onThemeToggle={toggleTheme} theme={theme} referralCode={state.userStats?.referralCode} referralCount={state.userStats?.referralCount} referralCreditsEarned={state.userStats?.referralCreditsEarned} onViewAnalysisFromHistory={(result) => { setProfileSubView('MAIN'); setPreview(result.mediaUrl ? { url: result.mediaUrl, type: (result.mediaType || 'IMAGE') } : null); setState(prev => ({ ...prev, currentResult: result })); setView('HOME'); }} /> :
           view === 'BUSINESS_PANEL' ? <BusinessAdminPanel onBack={() => setView('HOME')} onGoToScan={() => setView('HOME')} /> :
           view === 'DEV_API' ? <DevApiPanel onBack={() => setView(user ? 'PROFILE' : 'HOME')} onUpgrade={() => { setApiPlansFrom('DEV_API'); setView('API_PLANS'); }} onLogin={() => setView('LOGIN')} /> :
           view === 'API_PLANS' ? <ApiPlansPage onSelectPlan={(plan) => { setSelectedPlan(plan); setView('CHECKOUT'); }} /> :
           state.currentResult ? (
             <ForensicReport result={state.currentResult} onReset={handleBackFromReport} mediaPreview={preview} userLang={userLang} userId={user?.uid} isBusinessPlan={isCurrentlyBusiness} />
           ) : state.bulkResults ? (
             <BulkSummary results={state.bulkResults} onBack={resetAnalysis} onViewReport={(r) => { cameFromBulkRef.current = true; setPreview({url: r.mediaUrl!, type: r.mediaType!}); setState(prev => ({ ...prev, currentResult: r })); }} />
           ) : !state.currentResult ? (
             <div className="space-y-8 animate-in fade-in duration-1000">
               {(!user || !hasPremiumAccess) && (
                 <UpgradeAdBanner
                   messages={[t.upgradeAd1, t.upgradeAd2, t.upgradeAd3, t.upgradeAd4, t.upgradeAd5]}
                   ctaSubscribe={t.upgradeAdCta}
                   ctaCredits={t.upgradeAdCreditsCta}
                   userLang={userLang}
                   onSubscribe={() => setView('INFO')}
                   onBuyCredits={() => setView('INFO')}
                   theme={theme}
                 />
               )}
                 <div className="flex flex-col md:flex-row justify-center items-center gap-4 px-2">
                  <div className="flex items-center space-x-3">
                    {state.userStats && (
                      <div className="flex items-center space-x-2">
                        <div className={`px-3 py-2 rounded-xl flex items-center space-x-2 ${theme === 'light' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-purple-500/10 border border-purple-500/20'}`}>
                          <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`}>Créditos: {state.userStats?.credits ?? 999}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-xl flex items-center space-x-2 ${theme === 'light' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                          <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>Mensal: {state.userStats?.monthlyCredits ?? 500}</span>
                        </div>
                        
                        <button 
                          onClick={handleSyncAccount}
                          className={`p-2 rounded-xl transition-all group ${theme === 'light' ? 'bg-gray-200/80 border border-gray-300 hover:bg-gray-300' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                          title="Sincronizar Plano"
                        >
                          <svg className={`w-3 h-3 group-hover:text-blue-400 ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isRomanticMode ? 'text-pink-500' : theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>
                      {isRomanticMode ? t.romanticDefense : t.romanticScam}
                    </span>
                    <div onClick={handleRomanticToggle} className="relative w-12 h-5 flex items-center cursor-pointer select-none">
                      <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isRomanticMode ? 'bg-pink-600/50 shadow-[0_0_15px_rgba(219,39,119,0.3)]' : theme === 'light' ? 'bg-gray-200' : 'bg-white/5'}`}></div>
                      <div className={`absolute w-4 h-4 rounded-full shadow-lg transition-all duration-300 transform flex items-center justify-center ${theme === 'light' ? 'bg-white' : 'bg-white'} ${isRomanticMode ? 'translate-x-7' : 'translate-x-1'}`}>
                         {isRomanticMode && <div className="w-1 h-1 bg-pink-600 rounded-full animate-pulse"></div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`relative rounded-[3rem] p-12 overflow-hidden ${theme === 'light' ? 'bg-gradient-to-b from-blue-50 to-indigo-50 border border-gray-200 shadow-lg' : 'bg-gradient-to-b from-[#0b1020] to-[#050814] border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.6)]'}`}>

  {/* glow tech */}
  {theme === 'dark' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,174,255,0.12),transparent_60%)] pointer-events-none"></div>}

  {state.isScanning && <ScannerOverlay previewUrl={preview?.url} currentStepText={SCAN_STEPS[currentStep]} currentStep={currentStep} totalSteps={SCAN_STEPS.length} />}

  <div className={`transition-all duration-300 ${state.isScanning ? 'opacity-0 scale-[0.98] pointer-events-none invisible' : 'opacity-100'}`}>

    {/* topo */}
    <div className="mb-10 text-center">
      <p className="text-[10px] font-mono text-blue-500 uppercase tracking-[0.4em] mb-3">
        REALITYSCAN FORENSIC CORE
      </p>

      <h2 className={`text-xs md:text-sm font-black tracking-widest ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
        {t.startForensicScan}
      </h2>

      <div className="w-32 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto mt-6"></div>
    </div>

    {/* botões principais */}
    <div className="flex flex-col md:flex-row items-center justify-center gap-6">

      <button
        onClick={() => setIsCameraModalOpen(true)}
        className="relative px-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] 
        bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-[0_0_40px_rgba(147,51,234,0.4)] hover:scale-105 transition-all duration-300"
      >
        {t.forensicCamera}
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className={`px-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] backdrop-blur-md hover:scale-105 transition-all ${theme === 'light' ? 'bg-white/80 border border-gray-200 text-gray-900 hover:bg-white shadow-md' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
      >
        {t.forensicUpload}
      </button>

    </div>

    {/* input file hidden */}
    <input 
      type="file" 
      ref={fileInputRef} 
      className="hidden" 
      onChange={handleFileUpload} 
      multiple={isCurrentlyBusiness} 
    />

    {/* status business */}
    {isCurrentlyBusiness && (
      <div className="mt-10 text-center">
        <span className="px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-[0.3em]">
          {t.businessMode}
        </span>
      </div>
    )}

  </div>

  {/* overlay scanning removed - moved to ScannerOverlay */}

</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-6 rounded-[2rem] space-y-3 flex flex-col justify-between text-center relative overflow-hidden ${isSentryActive ? 'bg-red-950/30 border-2 border-red-500/40' : theme === 'light' ? 'bg-white/90 border-2 border-blue-400/50 shadow-lg' : 'bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border-2 border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.15)]'}`}>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 justify-center mb-1">
                        <h4 className={`text-xs font-black uppercase tracking-widest ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>{t.feedScam}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[7px] font-black text-amber-400 uppercase tracking-wider">DESTAQUE</span>
                      </div>
                      <p className={`text-[10px] font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t.feedScamDesc}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={handleToggleSentry} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${isSentryActive ? 'bg-red-600/30 text-red-400 border border-red-500/50 hover:bg-red-600/40' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25'}`}>
                        <Share2 className="w-4 h-4" />
                        {isSentryActive ? t.deactivateMonitor : t.activateShort}
                      </button>
                      {!isSentryActive && (
                        <button onClick={handleOpenNetworkPicker} className={`py-4 px-4 rounded-xl text-[10px] font-black uppercase border transition-all ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-blue-600' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-blue-400'}`}>
                          {t.changeNetwork}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`p-6 rounded-[2rem] space-y-3 flex flex-col justify-between text-center ${theme === 'light' ? 'bg-white/90 border border-gray-200 shadow-md' : 'bg-white/5 border border-white/5'}`}>
                    <div>
                      <h4 className={`text-xs font-black uppercase tracking-widest ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>{t.faceScam}</h4>
                      <p className={`text-[10px] font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>{t.faceScamDesc}</p>
                    </div>
                  </div>
                  <div className={`p-6 rounded-[2rem] space-y-3 flex flex-col justify-between text-center ${theme === 'light' ? 'bg-white/90 border border-gray-200 shadow-md' : 'bg-white/5 border border-white/5'}`}>
                    <div>
                      <h4 className={`text-xs font-black uppercase tracking-widest ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`}>{t.voiceScam}</h4>
                      <p className={`text-[10px] font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>{t.voiceScamDesc}</p>
                    </div>
                    <button onClick={() => audioInputRef.current?.click()} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase mt-4 transition-all ${theme === 'light' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>{t.uploadAudio}</button>
                    <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </div>
                </div>

                {/* Botão Upgrade - abaixo dos três modais */}
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setView('INFO')}
                    className={`group relative px-12 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.3em] overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 ${
                      theme === 'light'
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-gray-900 shadow-[0_8px_30px_rgba(245,158,11,0.4)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.5)]'
                        : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-gray-900 shadow-[0_8px_30px_rgba(245,158,11,0.35)] hover:shadow-[0_0_40px_rgba(245,158,11,0.25)]'
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Zap className="w-5 h-5" />
                      {t.apiUpgrade}
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </button>
                </div>

                {/* Mini-cards de créditos - abaixo dos três botões FeedScan, FaceScan, VoiceScan (visível para todos: visitantes, convidados e logados) */}
                <div className="mt-8 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`}>{t.creditsSection}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { amount: 5, id: 'credits_5' },
                      { amount: 20, id: 'credits_20' },
                      { amount: 50, id: 'credits_50' },
                    ].map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => {
                          setSelectedPlan({
                            id: pack.id,
                            level: t.creditsSection,
                            name: `${pack.amount} Scans`,
                            price: getCreditsPrice(userLang as 'PT' | 'EN' | 'ES', pack.id),
                            description: '',
                            features: [],
                            cta: t.buyNow,
                            colorClass: 'bg-purple-600',
                            type: 'credits',
                            amount: pack.amount
                          });
                          setView('CHECKOUT');
                        }}
                        className={`credit-card-animate p-2.5 rounded-xl backdrop-blur-sm transition-all duration-300 text-left group hover:scale-[1.03] active:scale-95 min-w-[90px] ${theme === 'light' ? 'bg-white border border-gray-200 hover:border-purple-400 hover:shadow-lg shadow-md' : 'bg-[#0b1120]/95 border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_16px_rgba(147,51,234,0.3)]'}`}
                      >
                        <div className={`text-sm font-black transition-colors ${theme === 'light' ? 'text-gray-900 group-hover:text-purple-600' : 'text-white group-hover:text-purple-300'}`}>{pack.amount}</div>
                        <div className={`text-[5px] uppercase ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>Scans</div>
                        <div className={`text-[8px] font-bold mt-0.5 transition-colors ${theme === 'light' ? 'text-purple-600 group-hover:text-purple-700' : 'text-purple-400 group-hover:text-purple-300'}`}>{getCreditsPrice(userLang as 'PT' | 'EN' | 'ES', pack.id)}</div>
                        <div className="mt-1.5 py-1 rounded-md bg-gradient-to-r from-purple-600 to-purple-500 text-[5px] font-black uppercase tracking-wider text-white text-center group-hover:brightness-110 transition-all duration-300">
                          {t.buyNow}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

             </div>
           ) : null
          }
          </Suspense>
        </main>
        </div>
        {view !== 'LOGIN' && (
          <AppFooter onNavigate={(v) => setView(v)} onOpenLanguage={() => setShowLanguageModal(true)} variant={view === 'API_PLANS' || theme === 'light' ? 'light' : 'dark'} />
        )}
        <ScrollToTopButton theme={theme} />
      </div>
    </div>
  );
};

export default App;