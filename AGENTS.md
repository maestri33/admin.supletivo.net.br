# AI & Engineering Guidelines — `admin.supletivo.net.br`

> **DIRETIVA DE HERANÇA**: As diretrizes canônicas de governança, arquitetura e engenharia do ecossistema estão centralizadas em **[`../supletivo.net.br/AGENTS.md`](../supletivo.net.br/AGENTS.md)** e o Design System canônico em **[`../supletivo.net.br/DESIGN.md`](../supletivo.net.br/DESIGN.md)**.
> Todo agente que operar neste repositório DEVE seguir rigorosamente este documento e as instruções abaixo.

---

## 🛑 REGRA MANDATÓRIA Nº 1: PROIBIDO CONJECTURAR OU ADIVINHAR
- **NÃO TENTE ADIVINHAR OU CRIAR FLUXOS FUTUROS POR CONTA PRÓPRIA.**
- Toda funcionalidade deve ser estritamente espelhada nas APIs reais e existentes do backend (`/api/v1/staff/*`).
- Antes de qualquer decisão arquitetural ou alteração substancial: **SEMPRE PERGUNTE AO USUÁRIO**.

---

## 🔑 2. Escopo e Responsabilidades do Painel Administrativo
1. **Público Exclusivo Staff / Superuser:**
   - Este painel atende exclusivamente operadores e administradores do ecossistema Supletivo Brasil.
   - Autenticação sob `/api/v1/staff/auth/`:
     - **Primário**: Verificação de CPF/telefone/ID e login passwordless via OTP WhatsApp (`/check` e `/login`).
     - **Contingência**: Login com credenciais master (`/login-password`).
2. **Módulos do Sistema (Alinhados com `backend.supletivo.net.br`):**
   - **Visão Geral**: Cockpit com status de infraestrutura, integrações e oráculo de versão.
   - **Polos & Coordenadores**: Gestão de polos (`/hubs`), designação de coordenadores e configuração de polos padrão.
   - **Dossiês & Validação de Documentos**: Fila unificada de revisão de documentos e biometria (`/documents/reviews`), dossiê visual e despacho soberano.
   - **Gestão Financeira & Payouts**: Saldo Asaas, resumo contábil, listagem de comissões, fechamento semanal, payouts e ledger.
   - **Usuários, Matrículas e Alunos**: Listagem de leads, matrículas, alunos e liberação de credenciais de plataformas parceiras.
   - **Catálogo de Treinamento**: Gestão de materiais e acompanhamento de submissões de áudio com override.
   - **Notificações**: Gestão e testes de templates WhatsApp, SMS, E-mail e TTS.
3. **Padrão de Código e Interface:**
   - Código 100% em Inglês (variáveis, tipos, schemas, commits).
   - Interface e rotas 100% em Português do Brasil (PT-BR).

---

## 🚀 3. Infraestrutura e Borda (Cloudflare-First)
- **Runtime**: Cloudflare Workers SSR via `@astrojs/cloudflare` (`output: 'server'`).
- **Sessão KV**: Namespace `admin-supletivo-net-br-session` (`4791fb0e1704410e92128e1b4b992421`).
- **Porta Local Dev**: `3030` (evitando colisão com landing `3011`, promotor `3015` e app `3020`).
- **Proxy de API**: Todo `/api/*` é roteado transparentemente para `URL_BACKEND` mantendo cookies, headers e IP real.
