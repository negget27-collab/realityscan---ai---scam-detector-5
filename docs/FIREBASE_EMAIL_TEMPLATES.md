# Templates de E-mail do Firebase (RealityScan)

Edite em: [Firebase Console](https://console.firebase.google.com) → **Authentication** → **Templates**

---

## 1. Alteração de endereço de e-mail

**Nome do remetente:** `RealityScan`

**Assunto:**
```
Seu e-mail de acesso foi alterado no RealityScan
```

**Corpo da mensagem:**
```
Olá %DISPLAY_NAME%,

O endereço de e-mail de acesso à sua conta RealityScan foi alterado para %NEW_EMAIL%.

Se você não solicitou essa alteração, clique no link abaixo para reverter e recuperar o acesso:

%LINK%

Obrigado,
Equipe RealityScan
```

---

## 2. Redefinição de senha

**Nome do remetente:** `RealityScan`

**Assunto:**
```
Redefina sua senha do RealityScan
```

**Corpo da mensagem:**
```
Olá,

Você solicitou a redefinição da senha da sua conta RealityScan.

Clique no link abaixo para criar uma nova senha:

%LINK%

Se você não solicitou essa alteração, ignore este e-mail. O link expira em 1 hora.

Obrigado,
Equipe RealityScan
```

---

## 3. Verificação de e-mail

**Nome do remetente:** `RealityScan`

**Assunto:**
```
Confirme seu e-mail no RealityScan
```

**Corpo da mensagem:**
```
Olá %DISPLAY_NAME%,

Bem-vindo ao RealityScan! Confirme seu endereço de e-mail clicando no link abaixo:

%LINK%

Obrigado,
Equipe RealityScan
```

---

## Variáveis disponíveis

| Variável | Descrição |
|----------|-----------|
| `%DISPLAY_NAME%` | Nome do usuário |
| `%NEW_EMAIL%` | Novo e-mail (template de alteração) |
| `%LINK%` | Link de ação (redefinir, verificar, etc.) |
| `%APP_NAME%` | Nome do app (definido no projeto) |

---

## Configuração do domínio personalizado (opcional)

Para usar um domínio próprio nos links (ex: `realityscan.com` em vez de `meuappgemini-413e8.firebaseapp.com`):

1. **Authentication** → **Settings** → **Authorized domains**
2. Adicione seu domínio
3. Em **Templates**, o Firebase usa o domínio do projeto por padrão
