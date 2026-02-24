# Escalabilidade – RealityScan

Guia para dimensionar o app conforme o número de usuários.

---

## 1. Arquitetura atual

| Componente | Implementação |
|------------|---------------|
| Backend | Node.js + Express (single process ou cluster PM2) |
| IA | OpenRouter (Gemini) + fallback Gemini direto |
| DB | Firebase Firestore |
| Rate limit | 500 req/15min global, 30 análises/min |
| Concorrência IA | 15 chamadas simultâneas (p-limit) |

---

## 2. PM2 em cluster

```bash
# Build e start
npm run build
pm2 start ecosystem.config.cjs --env production

# Ver status
pm2 status

# Logs
pm2 logs realityscan

# Reiniciar
pm2 restart realityscan
```

### Configuração (`ecosystem.config.cjs`)

- **instances: "max"** – usa todos os núcleos da CPU
- **exec_mode: "cluster"** – balanceamento entre workers
- **PM2_INSTANCES** – ex: `PM2_INSTANCES=4 pm2 start ecosystem.config.cjs` para fixar 4 workers

---

## 3. Variáveis de ambiente para escala

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `AI_CONCURRENCY_LIMIT` | 15 | Chamadas simultâneas para OpenRouter/Gemini |
| `PM2_INSTANCES` | max | Número de workers PM2 |
| `PORT` | 0 | Porta do servidor |

Exemplo para mais throughput de IA:

```env
AI_CONCURRENCY_LIMIT=25
PM2_INSTANCES=4
```

---

## 4. Health checks (load balancer)

| Endpoint | Uso |
|----------|-----|
| `GET /health` | Liveness – servidor está no ar |
| `GET /ready` | Readiness – conecta ao Firestore |
| `GET /api/health` | Detalhes (webhook, db) |

Exemplo Nginx:

```nginx
upstream realityscan {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    location / {
        proxy_pass http://realityscan;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location /health {
        proxy_pass http://realityscan;
        access_log off;
    }

    location /ready {
        proxy_pass http://realityscan;
        access_log off;
    }
}
```

---

## 5. Capacidade estimada

| Métrica | Valor |
|---------|-------|
| Análises simultâneas (pico) | ~200–300 |
| Usuários navegando | 500–2000 |
| Análises grátis/dia (global) | 500 (configurável em `MAX_FREE_GLOBAL_DAILY`) |

---

## 6. Próximos passos para alta escala

1. **Redis + fila** – Bull/Agenda para fila de análises e rate limit global entre instâncias
2. **CDN** – Cloudflare/Vercel para frontend estático
3. **Firebase** – upgrade de plano conforme volume de leituras/escritas
4. **Kubernetes** – múltiplas réplicas + HPA para auto-scaling
