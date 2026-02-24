# Como testar o checkout PayPal

## 1. Credenciais Sandbox (teste sem dinheiro real)

1. Acesse o [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Faça login com sua conta PayPal.
3. Em **Apps & Credentials**, crie um app (ou use o **Sandbox**).
4. Em **Sandbox** → **Accounts**, use a conta **Personal** (comprador) para simular o pagamento.
5. Copie **Client ID** e **Secret** do app (modo Sandbox).

## 2. Configurar no projeto

### Opção A: Firestore (recomendado em produção)

No Firebase Console → Firestore → documento `config/apiKeys`:

| Campo                | Valor                          |
|----------------------|--------------------------------|
| `paypal_client_id`   | (Client ID Sandbox)            |
| `paypal_client_secret` | (Secret Sandbox)            |
| `paypal_sandbox`     | `true` (para testes)           |
| `app_url`            | URL do **backend** (veja abaixo) |

### Opção B: Arquivo `.env.local` (desenvolvimento)

Na raiz do projeto, crie ou edite `.env.local`:

```env
# PayPal Sandbox
PAYPAL_CLIENT_ID=seu_client_id_sandbox
PAYPAL_CLIENT_SECRET=seu_secret_sandbox
PAYPAL_SANDBOX=true

# URLs (importante para o redirect após o pagamento)
# Backend: porta onde o server.js roda (ex: 3001 com npm run dev:full)
BASE_URL=http://localhost:3001
# Frontend: porta do Vite (5173) para onde o usuário volta após aprovar
FRONTEND_URL=http://localhost:5173
```

- Se você usa **só** `npm run server` e abre o app na mesma porta (ex.: 3000), pode deixar `BASE_URL` e `FRONTEND_URL` iguais a `http://localhost:3000`.
- Se usa **`npm run dev:full`**: backend em **3001**, frontend em **5173** → use os valores da tabela acima.

## 3. Subir backend e frontend

```bash
npm run dev:full
```

Isso sobe o backend (porta 3001) e o Vite (5173). O navegador abre em `http://localhost:5173`.

## 4. Fluxo de teste no app

1. Faça **login** no app (Google ou o método que você usa).
2. Vá em **Planos** / Assinatura e escolha um plano (ex.: Advanced).
3. No checkout, clique em **Pagar com PayPal** (ou no botão PayPal).
4. Você será redirecionado para a **página do PayPal (Sandbox)**.
5. Use uma **conta Sandbox** (Personal) para “pagar”:
   - No [Dashboard](https://developer.paypal.com/dashboard/) → **Sandbox** → **Accounts** → abra uma conta e use **Email** e a **senha** que o PayPal mostra (ou “View/Edit account” para definir senha).
6. Aprove o pagamento no PayPal.
7. O PayPal redireciona para o **backend** (`BASE_URL/api/paypal-return`), que captura o pagamento e redireciona você para o **frontend** (`FRONTEND_URL/?status=approved&source=paypal`).
8. O app deve tratar `status=approved&source=paypal` e mostrar sucesso / atualizar plano.

## 5. Se der erro “PayPal não configurado”

- Confira se `PAYPAL_CLIENT_ID` e `PAYPAL_CLIENT_SECRET` estão em `config/apiKeys` no Firestore **ou** em `.env.local`.
- Reinicie o backend após alterar `.env.local` ou o Firestore.

## 6. Testar em produção (opcional)

- No Dashboard do PayPal, use as credenciais **Live** (não Sandbox).
- No Firestore ou `.env`: `paypal_sandbox: false` (ou `PAYPAL_SANDBOX=false`).
- Defina `BASE_URL` e `FRONTEND_URL` (ou `app_url`) com as URLs reais do seu backend e do site (ex.: `https://api.seudominio.com` e `https://seudominio.com`).

## Resumo rápido

| Item              | Valor de teste                          |
|-------------------|-----------------------------------------|
| Credenciais       | Sandbox (Client ID + Secret)            |
| `paypal_sandbox`  | `true`                                  |
| `BASE_URL`        | `http://localhost:3001` (backend)       |
| `FRONTEND_URL`    | `http://localhost:5173` (Vite)          |
| Conta para pagar  | Conta Sandbox “Personal” do Dashboard  |
