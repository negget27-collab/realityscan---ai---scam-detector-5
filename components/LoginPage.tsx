import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginWithFacebook,
  loginWithGitHub,
  loginWithApple,
  loginWithEmail,
  registerWithEmail,
  sendPasswordReset,
  logFailedLoginAttempt,
  logRegistrationAttempt,
  isGmailEmail,
} from '../services/firebase';
import { FaGoogle, FaGithub, FaFacebook, FaApple } from 'react-icons/fa';
import { TermsOfUse } from './TermsOfUse';

interface LoginPageProps {
  onLogin: () => void;
  onGuestLogin?: () => void;
  onBack?: () => void;
  /** Abre política de privacidade/termos (ex.: modal ou nova aba) */
  onOpenTerms?: () => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'RESET';

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onGuestLogin,
  onBack,
  onOpenTerms,
}) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptPrivacy) {
      setError('Aceite a Política de Privacidade e os Termos de Uso para continuar.');
      return;
    }
    if (!email || !senha) {
      setError('Preencha todos os campos.');
      return;
    }
    if (senha.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (mode === 'REGISTER' && senha !== confirmSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (mode === 'REGISTER' && !isGmailEmail(email)) {
      setError('Cadastro com e-mail só é permitido para contas Gmail (@gmail.com). Use um e-mail Gmail ou faça login com Google.');
      logRegistrationAttempt(email, false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (mode === 'LOGIN') {
        await loginWithEmail(email, senha);
      } else {
        await registerWithEmail(email, senha);
        logRegistrationAttempt(email, true);
        onLogin();
        return;
      }
      onLogin();
    } catch (err: any) {
      if (mode === 'REGISTER') logRegistrationAttempt(email, false);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/email-domain-not-allowed') {
        setError(err.message || 'Cadastro só permitido para Gmail (@gmail.com). Use Gmail ou faça login com Google.');
      } else if (err.code === 'auth/invalid-credential') {
        logFailedLoginAttempt(email);
        setError('Credenciais inválidas.');
      } else {
        setError(err.message || 'Falha na autenticação.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(fn: () => Promise<any>) {
    try {
      setLoading(true);
      setError(null);
      await fn();
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Falha no login.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email?.trim()) {
      setError('Informe seu e-mail.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResetSuccess(false);
      await sendPasswordReset(email.trim());
      setResetSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar e-mail.');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'RESET') {
  return (
    <div className="login-bg relative">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 z-10 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:text-blue-600 hover:border-blue-400 font-bold text-xs uppercase tracking-widest transition-colors"
          aria-label="Voltar"
        >
          Voltar
        </button>
      )}
      <div className="login-box">
        <h1>Redefinir Senha</h1>
          <p className="sub">RealityScan Defense Protocol</p>

          {error && <div className="error-msg">{error}</div>}
          {resetSuccess && (
            <div className="error-msg" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>
              E-mail enviado! Verifique sua caixa de entrada.
            </div>
          )}

          <form onSubmit={handleResetPassword}>
            <label>E-mail operacional</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className={`btn-main ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </form>

          <button
            type="button"
            className="register-link"
            onClick={() => { setMode('LOGIN'); setError(null); setResetSuccess(false); }}
          >
            Voltar ao login
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="login-bg relative">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 z-10 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:text-blue-600 hover:border-blue-400 font-bold text-xs uppercase tracking-widest transition-colors"
          aria-label="Voltar"
        >
          Voltar
        </button>
      )}
      <div className="login-box">
        <h1>{mode === 'LOGIN' ? 'ACESSO RESTRITO' : 'REGISTRO DE AGENTE'}</h1>
        <p className="sub">RealityScan Defense Protocol</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={loginEmail}>
          <label>E-mail operacional</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Chave de criptografia</label>
          <div style={{ position: 'relative', marginBottom: mode === 'LOGIN' ? 12 : 0 }}>
            <input
              type={showSenha ? 'text' : 'password'}
              placeholder="********"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={mode === 'LOGIN' ? { marginBottom: 0, paddingRight: 44 } : { paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowSenha(!showSenha)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 text-xs font-bold uppercase"
              title={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showSenha ? 'Ocultar' : 'Mostrar'}
            </button>
            {mode === 'LOGIN' && (
              <button
                type="button"
                className="forgot-link"
                onClick={() => { setMode('RESET'); setError(null); }}
              >
                Esqueceu a senha?
              </button>
            )}
          </div>
          {mode === 'REGISTER' && (
            <>
              <label>Confirmar chave</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSenha ? 'text' : 'password'}
                  placeholder="********"
                  value={confirmSenha}
                  onChange={(e) => setConfirmSenha(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 text-xs font-bold uppercase"
                  title={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </>
          )}

          <label className="login-privacy-label">
            <input
              type="checkbox"
              checked={acceptPrivacy}
              onChange={(e) => { setAcceptPrivacy(e.target.checked); setError(null); }}
              className="login-privacy-checkbox"
            />
            <span>
              Li e aceito a{' '}
              <button
                type="button"
                className="login-privacy-link"
                onClick={(e) => { e.preventDefault(); if (onOpenTerms) onOpenTerms(); else setShowTermsModal(true); }}
              >
                Política de Privacidade e Termos de Uso
              </button>.
            </span>
          </label>

          <button type="submit" className={`btn-main ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? 'Conectando...' : mode === 'LOGIN' ? 'ENTRAR NO TERMINAL' : 'CADASTRAR AGENTE'}
          </button>
        </form>

        <div className="ou">PROTOCOLO OAUTH</div>

        <div className="social-grid">
          <button
            type="button"
            className="btn google"
            onClick={() => handleSocialLogin(loginWithGoogle)}
            disabled={loading}
            title="Entrar com Google"
          >
            <FaGoogle size={22} />
          </button>
          <button
            type="button"
            className="btn facebook"
            onClick={() => handleSocialLogin(loginWithFacebook)}
            disabled={loading}
            title="Entrar com Facebook"
          >
            <FaFacebook size={22} />
          </button>
          <button
            type="button"
            className="btn github"
            onClick={() => handleSocialLogin(loginWithGitHub)}
            disabled={loading}
            title="Entrar com Github"
          >
            <FaGithub size={22} />
          </button>
          <button
            type="button"
            className="btn apple"
            onClick={() => handleSocialLogin(loginWithApple)}
            disabled={loading}
            title="Entrar com Apple"
          >
            <FaApple size={22} />
          </button>
        </div>

        <button
          type="button"
          className="register-link"
          onClick={() => { setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(null); }}
        >
          {mode === 'LOGIN' ? 'Não possui acesso? Cadastre novo agente' : 'Já possui credenciais? Voltar ao login'}
        </button>

      </div>

      {showTermsModal && (
        <div className="login-terms-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="login-terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-terms-header">
              <h2>Política de Privacidade e Termos de Uso</h2>
              <button type="button" className="login-terms-close" onClick={() => setShowTermsModal(false)} aria-label="Fechar">
                ×
              </button>
            </div>
            <div className="login-terms-body">
              <TermsOfUse theme="dark" />
            </div>
            <button type="button" className="btn-main" style={{ margin: '0 24px 24px' }} onClick={() => setShowTermsModal(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
