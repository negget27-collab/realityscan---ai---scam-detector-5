# ✅ Checklist de Deploy – RealityScan

Use este documento para garantir que tudo está configurado antes de subir o app para usuários. Marque `[x]` quando concluir cada item.

---

## 1. Variáveis de ambiente e API keys

| # | Item | Status |
|---|------|--------|
| 1.1 | Criar documento `config/apiKeys` no Firestore (ver `CONFIG-FIREBASE.md`) | [ ] |
| 1.2 | Definir `mp_access_token` (Mercado Pago) – token de **produção** | [ ] |
| 1.3 | Definir `paypal_client_id` e `paypal_client_secret` – **produção** | [ ] |
| 1.4 | Definir `paypal_sandbox: false` no Firestore | [ ] |
| 1.5 | Definir `openrouter_key` (OpenRouter) | [ ] |
| 1.6 | Definir `gemini_api_key` (fallback) | [ ] |
| 1.7 | Definir `app_url` com a URL final (ex: `https://realityscan.app`) | [ ] |
| 1.8 | Arquivo `firebase-key.json` no servidor (credencial do Firebase Admin) | [ ] |

---

## 2. Firebase

| # | Item | Status |
|---|------|--------|
| 2.1 | Regras do Firestore publicadas (`firestore.rules`) | [ ] |
| 2.2 | Domínios autorizados no Firebase Auth (console → Authentication → Settings → Authorized domains) | [ ] |
| 2.3 | Email templates configurados (recuperação de senha etc.) | [ ] |
| 2.4 | Plano do Firebase adequado ao volume (Blaze se ultrapassar limites do Spark) | [ ] |

---

## 3. Pagamentos – Mercado Pago

| # | Item | Status |
|---|------|--------|
| 3.1 | Aplicação em modo **produção** no painel do Mercado Pago | [ ] |
| 3.2 | Token de produção configurado em `config/apiKeys` | [ ] |
| 3.3 | URL de notificação (webhook) cadastrada: `https://SEU-DOMINIO/api/webhook` | [ ] |
| 3.4 | Testar fluxo completo: criar preferência → pagar → webhook recebido | [ ] |

---

## 4. Pagamentos – PayPal

| # | Item | Status |
|---|------|--------|
| 4.1 | Aplicação em modo **produção** (não sandbox) | [ ] |
| 4.2 | `paypal_sandbox: false` no Firestore | [ ] |
| 4.3 | `return_url` e `cancel_url` usando `app_url` correto | [ ] |
| 4.4 | Testar fluxo completo de compra | [ ] |

---

## 5. Servidor e hospedagem

| # | Item | Status |
|---|------|--------|
| 5.1 | `APP_URL` (ou `app_url` no Firestore) = URL pública final | [ ] |
| 5.2 | Variável `PORT` definida se necessário | [ ] |
| 5.3 | `firebase-key.json` presente no servidor (fora do Git) | [ ] |
| 5.4 | PM2 ou processo equivalente configurado para manter o app no ar | [ ] |
| 5.5 | Pasta `logs/` criada (ou script que a cria) | [ ] |

---

## 6. Domínio e SSL

| # | Item | Status |
|---|------|--------|
| 6.1 | Domínio configurado (ex: realityscan.app) | [ ] |
| 6.2 | DNS apontando para o servidor (A ou CNAME) | [ ] |
| 6.3 | Certificado SSL ativo (HTTPS) | [ ] |
| 6.4 | Redirecionamento HTTP → HTTPS | [ ] |

---

## 7. Segurança

| # | Item | Status |
|---|------|--------|
| 7.1 | `.env`, `.env.local`, `firebase-key.json` no `.gitignore` (não versionados) | [ ] |
| 7.2 | Nenhuma chave hardcoded no código | [ ] |
| 7.3 | Rate limiting ativo (já configurado no app) | [ ] |
| 7.4 | Firestore: coleção `config` sem acesso via client | [ ] |

---

## 8. Pós-deploy – validação

| # | Item | Status |
|---|------|--------|
| 8.1 | `GET /health` retorna 200 | [ ] |
| 8.2 | `GET /ready` retorna 200 e `ready: true` | [ ] |
| 8.3 | Login com Google/Facebook/email funciona | [ ] |
| 8.4 | Análise de imagem (scan) funciona | [ ] |
| 8.5 | Compra via Mercado Pago concluída e créditos creditados | [ ] |
| 8.6 | Compra via PayPal concluída e créditos creditados | [ ] |
| 8.7 | Webhook do Mercado Pago recebendo notificações | [ ] |
| 8.8 | Sentry (PiP) funcionando em ambiente real | [ ] |

---

## 9. Opcionais

| # | Item | Status |
|---|------|--------|
| 9.1 | CDN (Cloudflare, etc.) para assets estáticos | [ ] |
| 9.2 | Monitoramento (ex: PM2 Plus, Sentry, UptimeRobot) | [ ] |
| 9.3 | Backup do Firestore configurado | [ ] |

---

## Comandos úteis

```bash
# Build e subir com PM2
npm run start:pm2

# Ver status
npx pm2 status

# Logs
npx pm2 logs realityscan

# Parar
npx pm2 stop all
```

---

## Referências

- `CONFIG-FIREBASE.md` – configuração de API keys no Firestore
- `docs/SCALING.md` – escalabilidade e PM2
