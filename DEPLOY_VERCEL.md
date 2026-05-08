# Deploy na Vercel — Passo a Passo

## Arquitetura no Vercel

```
Vercel (frontend/)
  ├── Next.js 14 (painel admin + SSR)
  └── API Routes (substitui o backend inteiro)
      ├── /api/webhook       ← recebe mensagens do WhatsApp
      ├── /api/auth/*        ← autenticação JWT
      ├── /api/appointments/* ← gestão de consultas
      ├── /api/patients/*    ← gestão de pacientes
      ├── /api/slots/*       ← gestão de horários
      └── /api/cron/reminders ← lembretes (Vercel Cron, 1x/hora)
```

## 1. Banco de dados — Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) → New Project
2. Vá em **Project Settings → Database → Connection string**
3. Copie dois valores:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL`
   - **Session pooler** (porta 5432) → `DIRECT_URL`

## 2. Deploy na Vercel

### Via CLI (recomendado)

```bash
npm install -g vercel
cd frontend
vercel
```

Siga o wizard. Quando pedir o diretório raiz: confirme `frontend/`.

### Via GitHub

1. Crie um repositório no GitHub e envie o projeto
2. Acesse [vercel.com](https://vercel.com) → Import Project
3. Selecione o repositório
4. **Root Directory:** `frontend`
5. Clique em Deploy

## 3. Variáveis de ambiente na Vercel

No painel Vercel → Project → Settings → Environment Variables, adicione:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | Connection string Supabase (pooler, porta 6543) |
| `DIRECT_URL` | Connection string Supabase (session, porta 5432) |
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `WHATSAPP_API_URL` | URL da sua Evolution API |
| `WHATSAPP_API_TOKEN` | Token da Evolution API |
| `WHATSAPP_INSTANCE` | sofia |
| `JWT_SECRET` | string aleatória ≥ 32 chars |
| `ADMIN_NOTIFICATION_PHONE` | 5511999999999 |
| `CLINIC_NAME` | Nome da sua clínica |
| `CLINIC_ADDRESS` | Endereço físico |
| `CLINIC_PHONE` | Telefone da clínica |
| `TELECONSULT_URL` | Link do Google Meet / Jitsi |
| `CRON_SECRET` | string aleatória qualquer |

## 4. Rodar migrations após o deploy

```bash
# Na pasta frontend/, com as variáveis de ambiente configuradas:
npx prisma migrate deploy
npx prisma db seed
```

Ou use a CLI da Vercel:
```bash
vercel env pull .env.local  # baixa as variáveis
npx prisma migrate deploy
npx prisma db seed
```

## 5. Configurar webhook do WhatsApp

Após o deploy, sua URL pública será algo como `https://seu-app.vercel.app`.

Configure na Evolution API:
```
POST https://sua-evolution-api.com/webhook/set/sofia
{
  "url": "https://seu-app.vercel.app/api/webhook",
  "webhook_by_events": false,
  "events": ["MESSAGES_UPSERT"]
}
```

## 6. Credenciais iniciais (após seed)

- **Admin:** admin@clinicasofia.com / admin123
- **Psicóloga:** psi@clinicasofia.com / admin123

⚠️ Troque as senhas após o primeiro acesso em Configurações.

## Limitações do plano gratuito da Vercel

| Recurso | Limite free |
|---------|-------------|
| Execução de function | 10s por request |
| Cron jobs | 2 por projeto |
| Bandwidth | 100 GB/mês |
| Deployments | Ilimitado |

Para produção com alto volume, considere o plano Pro ($20/mês) ou mover o backend para Railway.
