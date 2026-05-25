# Deploy do frontend na Vercel

Este guia cobre apenas o deploy da interface React + Vite do RepoGuard.

## Pre-requisitos
- Repositorio no GitHub com branch `main`.
- Projeto importado na Vercel.
- Frontend localizado em `frontend/`.

## Passo a passo
1. Acesse https://vercel.com/new e selecione `GuiFaccioli/Repo-Guard`.
2. Em configuracao do projeto, defina:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Em **Environment Variables**, configure (se necessario):
   - `VITE_API_URL`
   - `VITE_GA_MEASUREMENT_ID`
4. Clique em **Deploy**.

## Validacoes apos deploy
1. Abrir a URL gerada e validar carregamento da landing page.
2. Navegar pelas rotas placeholder:
   - `/auth/callback`
   - `/repositories`
   - `/repositories/1`
3. Confirmar ausencia de erro 404 nas rotas do app.

## Observacoes
- Esta etapa nao inclui OAuth real.
- Esta etapa nao inclui backend em producao.
- Qualquer valor de variavel deve ser adicionado via painel da Vercel, nunca em `.env` versionado.
