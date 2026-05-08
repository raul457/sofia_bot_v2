# Sofia Bot — Passo a Passo Completo de Instalação

> **IA utilizada:** Google Gemini 2.0 Flash — **100% gratuito** no plano Free do Google AI Studio.

---

## O que você vai precisar (tudo gratuito)

| O que | Onde criar | Para que serve |
|---|---|---|
| Chave Gemini | aistudio.google.com | A inteligência artificial do bot |
| Banco de dados | supabase.com | Guardar consultas, pacientes e histórico |
| Redis (cache) | upstash.com | Guardar o histórico de conversa do WhatsApp |
| WhatsApp API | Evolution API (local) | Conectar ao WhatsApp |

---

## Passo 1 — Chave da API Gemini (IA gratuita)

1. Acesse: **https://aistudio.google.com/app/apikey**
2. Clique em **"Create API key"**
3. Selecione um projeto Google (ou crie um novo quando solicitado)
4. Copie a chave gerada — começa com `AIza...`
5. Guarde essa chave, você vai precisar no Passo 5

> A chave é gratuita. O modelo `gemini-2.0-flash` tem limite de **1.500 requisições por dia** no plano gratuito, o que é mais do que suficiente para uma clínica pequena.

---

## Passo 2 — Banco de Dados (Supabase — gratuito)

1. Acesse: **https://supabase.com**
2. Clique em **"Start your project"** e crie uma conta (pode usar Google)
3. Clique em **"New project"** e preencha:
   - **Name:** sofia-bot (ou qualquer nome)
   - **Database Password:** crie uma senha forte e **anote ela**
   - **Region:** South America (São Paulo)
4. Aguarde o projeto criar (pode levar 1-2 minutos)
5. No menu lateral, clique em **Settings → Database**
6. Role até **"Connection string"** e clique na aba **"URI"**
7. Copie a URL — ela começa com `postgresql://postgres:...`
   - Substitua `[YOUR-PASSWORD]` pela senha que você criou no passo 3
8. Guarde essa URL para o Passo 5

---

## Passo 3 — Redis Cache (Upstash — gratuito)

O Redis é usado para guardar o histórico de conversa de cada paciente no WhatsApp.

1. Acesse: **https://upstash.com**
2. Clique em **"Start for free"** e crie uma conta
3. No painel, clique em **"Create database"**
4. Preencha:
   - **Name:** sofia-redis
   - **Type:** Regional
   - **Region:** São Paulo (sa-east-1)
5. Clique em **"Create"**
6. Na página do banco criado, role até **"REST API"** e copie a **"UPSTASH_REDIS_REST_URL"**
   - Ou clique em **"Connect"** e copie a **Redis URL** que começa com `rediss://...`
7. Guarde essa URL para o Passo 5

---

## Passo 4 — WhatsApp (Evolution API via Docker)

A Evolution API conecta o bot ao WhatsApp. Você precisa ter o **Docker** instalado.

### Instalar Docker (se ainda não tiver)
- Windows/Mac: **https://www.docker.com/products/docker-desktop**
- Baixe, instale e abra o Docker Desktop

### Rodar a Evolution API
Abra o terminal e execute:

```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=minha_chave_secreta_aqui \
  atendai/evolution-api:latest
```

> Troque `minha_chave_secreta_aqui` por qualquer texto (ex: `sofia123abc`). Anote esse valor.

### Criar a instância do WhatsApp
Abra o navegador e acesse: **http://localhost:8080**

Ou use o terminal (substitua `minha_chave_secreta_aqui` pelo seu token):

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: minha_chave_secreta_aqui" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "sofia", "qrcode": true}'
```

### Escanear o QR Code
1. Acesse: **http://localhost:8080/manager** no navegador
2. Faça login com o token que você definiu
3. Clique na instância **"sofia"**
4. Escaneie o QR Code com o WhatsApp do celular
   - WhatsApp → três pontos → Aparelhos conectados → Conectar aparelho

### Configurar o Webhook (para receber mensagens)
Execute no terminal (troque `SEU_IP_LOCAL` pelo IP da sua máquina ou `localhost`):

```bash
curl -X POST http://localhost:8080/webhook/set/sofia \
  -H "apikey: minha_chave_secreta_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://SEU_IP_LOCAL:3001/webhook",
    "webhook_by_events": false,
    "events": ["MESSAGES_UPSERT"]
  }'
```

---

## Passo 5 — Configurar as variáveis de ambiente (.env)

### Backend

Entre na pasta `backend` e copie o arquivo de exemplo:

```bash
cd backend
copy .env.example .env
```

Agora abra o arquivo `.env` com um editor de texto (Bloco de Notas ou VS Code) e preencha:

```env
# GEMINI — Cole a chave do Passo 1
GEMINI_API_KEY=AIzaSy...sua_chave_aqui

