# Agente Backend (NestJS + Prisma + PostgreSQL)

## Missão
Implementar e evoluir backend do RepoGuard com foco em modularidade, segurança e previsibilidade operacional.

## Stack e Diretrizes Técnicas
- Framework: NestJS
- ORM: Prisma
- Banco: PostgreSQL
- Integrações: GitHub OAuth e GitHub REST API

Manter separação clara entre `modules`, `controllers`, `services`, `repositories` (ou camada equivalente).

## Regras de Arquitetura
1. `Controller` recebe requisição, delega para `Service` e retorna resposta.
2. Regra de negócio fica no `Service`, nunca no `Controller`.
3. Acesso a banco deve passar por Prisma (sem SQL solto fora de cenários justificados).
4. Código de integração com GitHub deve ficar isolado em serviço próprio.
5. DTOs e validações devem ser explícitos para entrada/saída.

## OAuth GitHub
1. Implementar fluxo OAuth com estados de segurança (`state`) e validação de retorno.
2. Tokens devem ser tratados como sensíveis desde a recepção até persistência/uso.
3. Nunca retornar token bruto ao frontend sem necessidade de arquitetura definida.
4. Registrar falhas de autenticação sem vazar payload sensível.

## GitHub REST API
1. Centralizar cliente HTTP do GitHub em camada única.
2. Tratar paginação, rate limit e erros 401/403/404/429 explicitamente.
3. Evitar chamadas redundantes; priorizar eficiência e previsibilidade.
4. Respeitar escopos OAuth mínimos exigidos pelo MVP.

## Variáveis de Ambiente
Obrigatórias (nomes podem variar por convenção do projeto):
- `DATABASE_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`
- `GITHUB_API_BASE_URL` (opcional, com default seguro)
- `JWT_SECRET` (se autenticação interna for adotada)
- `GA4_API_SECRET` e `GA4_MEASUREMENT_ID` (quando backend emitir Measurement Protocol)

Regras:
1. Nunca versionar `.env`.
2. Validar variáveis críticas no bootstrap da aplicação.
3. Falhar rápido com mensagem objetiva se faltar configuração essencial.

## Validações e Erros
1. Validar entrada com DTO + class-validator (ou equivalente no padrão NestJS).
2. Normalizar respostas de erro para formato consistente.
3. Mapear erros de domínio e erros externos separadamente.
4. Não repassar stack trace interno em resposta pública.

## Segurança e Privacidade
1. Não expor tokens, segredos ou dados de repositórios privados em logs.
2. Sanitizar mensagens de erro vindas de provedores externos.
3. Aplicar CORS restritivo por ambiente.
4. Implementar controles básicos de rate limit nas rotas sensíveis.

## Qualidade de Entrega
Antes de concluir tarefa de backend:
1. confirmar separação controller/service;
2. confirmar validações de entrada;
3. confirmar tratamento de erro;
4. confirmar ausência de segredos no código e logs;
5. listar impacto em banco e integração GitHub.
