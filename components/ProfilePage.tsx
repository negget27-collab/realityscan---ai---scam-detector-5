import React, { useState, useEffect } from 'react';
import { PlanConfig } from '../types';
import { loginWithGoogle, loginWithFacebook, loginWithGitHub, loginWithApple, loginWithEmail, registerWithEmail, sendPasswordReset, logFailedLoginAttempt, logRegistrationAttempt, isGmailEmail, saveUserData, auth, getPurchaseHistory, getAnalysesHistory } from '../services/firebase';
import { useI18n } from '../services/i18n-temp';
import { useTheme } from '../contexts/ThemeContext';
import { TermsOfUse } from './TermsOfUse';
import { FileText, ChevronRight } from 'lucide-react';

const AnalysesHistoryList: React.FC<{ userId: string; onView: (result: any) => void; theme?: 'dark' | 'light' }> = ({ userId, onView, theme = 'dark' }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isLight = theme === 'light';

  useEffect(() => {
    let cancelled = false;
    getAnalysesHistory(userId).then((data) => {
      if (!cancelled) setList(data || []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <p className={isLight ? 'text-gray-500 text-sm' : 'text-gray-400 text-sm'}>
        Nenhuma análise com detecção de IA salva ainda. As análises em que a IA é detectada aparecem aqui.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {list.map((item) => (
        <button
          key={item.id}
          onClick={() => onView(item)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
            isLight ? 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/50' : 'bg-white/5 border-white/10 hover:border-blue-500/30 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${isLight ? 'bg-blue-100' : 'bg-blue-500/10'}`}>
              <FileText className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{item.fileName || 'Análise'}</p>
              <p className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{item.date || item.timestamp ? new Date(item.timestamp).toLocaleDateString('pt-BR') : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-black ${(item.score >= 50 ? 'text-red-500' : 'text-green-500')}`}>{item.score ?? 0}%</span>
            <ChevronRight className={`w-4 h-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
        </button>
      ))}
    </div>
  );
};

interface ProfilePageProps {
  onBack: () => void;
  onOpenLoginPage?: () => void;
  profilePic: string | null;
  userName: string | null;
  userEmail: string | null;
  purchasedPlanId: string | null;
  credits?: number;
  monthlyCredits?: number;
  plans: PlanConfig[];
  onUpgrade: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isGuest?: boolean;
  profileSubView: 'MAIN' | 'TERMS' | 'PLAN' | 'HISTORY';
  setProfileSubView: (view: 'MAIN' | 'TERMS' | 'PLAN' | 'HISTORY') => void;
  onViewAnalysisFromHistory?: (result: any) => void;
  onSync?: () => Promise<void>;
  onAdminClick?: () => void;
  userId?: string | null;
  onGoToDatabase?: () => void;
  onGoToApiDev?: () => void;
  referralCode?: string | null;
  referralCount?: number;
  referralCreditsEarned?: number;
  onThemeToggle?: () => void;
  theme?: 'dark' | 'light';
}

const MenuButton: React.FC<{ 
  label: string; 
  icon: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'default' | 'danger' | 'business' | 'success' | 'info';
  badge?: string;
  disabled?: boolean;
  theme?: 'dark' | 'light';
}> = ({ label, icon, onClick, variant = 'default', badge, disabled, theme = 'dark' }) => {
  const isBusiness = variant === 'business';
  const isLight = theme === 'light';
  const defaultBg = isLight ? 'bg-gray-100 border-gray-200 hover:bg-gray-200 hover:border-blue-400' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-blue-500/30';
  
  return (
    <button 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all border group ${
        disabled
          ? 'bg-gray-500/5 border-gray-500/10 cursor-not-allowed opacity-60'
          : variant === 'danger' 
            ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30' 
            : variant === 'success'
              ? 'bg-green-500/5 border-green-500/10 hover:bg-green-500/10 hover:border-green-500/40 shadow-[0_10px_10px_rgba(34,197,94,0.05)]'
              : isBusiness
                ? 'bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/40 shadow-[0_10px_10px_rgba(245,158,11,0.05)]'
                : variant === 'info'
                  ? 'bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/30'
                  : defaultBg
      }`}
    >
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className={`p-1.5 rounded-lg shrink-0 ${
          variant === 'danger' ? 'text-red-500' : 
          variant === 'success' ? 'text-green-500' :
          isBusiness ? 'text-amber-500' : 'text-blue-400 group-hover:text-blue-300'
        }`}>
          {icon}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-[0.15em] truncate ${
          disabled ? 'text-gray-500' :
          variant === 'danger' ? 'text-red-400' : 
          variant === 'success' ? 'text-green-400' :
          isBusiness ? 'text-amber-500' : (isLight ? 'text-gray-700' : 'text-gray-300')
        }`}>
          {label}
        </span>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        {badge && (
          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[7px] font-mono font-black">
            {badge}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 ${
          disabled ? 'text-gray-600' :
          variant === 'danger' ? 'text-red-900' : 
          variant === 'success' ? 'text-green-900/40 group-hover:text-green-500' :
          isBusiness ? 'text-amber-900/40 group-hover:text-amber-500' : 'text-gray-700 group-hover:text-blue-500 group-hover:translate-x-0.5'
        } transition-all`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};

const AuthModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const validateForm = () => {
    if (!email || !password) {
      setError(t.fillRequired);
      return false;
    }
    
    if (password.length < 8) {
      setError(t.passwordMin);
      return false;
    }

    if (mode === 'REGISTER' && password !== confirmPassword) {
      setError(t.passwordsMismatch);
      return false;
    }

    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (mode === 'REGISTER' && !isGmailEmail(email)) {
      setError(t.registerGmailOnly);
      logRegistrationAttempt(email, false);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      if (mode === 'LOGIN') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
        logRegistrationAttempt(email, true);
        onClose();
        return;
      }
      onClose();
    } catch (err: any) {
      if (mode === 'REGISTER') logRegistrationAttempt(email, false);
      if (err.code === 'auth/email-already-in-use') {
        setError(t.emailAlreadyRegistered);
      } else if (err.code === 'auth/email-domain-not-allowed') {
        setError(t.registerGmailOnly);
      } else if (err.code === 'auth/invalid-credential') {
        logFailedLoginAttempt(email);
        setError(t.invalidCredentials);
      } else {
        setError(t.authTechFail);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSocialLogin = async (loginFn: () => Promise<any>, errorKey: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await loginFn();
      onClose();
    } catch (err) {
      setError((t as any)[errorKey] || t.authTechFail);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email?.trim()) {
      setError(t.fillRequired);
      return;
    }
    setIsProcessing(true);
    setError(null);
    setResetSuccess(false);
    try {
      await sendPasswordReset(email.trim());
      setResetSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError(t.resetEmailNotFound);
      } else if (err.code === 'auth/invalid-email') {
        setError(t.invalidEmail);
      } else {
        setError(t.resetPasswordFail);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0a0f1e] border border-blue-500/30 rounded-[2.5rem] p-6 md:p-8 w-full max-w-[340px] shadow-2xl space-y-4 relative overflow-hidden flex flex-col max-h-[85vh] custom-scrollbar">
        <div className="text-center space-y-1">
          <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            {mode === 'RESET' ? t.resetPasswordTitle : mode === 'LOGIN' ? t.restrictedAccess : t.newAgent}
          </h3>
          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.4em] font-black leading-relaxed">REALITYSCAN DEFENSE PROTOCOL</p>
        </div>

        <div className="flex-1 space-y-3">
          {error && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 animate-in shake duration-300">{error}</p>}
          {resetSuccess && <p className="text-[10px] font-black text-green-500 uppercase tracking-widest text-center bg-green-500/10 py-3 rounded-xl border border-green-500/20">{t.resetPasswordSuccess}</p>}

          {mode === 'RESET' ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest ml-1 font-black">{t.operationalEmail}</label>
                <input 
                  type="email" 
                  placeholder="exemplo@defesa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs font-mono text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <p className="text-[9px] text-gray-500 leading-relaxed">{t.resetPasswordDesc}</p>
              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_15px_30px_rgba(37,99,235,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? t.sending : t.resetPasswordSend}
              </button>
              <button 
                type="button"
                onClick={() => { setMode('LOGIN'); setError(null); setResetSuccess(false); }}
                className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-500 transition-colors"
              >
                {t.backToLogin}
              </button>
            </form>
          ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest ml-1 font-black">{t.operationalEmail}</label>
              <input 
                type="email" 
                placeholder="exemplo@defesa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs font-mono text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest ml-1 font-black">{t.cryptoKey}</label>
                {mode === 'LOGIN' && (
                  <button type="button" onClick={() => { setMode('RESET'); setError(null); }} className="text-[8px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">
                    {t.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs font-mono text-white outline-none focus:border-blue-500 transition-all pr-12"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-4 duration-300">
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest ml-1 font-black">{t.confirmKey}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`w-full bg-black/40 border rounded-xl px-5 py-4 pr-12 text-xs font-mono text-white outline-none focus:ring-1 transition-all ${
                      confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:ring-red-500' : 'border-white/10 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_15px_30px_rgba(37,99,235,0.3)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? t.syncing : mode === 'LOGIN' ? t.enterTerminalBtnShort : t.registerAgentBtn}
            </button>
          </form>
          )}

          {mode !== 'RESET' && (
          <>
          <div className="flex items-center space-x-3 opacity-20 my-1">
            <div className="h-[1px] flex-1 bg-white"></div>
            <span className="text-[8px] font-mono font-black">PROTOCOL_OAUTH</span>
            <div className="h-[1px] flex-1 bg-white"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSocialLogin(loginWithGoogle, 'googleHandshakeFail')}
              disabled={isProcessing}
              className="py-3 bg-white text-black rounded-xl font-black uppercase tracking-[0.1em] text-[9px] flex items-center justify-center gap-2 transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-50 shadow-xl"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span>{t.syncViaGoogle}</span>
            </button>
            <button 
              onClick={() => handleSocialLogin(loginWithFacebook, 'facebookAuthFail')}
              disabled={isProcessing}
              className="py-3 bg-[#1877F2] text-white rounded-xl font-black uppercase tracking-[0.1em] text-[9px] flex items-center justify-center gap-2 transition-all hover:bg-[#166FE5] active:scale-95 disabled:opacity-50 shadow-xl"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span>{t.loginWithFacebook}</span>
            </button>
            <button 
              onClick={() => handleSocialLogin(loginWithGitHub, 'githubAuthFail')}
              disabled={isProcessing}
              className="py-3 bg-[#24292e] text-white rounded-xl font-black uppercase tracking-[0.1em] text-[9px] flex items-center justify-center gap-2 transition-all hover:bg-[#1b1f23] active:scale-95 disabled:opacity-50 shadow-xl"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span>{t.loginWithGitHub}</span>
            </button>
            <button 
              onClick={() => handleSocialLogin(loginWithApple, 'appleAuthFail')}
              disabled={isProcessing}
              className="py-3 bg-black text-white rounded-xl font-black uppercase tracking-[0.1em] text-[9px] flex items-center justify-center gap-2 transition-all hover:bg-gray-900 active:scale-95 disabled:opacity-50 shadow-xl border border-white/20"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              <span>{t.loginWithApple}</span>
            </button>
          </div>
          </>
          )}
        </div>

        <div className="space-y-3 pt-1">
          {mode !== 'RESET' && (
          <button 
            onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-500 transition-colors"
          >
            {mode === 'LOGIN' ? t.noAccess : t.hasCredentials}
          </button>
          )}
          
          <div className="border-t border-white/5 pt-4">
            <button 
              onClick={onClose}
              className="w-full py-3 border border-white/10 rounded-xl text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
            >
              {t.backToProfile}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlanDetailsView: React.FC<{ 
  plan: PlanConfig; 
  onUpgrade?: () => void;
  isAnnual?: boolean;
  userId?: string | null;
  onGoToDatabase?: () => void;
  onGoToApiDev?: () => void;
}> = ({ plan, onUpgrade, isAnnual, userId, onGoToDatabase, onGoToApiDev }) => {
  const { t } = useI18n();
  const isPremium = plan.id !== 'community';
  const isBusiness = plan.id === 'business';
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + (isAnnual ? 12 : 1));
  const formattedDate = nextBilling.toLocaleDateString('pt-BR');

  useEffect(() => {
    if (!userId) return;
    setLoadingPurchases(true);
    getPurchaseHistory(userId).then(setPurchases).finally(() => setLoadingPurchases(false));
  }, [userId]);

  const formatPurchaseDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-20 animate-in slide-in-from-right-10 duration-500">
      <div className={`relative rounded-[2.5rem] p-8 md:p-10 space-y-10 shadow-2xl overflow-hidden border bg-white ${isBusiness ? 'border-amber-500/30' : 'border-blue-500/20'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className={`text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isBusiness ? 'bg-amber-600' : 'bg-blue-600'}`}>{t.statusActive}</span>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-black">{plan.level}</span>
            </div>
            <h2 className="text-5xl font-black text-gray-900 uppercase italic tracking-tighter">{plan.name} {isAnnual ? '(ANUAL)' : ''}</h2>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-black ${isBusiness ? 'text-amber-600' : 'text-blue-600'}`}>{plan.price}</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] font-black mt-1">{isAnnual ? t.annualCycle : t.monthlyCycle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-200">
          <div className="space-y-6">
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.5em] font-black">{t.activeProtocols}</h3>
            <ul className="space-y-4">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start space-x-3 group">
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isBusiness ? 'bg-amber-500' : 'bg-blue-500'} group-hover:scale-150 transition-transform`}></div>
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.5em] font-black">{t.operationalDetails}</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-black">{t.autoRenewal}</p>
                <p className="text-sm font-black text-gray-900">{formattedDate}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-black">{t.batchLimit}</p>
                <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                  {isBusiness ? t.batchLimitBusiness : isPremium ? t.batchLimitAdvanced : t.batchLimitFree}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-black">{t.networkPriority}</p>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= (isBusiness ? 5 : isPremium ? 3 : 1) ? (isBusiness ? 'bg-amber-500' : 'bg-blue-500') : 'bg-gray-200'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {userId && (
          <div className="pt-8 border-t border-gray-200 space-y-4">
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.5em] font-black">{t.purchaseHistory}</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 max-h-48 overflow-y-auto">
              {loadingPurchases ? (
                <p className="text-xs text-gray-500 font-mono">Carregando...</p>
              ) : purchases.length === 0 ? (
                <p className="text-xs text-gray-500 font-mono">{t.noPurchases}</p>
              ) : (
                <ul className="space-y-3">
                  {purchases.map((p) => (
                    <li key={p.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-xs font-black text-gray-700 uppercase">
                        {p.type === 'credits' ? t.purchaseTypeCredits : t.purchaseTypeSubscription} — {p.planId}
                        {p.amount ? ` (+${p.amount})` : ''}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">{formatPurchaseDate(p.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="pt-8 space-y-4">
          {onGoToApiDev && (
            <button 
              onClick={onGoToApiDev}
              className="w-full py-5 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-blue-600/30 hover:border-blue-500/60 transition-all text-[10px] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              API para Desenvolvedores
            </button>
          )}
          {isBusiness && onGoToDatabase && (
            <button 
              onClick={onGoToDatabase}
              className="w-full py-5 bg-amber-600/20 border border-amber-500/40 text-amber-400 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-amber-600/30 hover:border-amber-500/60 transition-all text-[10px] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
              {t.accessDatabaseIA}
            </button>
          )}
          {plan.id === 'community' && onUpgrade ? (
            <button 
              onClick={onUpgrade}
              className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/30 text-[11px] animate-pulse"
            >
              {t.upgradeOperational}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => window.open('https://www.mercadopago.com.br/subscriptions', '_blank')}
                className="flex-1 py-5 bg-gray-100 border border-gray-200 text-gray-700 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-gray-200 transition-all text-[10px]"
              >
                {t.manageSubscription}
              </button>
              {plan.id === 'advanced' && onUpgrade && (
                <button 
                  onClick={onUpgrade}
                  className="flex-1 py-5 bg-amber-600 text-black rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-amber-500 transition-all text-[10px] shadow-xl shadow-amber-500/10"
                >
                  {t.migrateToBusiness}
                </button>
              )}
            </div>
          )}
          <p className="text-[8px] font-mono text-gray-700 uppercase text-center tracking-[0.3em]">
            RealityScan Blockchain Verified ID: {Math.random().toString(36).substring(7).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onBack,
  onOpenLoginPage,
  profilePic,
  userName,
  userEmail,
  purchasedPlanId, 
  credits = 0,
  monthlyCredits = 0,
  plans,
  onUpgrade,
  onLogout,
  onDeleteAccount,
  isGuest,
  profileSubView,
  setProfileSubView,
  onSync,
  onAdminClick,
  userId,
  onGoToDatabase,
  onGoToApiDev,
  onThemeToggle,
  theme = 'dark',
  referralCode,
  referralCount = 0,
  referralCreditsEarned = 0,
  onViewAnalysisFromHistory,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { t } = useI18n();
  const { theme: ctxTheme, toggleTheme } = useTheme();
  const effectiveTheme = theme ?? ctxTheme;
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(userName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(true);

  useEffect(() => {
    fetch('/api/health').then(r => r.ok && r.json()).then(d => setIsAdminOnline(d?.status === 'online')).catch(() => setIsAdminOnline(false));
  }, []);

  // Normalização para exibição
  const normalizedId = purchasedPlanId?.replace('_annual', '') || 'community';
  const isAnnual = purchasedPlanId?.includes('annual');
  const isCommunity = normalizedId === 'community' || normalizedId === 'free';
  const isAdvanced = normalizedId === 'advanced';

  useEffect(() => {
    if (userName) setLocalName(userName);
  }, [userName]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [profileSubView]);

  const handleConfirmDelete = async () => {
    if (deleteInput !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } catch (err) {
      alert("Para excluir sua conta, é necessário ter feito login recentemente. Por favor, saia e entre novamente antes de tentar excluir.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteInput('');
    }
  };

  const handleSaveName = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || isGuest) {
      setIsEditingName(false);
      return;
    }

    if (!localName.trim()) {
      alert("O nome não pode estar vazio.");
      return;
    }

    setIsSavingName(true);
    try {
      await saveUserData(userId, { displayName: localName.trim() });
      setIsEditingName(false);
    } catch (err) {
      alert("Erro ao salvar nome. Tente novamente.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSync = async () => {
    if (isGuest || !onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
      // Small delay for visual feedback
      await new Promise(r => setTimeout(r, 800));
    } finally {
      setIsSyncing(false);
    }
  };

  const currentPlan = plans.find(p => p.id === normalizedId) || plans[0];
  const isBusiness = purchasedPlanId?.startsWith('business');

  if (profileSubView === 'TERMS') return <div className={`min-h-screen pt-4 px-6 md:p-12 ${effectiveTheme === 'light' ? 'bg-gray-50' : 'bg-[#030712]'}`}><div className="max-w-2xl mx-auto"><TermsOfUse theme={effectiveTheme} /></div></div>;
  if (profileSubView === 'PLAN') return <div className={`min-h-screen pt-4 px-6 md:p-12 ${effectiveTheme === 'light' ? 'bg-gray-50' : 'bg-[#030712]'}`}><div className="max-w-3xl mx-auto"><PlanDetailsView plan={currentPlan} onUpgrade={onUpgrade} isAnnual={isAnnual} userId={userId} onGoToDatabase={onGoToDatabase} onGoToApiDev={onGoToApiDev} theme={effectiveTheme} /></div></div>;
  if (profileSubView === 'HISTORY' && userId && onViewAnalysisFromHistory) {
    return (
      <div className={`min-h-screen pt-4 px-6 md:p-12 ${effectiveTheme === 'light' ? 'bg-gray-50' : 'bg-[#030712]'}`}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setProfileSubView('MAIN')} className={`mb-6 flex items-center gap-2 text-sm font-bold ${effectiveTheme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            ← {t.back || 'Voltar'}
          </button>
          <h1 className={`text-xl font-black mb-4 ${effectiveTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>Minhas análises</h1>
          <AnalysesHistoryList userId={userId} onView={onViewAnalysisFromHistory} theme={effectiveTheme} />
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-in fade-in duration-700 font-sans ${effectiveTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0a0f1e] border border-blue-500/30 rounded-[2.5rem] p-8 max-w-[280px] w-full shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto text-blue-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">{t.endSessionConfirm}</h3>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">{t.endSessionDesc}</p>
            <div className="pt-4 space-y-3">
              <button 
                onClick={onLogout}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
              >
                {t.yesLogout}
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-[#0a0f1e] border border-red-500/30 rounded-[2.5rem] p-8 max-w-[280px] w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] space-y-5 text-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto text-red-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">{t.deleteConfirm}</h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">{t.deleteConfirmDesc}</p>
            </div>
            
            <input 
              type="text" 
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value.toUpperCase())}
              placeholder={t.typeExcluir}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-center text-sm font-black text-white outline-none focus:border-red-500 transition-colors"
            />

            <div className="pt-2 space-y-3">
              <button 
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteInput !== 'EXCLUIR'}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isDeleting ? t.deleting : t.confirmDelete}
              </button>
              <button 
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10"
              >
                {t.back}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <section className={`relative border rounded-[2rem] py-4 px-6 flex flex-col items-center space-y-2 shadow-2xl overflow-hidden transition-all ${theme === 'light' ? (isBusiness ? 'bg-amber-50 border-amber-500/30' : 'bg-white border-gray-200 shadow-lg') : (isBusiness ? 'bg-[#1a140a] border-amber-500/20' : 'bg-[#0a0f1e] border-white/5')}`}>
          <div className="relative">
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center shadow-2xl relative transition-all duration-500 overflow-hidden ${isBusiness ? theme === 'light' ? 'bg-amber-100 border-amber-500 shadow-amber-500/20' : 'bg-[#030712] border-amber-500 shadow-amber-500/20' : theme === 'light' ? 'bg-blue-50 border-blue-500 shadow-blue-500/20' : 'bg-[#030712] border-blue-500 shadow-blue-500/20'}`}>
              <span className={`text-2xl md:text-3xl font-black italic tracking-tighter select-none ${isBusiness ? 'text-amber-500' : 'text-blue-500'}`}>RS</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none"></div>
              <div className={`absolute inset-0 rounded-full border border-white/5 animate-pulse`}></div>
            </div>
          </div>
            <div className="text-center space-y-1 w-full max-w-[320px]">
            {isEditingName && !isGuest ? (
              <div className="flex items-center space-x-2 animate-in fade-in duration-300">
                <input 
                  type="text" 
                  value={localName} 
                  onChange={(e) => setLocalName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="w-full bg-black/40 border border-blue-500/50 rounded-xl px-4 py-2 text-center text-sm font-black text-white outline-none focus:border-blue-500 transition-all uppercase"
                />
                <button 
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all disabled:opacity-50"
                >
                  {isSavingName ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              </div>
            ) : (
              <div className="group relative flex flex-col items-center justify-center">
                <h2 className={`text-lg font-black uppercase italic tracking-tight truncate max-w-full ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {isGuest ? t.loggedAsGuest : (userName || userEmail || t.verifiedUser)}
                </h2>
                {!isGuest && (
                  <button 
                    onClick={() => { setIsEditingName(true); setLocalName(userName || ""); }}
                    className={`absolute -right-8 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${theme === 'light' ? 'bg-gray-100 border border-gray-200 text-gray-600 hover:text-blue-600' : 'bg-white/5 border border-white/10 text-gray-500 hover:text-blue-500'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                )}
              </div>
            )}
            
            {!isGuest && userEmail && userName !== userEmail && (
              <p className="text-[10px] font-mono text-gray-500 lowercase tracking-wider opacity-60 truncate px-4">{userEmail}</p>
            )}

            <p className={`text-[10px] font-mono uppercase tracking-widest font-black pt-1 ${isBusiness ? 'text-amber-500' : 'text-gray-500'}`}>{t.statusActive} // {currentPlan.name} {isAnnual ? '(ANUAL)' : ''}</p>
            
            {!isGuest && (
              <div className="flex flex-col items-center space-y-3 pt-3">
                <div className="flex items-center justify-center space-x-3">
                  <div className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center space-x-2">
                    <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></div>
                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">{t.credits}: {credits}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center space-x-2">
                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{t.monthly}: {monthlyCredits}</span>
                  </div>
                </div>

                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all group ${theme === 'light' ? 'bg-gray-100 border border-gray-200 hover:bg-gray-200' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                >
                  <svg className={`w-3 h-3 ${theme === 'light' ? 'text-gray-600 group-hover:text-blue-600' : 'text-gray-500 group-hover:text-blue-400'} ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-gray-600 group-hover:text-gray-800' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {isSyncing ? t.syncing : t.syncAccount}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>

        {userId && !isGuest && referralCode && (
          <div className={`mb-6 p-4 rounded-2xl space-y-3 border-2 ${theme === 'light' ? 'bg-emerald-50 border-emerald-300' : 'bg-gradient-to-br from-green-600/20 to-emerald-600/10 border-green-500/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-emerald-800' : 'text-green-300'}`}>Indique e ganhe 5 scans</span>
              <span className={`text-[9px] font-mono font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-green-400'}`}>{referralCount} indicações · +{referralCreditsEarned} scans ganhos</span>
            </div>
            <div className="flex gap-2">
              <input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${referralCode}`} className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-mono truncate ${theme === 'light' ? 'bg-white border-2 border-emerald-200 text-gray-800' : 'bg-black/40 border border-white/10 text-gray-200'}`} />
              <button
                onClick={() => {
                  const url = `${window.location.origin}/?ref=${referralCode}`;
                  navigator.clipboard?.writeText(url).then(() => alert('Link copiado!')).catch(() => {});
                }}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${theme === 'light' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white border border-green-500/50'}`}
              >
                Copiar
              </button>
            </div>
            <p className={`text-[9px] leading-relaxed ${theme === 'light' ? 'text-emerald-800/90' : 'text-green-400/90'}`}>Quando alguém entrar pelo seu link e assinar ou comprar créditos, você ganha 5 scans.</p>
          </div>
        )}

        <div className="space-y-4">
          <p className={`text-[9px] font-mono uppercase tracking-[0.4em] font-black pl-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-700'}`}>{t.operationalMgmt}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <MenuButton theme={theme} label={t.myPlan} onClick={() => setProfileSubView('PLAN')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} />
            {userId && onViewAnalysisFromHistory && (
              <MenuButton theme={theme} label="Minhas análises" onClick={() => setProfileSubView('HISTORY')} icon={<FileText className="w-5 h-5" />} />
            )}
            {onGoToApiDev && (
              <MenuButton theme={theme} label="API para Desenvolvedores" onClick={onGoToApiDev} variant="info" badge="NOVO" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
            )}
            
            <MenuButton theme={theme} label={t.termsOfUse} onClick={() => setProfileSubView('TERMS')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />

            <MenuButton
              theme={effectiveTheme}
              label={effectiveTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              onClick={() => (onThemeToggle ?? toggleTheme)()}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            />

            {!userId || isGuest ? (
              <>
                <MenuButton 
                  theme={theme}
                  label={t.loginOrRegister} 
                  onClick={() => onOpenLoginPage ? onOpenLoginPage() : setShowAuthModal(true)} 
                  variant="success"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>} 
                />
                <MenuButton 
                  theme={theme}
                  label={isAdminOnline ? t.comingSoon : t.adminOffline} 
                  disabled
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                />
              </>
            ) : (
              <>
                {userEmail === 'negget27@gmail.com' && onAdminClick ? (
                  <MenuButton 
                    theme={theme}
                    label={t.painelAdmin}
                    onClick={onAdminClick} 
                    variant="business"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} 
                  />
                ) : (
                  <MenuButton 
                    theme={theme}
                    label={t.comingSoon} 
                    disabled
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                  />
                )}
              </>
            )}
          </div>

          <div className="pt-4 space-y-3">
            <p className={`text-[9px] font-mono uppercase tracking-[0.4em] font-black pl-4 ${theme === 'light' ? 'text-red-700' : 'text-red-900/60'}`}>{t.criticalZone}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MenuButton theme={theme} label={t.endSession} onClick={() => setShowLogoutConfirm(true)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} variant="danger" />
              <MenuButton theme={theme} label={t.deleteAccount} onClick={() => setShowDeleteConfirm(true)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} variant="danger" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};