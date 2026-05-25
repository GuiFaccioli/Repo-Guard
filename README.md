# RepoGuard

RepoGuard e um projeto de portfolio focado em analise basica de seguranca, qualidade e manutencao de repositorios GitHub.

## Status atual
- Base de instrucoes para agentes criada (`AGENTS.md` e pasta `agents/`).
- Frontend inicial criado com React + Vite + React Router em `frontend/`.
- Rotas placeholder prontas para:
  - `/`
  - `/auth/callback`
  - `/repositories`
  - `/repositories/:id`
- OAuth real, backend e banco ainda nao implementados.

## Como rodar o frontend localmente
1. Entre na pasta:
   - `cd frontend`
2. Instale dependencias:
   - `npm install`
3. Rode em desenvolvimento:
   - `npm run dev`
4. Build de producao:
   - `npm run build`

## Deploy rapido na Vercel
Ao importar este repositorio na Vercel:
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Variaveis esperadas no frontend:
- `VITE_API_URL`
- `VITE_GA_MEASUREMENT_ID`

Modelo disponivel em:
- `frontend/.env.example`

## Proximos passos
- Implementar backend NestJS com OAuth GitHub.
- Integrar frontend com API real de repositorios e scans.
- Persistir historico de scans em PostgreSQL com Prisma.
