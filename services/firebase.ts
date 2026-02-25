import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, User, deleteUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification as sendEmailVerificationFn, setPersistence, browserLocalPersistence, signOut } from "firebase/auth";
import { initializeFirestore, doc, getDoc, getDocFromServer, setDoc, updateDoc, increment, collection, addDoc, deleteDoc, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAkvW2z44sTfwWm257CORE7B7RAD1g_7t8",
  authDomain: "meuappgemini-413e8.firebaseapp.com",
  databaseURL: "https://meuappgemini-413e8-default-rtdb.firebaseio.com",
  projectId: "meuappgemini-413e8",
  storageBucket: "meuappgemini-413e8.firebasestorage.app",
  messagingSenderId: "969380635200",
  appId: "1:969380635200:web:f03f357dc7e52393de35a5",
  measurementId: "G-7SC5H9KHMJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/** Garante persistência no localStorage - deve ser awaited antes de qualquer operação de auth (evita deslogar ao atualizar). */
export const ensureAuthPersistence = () => setPersistence(auth, browserLocalPersistence);

/**
 * FIX: RPC 'Listen' stream transport errored
 * A configuração 'experimentalForceLongPolling' substitui o WebChannel padrão (que falha em redes instáveis)
 * por um método de polling mais robusto.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

const googleProvider = new GoogleAuthProvider();

const initUserDocument = async (user: User) => {
  const userRef = doc(db, "users", user.uid);
  // Forçar leitura no servidor para garantir que bloqueio do admin seja respeitado (evita cache local)
  const docSnap = await getDocFromServer(userRef).catch(() => getDoc(userRef));
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data?.status === 'blocked' || data?.status === 'bloqueado') {
      await signOut(auth);
      throw new Error("Sua conta foi bloqueada. Entre em contato com o suporte.");
    }
  }
  if (!docSnap.exists()) {
    const refCode = 'rs' + user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || "Agente RealityScan",
      photoURL: user.photoURL,
      planId: 'community',
      premium: false,
      analysisCount: 0,
      language: localStorage.getItem('rs_preferred_lang') || 'PT',
      referralCode: refCode,
      createdAt: new Date().toISOString()
    });
  } else {
    const data = docSnap.data();
    const updates: Record<string, any> = { lastLogin: new Date().toISOString() };
    if (!data?.referralCode) {
      updates.referralCode = 'rs' + user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    }
    await updateDoc(userRef, updates);
  }
};

export const registerWithEmail = async (email: string, password: string): Promise<User> => {
  const e = email?.trim() ?? '';
  if (!isGmailEmail(e)) {
    const err = new Error("Cadastro com e-mail só é permitido para contas Gmail (@gmail.com). Use um e-mail Gmail ou faça login com Google.") as any;
    err.code = 'auth/email-domain-not-allowed';
    throw err;
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, e, password);
    await initUserDocument(result.user);
    try {
      await sendEmailVerificationFn(result.user);
    } catch (_) {}
    return result.user;
  } catch (error) {
    console.error("Erro no registro:", error);
    throw error;
  }
};

/** Notifica o backend sobre falha de login (para identificar tentativas com email inexistente). Fire-and-forget. */
export function logFailedLoginAttempt(email: string): void {
  const e = email?.trim();
  if (!e) return;
  fetch('/api/auth/log-failed-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e }),
  }).catch(() => {});
}

/** Domínios permitidos para cadastro com email (apenas Google). */
const GMAIL_DOMAINS = /@(gmail|googlemail)\.com$/i;
export function isGmailEmail(email: string): boolean {
  return !!email?.trim() && GMAIL_DOMAINS.test(email.trim());
}

/** Notifica o backend sobre tentativa de cadastro com email (registro no mesmo sistema). Fire-and-forget. */
export function logRegistrationAttempt(email: string, success?: boolean): void {
  const e = email?.trim();
  if (!e) return;
  fetch('/api/auth/log-registration-attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e, success: success === true }),
  }).catch(() => {});
}

export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await initUserDocument(result.user);
    return result.user;
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
};

