/**
 * apiDevService - Cliente para o Painel Dev / API Pública
 * Gerencia API Keys e consumo.
 */

const API_BASE = '';

export interface ApiUserInfo {
  email: string;
  apiKey: string | null;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  requestsUsed: number;
  requestLimit: number;
  billingCycle: 'daily' | 'monthly';
  renewDate: string | null;
  active: boolean;
  createdAt: string;
}

export interface ApiLogEntry {
  endpoint: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costEstimated?: number;
  timestamp: string;
}

export async function getApiDevInfo(idToken: string): Promise<ApiUserInfo | null> {
  const res = await fetch(`${API_BASE}/api/dev/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function createApiKey(idToken: string): Promise<{ apiKey: string } | { error: string }> {
  const res = await fetch(`${API_BASE}/api/dev/create-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Falha ao criar chave' };
  return { apiKey: data.apiKey };
}

export async function regenerateApiKey(idToken: string): Promise<{ apiKey: string } | { error: string }> {
  const res = await fetch(`${API_BASE}/api/dev/regenerate-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Falha ao regenerar chave' };
  return { apiKey: data.apiKey };
}

export async function getApiLogs(idToken: string, limit = 50): Promise<ApiLogEntry[]> {
  const res = await fetch(`${API_BASE}/api/dev/logs?limit=${limit}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.logs || [];
}

export interface ApiUsageStats {
  today: number;
  weekData: { date: string; count: number }[];
  totalMonth: number;
  limit: number;
  plan: string;
  modelMostUsed: string | null;
  endpointMostUsed: string | null;
  costPerRequest: number;
  costEstimated: string;
}

export async function getApiUsage(idToken: string, range = 7): Promise<ApiUsageStats | null> {
  const res = await fetch(`${API_BASE}/api/dev/usage?range=${range}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function testApiGenerate(idToken: string, prompt: string): Promise<{ text: string } | { error: string }> {
  const res = await fetch(`${API_BASE}/api/dev/test-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Erro ao testar' };
  return { text: data.text };
}

export const API_PLAN_LIMITS = {
  free: { requestsPerDay: 50, label: 'Free' },
  basic: { requestsPerMonth: 5000, label: 'Basic' },
  pro: { requestsPerMonth: 20000, label: 'Pro' },
  enterprise: { custom: true, label: 'Enterprise' },
};
