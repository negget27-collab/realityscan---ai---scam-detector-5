# 🔐 Configuração de API Keys no Firebase

Para evitar expor chaves no Git ou em deploys, armazene-as no Firestore. O servidor carrega automaticamente na inicialização.

## 1. Criar documento no Firestore

No [Firebase Console](https://console.firebase.google.com) → Firestore Database → **Adicionar coleção**:

- **Coleção:** `config`
- **Documento:** `apiKeys`

## 2. Campos do documento `config/apiKeys`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mp_access_token` | string | Token de acesso Mercado Pago |
| `paypal_client_id` | string | Client ID do PayPal |
| `paypal_client_secret` | string | Client Secret do PayPal |
| `paypal_sandbox` | boolean | `true` = sandbox, `false` = produção |
| `openrouter_key` | string | Chave OpenRouter (IA) |
| `gemini_api_key` | string | Chave Google Gemini (fallback) |
| `app_url` | string | URL do app (ex: ngrok em dev) |

## 3. Prioridade

1. **Firestore** – se o documento existir, os valores sobrescrevem o `.env`
2. **.env.local** – fallback se Firestore não tiver o documento ou campo

## 4. Segurança

- As regras do Firestore **negam** leitura/escrita em `config/*` para clientes
- Apenas o Firebase Admin SDK (servidor) consegue ler
- Mantenha `firebase-key.json` e `.env.local` fora do Git (verifique `.gitignore`)

## 5. Deploy

Ao subir o app (Vercel, Railway, etc.):

- Use variáveis de ambiente **ou**
- Garanta que o `firebase-key.json` esteja no servidor e crie o documento `config/apiKeys` no Firestore com as chaves de produção
