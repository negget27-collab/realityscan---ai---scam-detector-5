/**
 * API Users Service - Sistema de API Keys para desenvolvedores
 * Firestore: api_users, api_logs
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ApiPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

export const API_PLANS: Record<ApiPlanId, { requestsPerDay?: number; requestsPerMonth: number; name: string }> = {
  free: { requestsPerDay: 50, requestsPerMonth: 50, name: 'Free' },
  basic: { requestsPerMonth: 5000, name: 'Basic' },
  pro: { requestsPerMonth: 20000, name: 'Pro' },
  enterprise: { requestsPerMonth: -1, name: 'Enterprise' },
};

export interface ApiUserDoc {
  email: string;
  apiKey: string;
  plan: ApiPlanId;
  requestsUsed: number;
  requestLimit: number;
  billingCycle: 'daily' | 'monthly';
  renewDate?: string;
  createdAt: string;
  active: boolean;
  userId?: string;
}

export interface ApiLogDoc {
  apiKeyId: string;
  endpoint: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costEstimated?: number;
  timestamp: string;
}

function generateApiKey(): string {
  const prefix = 'sk_live_';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/** Cria novo api_user vinculado ao usuário Firebase */
export async function createApiUser(userId: string, email: string): Promise<{ apiKey: string; docId: string }> {
  const apiKey = generateApiKey();
  const plan: ApiPlanId = 'free';
  const limit = API_PLANS[plan].requestsPerDay ?? API_PLANS[plan].requestsPerMonth;
  const now = new Date().toISOString();
  const id = `u_${userId}`;
  const ref = doc(db, 'api_users', id);
  await setDoc(ref, {
    email,
    apiKey,
    plan,
    requestsUsed: 0,
    requestLimit: limit,
    billingCycle: 'daily',
    renewDate: now.slice(0, 10),
    createdAt: now,
    active: true,
    userId,
  });
  return { apiKey, docId: id };
}

/** Busca api_user por userId (para painel do dev) */
export async function getApiUserByUserId(userId: string): Promise<ApiUserDoc | null> {
  const ref = doc(db, 'api_users', `u_${userId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as ApiUserDoc;
}

/** Busca api_user por apiKey (para validação no backend) */
export async function getApiUserByKey(apiKey: string): Promise<(ApiUserDoc & { id: string }) | null> {
  const q = query(
    collection(db, 'api_users'),
    where('apiKey', '==', apiKey),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as ApiUserDoc & { id: string };
}

/** Regenera a API Key (invalida a antiga) */
export async function regenerateApiKey(userId: string): Promise<string> {
  const newKey = generateApiKey();
  const ref = doc(db, 'api_users', `u_${userId}`);
  await updateDoc(ref, { apiKey: newKey, apiKeyUpdatedAt: new Date().toISOString() });
  return newKey;
}

/** Incrementa contador de requisições e reseta se necessário (daily/monthly) */
export async function incrementApiUsage(docId: string, plan: ApiPlanId): Promise<{ allowed: boolean; remaining: number }> {
  const ref = doc(db, 'api_users', docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { allowed: false, remaining: 0 };
  const data = snap.data();
  const planConfig = API_PLANS[plan];
  const limitVal = planConfig.requestsPerDay ?? planConfig.requestsPerMonth;
  if (limitVal < 0) return { allowed: true, remaining: -1 }; // enterprise ilimitado

  const billingCycle = data.billingCycle || 'daily';
  const renewDate = data.renewDate || '';
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const renew = new Date(renewDate);
  const needsReset =
    billingCycle === 'daily' ? renewDate !== today
    : renew.getMonth() !== now.getMonth() || renew.getFullYear() !== now.getFullYear();

  if (needsReset) {
    const nextRenew = billingCycle === 'daily'
      ? today
      : new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
    await updateDoc(ref, {
      requestsUsed: 1,
      renewDate: nextRenew,
    });
    return { allowed: true, remaining: limitVal - 1 };
  }

  const used = (data.requestsUsed || 0) + 1;
  if (used > limitVal) {
    return { allowed: false, remaining: 0 };
  }
  await updateDoc(ref, { requestsUsed: increment(1) });
  return { allowed: true, remaining: limitVal - used };
}

/** Salva log de uso da API */
export async function logApiRequest(
  apiKeyId: string,
  endpoint: string,
  opts?: { model?: string; tokensInput?: number; tokensOutput?: number; costEstimated?: number }
): Promise<void> {
  try {
    const col = collection(db, 'api_logs');
    await setDoc(doc(col), {
      apiKeyId,
      endpoint,
      model: opts?.model,
      tokensInput: opts?.tokensInput,
      tokensOutput: opts?.tokensOutput,
      costEstimated: opts?.costEstimated,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[apiUsers] logApiRequest error:', e);
  }
}

/** Lista logs recentes do usuário (para painel) */
export async function getApiLogs(userId: string, maxItems: number = 50): Promise<ApiLogDoc[]> {
  const q = query(
    collection(db, 'api_logs'),
    where('apiKeyId', '==', `u_${userId}`),
    orderBy('timestamp', 'desc'),
    limit(maxItems)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ApiLogDoc);
  } catch (e) {
    console.warn('[apiUsers] getApiLogs:', e);
    return [];
  }
}