/** Envia e-mail de redefinição de senha para o endereço informado. */
export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

/** Login com Google. Usa popup (mais confiável no navegador). Se popup falhar, tenta redirect. */
export const loginWithGoogle = async (): Promise<User | void> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await initUserDocument(result.user);
    return result.user;
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    throw err;
  }
};

/** Chama ao carregar o app para completar o fluxo de redirect (retorno do Google). */
export const handleAuthRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await initUserDocument(result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Erro ao processar redirect do Google:", error);
    throw error;
  }
};

/** Login com Facebook. Habilite "Facebook" em Firebase Console > Authentication > Sign-in method. */
export const loginWithFacebook = async (): Promise<User> => {
  try {
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await initUserDocument(result.user);
    return result.user;
  } catch (error) {
    console.error("Erro ao fazer login com Facebook:", error);
    throw error;
  }
};

/** Login com GitHub. Habilite "GitHub" em Firebase Console > Authentication > Sign-in method. */
export const loginWithGitHub = async (): Promise<User> => {
  try {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await initUserDocument(result.user);
    return result.user;
  } catch (error) {
    console.error("Erro ao fazer login com GitHub:", error);
    throw error;
  }
};

/** Login com Apple. Habilite "Apple" em Firebase Console > Authentication > Sign-in method. */
export const loginWithApple = async (): Promise<User> => {
  try {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const result = await signInWithPopup(auth, provider);
    await initUserDocument(result.user);
    return result.user;
  } catch (error) {
    console.error("Erro ao fazer login com Apple:", error);
    throw error;
  }
};

/** Reenvia o e-mail de verificação (para usuário que ainda não confirmou). */
export const sendEmailVerification = (user: User): Promise<void> => sendEmailVerificationFn(user);

export const logout = async (): Promise<void> => {
  return auth.signOut();
};

export const getUserData = async (uid: string): Promise<any> => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const saveUserData = async (uid: string, data: any): Promise<void> => {
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, data, { merge: true });
};

export const updateUserLanguage = async (uid: string, lang: string): Promise<void> => {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, { language: lang });
};

export const incrementAnalysisCount = async (uid: string): Promise<void> => {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    analysisCount: increment(1)
  });
};

/** Salva apenas escaneamentos positivos para IA (isAI === true) no repositório forense. */
export const saveAnalysisResult = async (uid: string, result: any, source: string = "Terminal"): Promise<void> => {
  const isAI = result.isAI === true || (typeof result.score === 'number' && result.score >= 50);
  if (!isAI) return;

  const resultsRef = collection(db, "users", uid, "analyses");
  const sanitizedResult = { ...result };
  delete sanitizedResult.mediaUrl;
  if (result.videoLink && typeof result.videoLink === 'string') sanitizedResult.videoLink = result.videoLink.trim();

  const now = new Date();
  await addDoc(resultsRef, {
    ...sanitizedResult,
    isAI: true,
    source,
    timestamp: now.toISOString(),
    date: now.toLocaleDateString('pt-BR'),
    time: now.toLocaleTimeString('pt-BR')
  });
};

export const saveFeedback = async (uid: string, analysisId: string, feedback: any): Promise<void> => {
  const feedbackRef = collection(db, "feedback");
  await addDoc(feedbackRef, {
    uid,
    analysisId,
    ...feedback,
    timestamp: new Date().toISOString()
  });
};

export const getAnalysesHistory = async (uid: string): Promise<any[]> => {
  const resultsRef = collection(db, "users", uid, "analyses");
  const { getDocs, query, orderBy } = await import("firebase/firestore");
  const q = query(resultsRef, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPurchaseHistory = async (uid: string): Promise<any[]> => {
  const purchasesRef = collection(db, "users", uid, "purchases");
  const { getDocs, query, orderBy } = await import("firebase/firestore");
  try {
    const q = query(purchasesRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
};

export const deleteUserAccount = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");
  const userDocRef = doc(db, "users", user.uid);
  await deleteDoc(userDocRef);
  await deleteUser(user);
};