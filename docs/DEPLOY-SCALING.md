# Escalabilidade e Deploy — RealityScan

Este documento descreve as medidas de escalabilidade implementadas e como usá-las em produção.

---

## 1. PM2 Cluster Mode

O servidor pode rodar em modo cluster para aproveitar todos os núcleos da CPU.

### Instalação do PM2

```bash
npm install -g pm2
```

### Uso

```bash
# Build e iniciar com cluster (usa todos os núcleos)
npm run start:pm2

# Ou manualmente:
npm run build
pm2 start ecosystem.config.cjs --env production

# Comandos úteis
pm2 status
pm2 logs realityscan
pm2 restart all
pm2 stop all
```

### Configuração

No arquivo `ecosystem.config.cjs`:

- **instances**: `"max"` = um processo por núcleo. Para limitar: `instances: 2` ou `process.env.PM2_INSTANCES || 2`
- **max_memory_restart**: reinicia o processo se ultrapassar 600MB

### Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PM2_INSTANCES` | Número de instâncias (ou `max`) | `max` |

---

## 2. Rate Limiting

### Geral
- **200 requisições por 15 minutos** por IP
- Evita abuso e DDoS leve

### Análise (`/api/scan`)
- **30 análises por minuto** por IP
- Protege o custo de IA e a estabilidade do OpenRouter/Gemini

### Mensagens de erro
- Geral: `"Muitas requisições. Tente novamente em alguns minutos."`
- Scan: `"Limite de análises por minuto atingido. Aguarde um momento."`

---

## 3. Concorrência de IA

As chamadas para OpenRouter/Gemini passam por um limitador de concorrência para evitar:
- Timeouts por excesso de requisições
- Rate limit dos provedores
- Picos de custo

### Configuração

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `AI_CONCURRENCY_LIMIT` | Máx. análises simultâneas por instância | `15` |

Aumente em servidores potentes; reduza se estiver atingindo limites do OpenRouter.

**Exemplo** (`.env.local`):
```
AI_CONCURRENCY_LIMIT=25
```

---

## 4. Estimativa de capacidade

| Cenário | Sem cluster | Com PM2 (4 cores) |
|---------|-------------|-------------------|
| Análises simultâneas | ~50–80 | ~150–250 |
| Usuários navegando | ~500 | ~1000+ |
| Rate limit scan | 30/min/IP | 30/min/IP |

> O gargalo tende a ser a latência do OpenRouter/Gemini, não o Node.js.

---

## 5. Próximos passos (opcional)

Para escalar além de um único servidor:

1. **Load balancer** (Nginx, Cloudflare) na frente de várias instâncias
2. **Redis** para rate limit compartilhado entre instâncias
3. **Fila de jobs** (Bull + Redis) para análises assíncronas
4. **CDN** para assets estáticos (Vercel, Cloudflare)

---

## 6. Dependências adicionais

Certifique-se de instalar:

```bash
npm install
```

Os pacotes `express-rate-limit` e `p-limit` já estão em `package.json`.