# WHATSAPP — Evolution API
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_TOKEN=minha_chave_secreta_aqui
WHATSAPP_INSTANCE=sofia

# BANCO DE DADOS — Cole a URL do Passo 2
DATABASE_URL=postgresql://postgres:SUA_SENHA@db.xxxx.supabase.co:5432/postgres

# REDIS — Cole a URL do Passo 3
REDIS_URL=rediss://...sua_url_upstash

# SEGURANÇA — Crie qualquer texto longo (mínimo 32 caracteres)
JWT_SECRET=uma_frase_longa_e_aleatoria_aqui_com_pelo_menos_32_chars

# NOTIFICAÇÕES — Número que receberá alertas de crise (formato: 5511999999999)
ADMIN_NOTIFICATION_PHONE=5511999999999

# DADOS DA CLÍNICA
CLINIC_NAME=Clínica Sofia
CLINIC_ADDRESS=Rua Exemplo, 123 - Cidade/UF
CLINIC_PHONE=5511999999999
TELECONSULT_URL=https://meet.jit.si/clinica-sofia

# SERVIDOR
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend

Entre na pasta `frontend` e copie o arquivo de exemplo:

```bash
cd frontend
copy .env.example .env.local
```

Abra o `.env.local` e preencha com os mesmos dados (banco, Gemini, etc.).

---

## Passo 6 — Instalar e rodar o Backend

Abra o terminal na pasta `backend`:

```bash
cd backend

# Instalar dependências
npm install

# Criar as tabelas no banco de dados
npx prisma generate
npx prisma migrate dev --name init

# Criar dados iniciais (admin + psicóloga de teste)
npm run db:seed

# Iniciar o servidor
npm run dev
```

Se aparecer `Server running on port 3001`, funcionou!

**Credenciais criadas pelo seed:**
- Admin: `admin@clinicasofia.com` / senha: `admin123`
- Psicóloga: `psi@clinicasofia.com` / senha: `admin123`

---

## Passo 7 — Instalar e rodar o Frontend (painel de controle)

Abra **outro terminal** na pasta `frontend`:

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar o painel
npm run dev
```

Acesse o painel em: **http://localhost:3000**

Faça login com: `admin@clinicasofia.com` / `admin123`

---

## Passo 8 — Testar o bot

1. Envie uma mensagem para o número do WhatsApp conectado
2. O bot Sofia deve responder automaticamente
3. No painel (http://localhost:3000), você verá o histórico de conversas

---

## Passo 9 — Deploy em produção (opcional)

Se quiser deixar o bot rodando 24/7 na internet:

### Backend — Railway (gratuito com limitações)
1. Acesse: **https://railway.app**
2. Crie uma conta e clique em **"New Project"**
3. Conecte seu repositório GitHub
4. Configure as variáveis de ambiente (as mesmas do `.env`)
5. O Railway detecta o `package.json` automaticamente e faz o deploy

### Frontend — Vercel (gratuito)
1. Acesse: **https://vercel.com**
2. Crie uma conta e clique em **"Add New Project"**
3. Conecte o repositório e selecione a pasta `frontend`
4. Adicione a variável: `NEXT_PUBLIC_API_URL=https://seu-backend.railway.app`
5. Clique em **"Deploy"**

> Para mais detalhes sobre o deploy na Vercel, veja o arquivo `DEPLOY_VERCEL.md`.

---

## Resumo das URLs importantes

| Serviço | URL |
|---|---|
| Painel do bot | http://localhost:3000 |
| Backend / API | http://localhost:3001 |
| Evolution API | http://localhost:8080 |
| Manager WhatsApp | http://localhost:8080/manager |
| Google AI Studio (Gemini) | https://aistudio.google.com/app/apikey |
| Supabase | https://supabase.com |
| Upstash Redis | https://upstash.com |

---

## Problemas comuns

**Bot não responde no WhatsApp**
- Verifique se o backend está rodando (`npm run dev` na pasta `backend`)
- Confira se o webhook está configurado corretamente (Passo 4)
- O QR Code do WhatsApp pode ter expirado — reconecte pelo Manager

**Erro ao iniciar o backend**
- Verifique se todas as variáveis do `.env` estão preenchidas
- Confirme que a `DATABASE_URL` está correta e o Supabase está online

**Erro "GEMINI_API_KEY invalid"**
- Acesse https://aistudio.google.com/app/apikey e gere uma nova chave
- Certifique-se de copiar a chave completa sem espaços

**Banco de dados não conecta**
- Na URL do Supabase, substitua `[YOUR-PASSWORD]` pela senha real
- Não deixe colchetes `[]` na URL
