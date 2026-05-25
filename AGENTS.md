# RepoGuard - Guia Geral para Agentes

## 1) Visão do Produto
RepoGuard é uma aplicação full-stack para ajudar desenvolvedores a avaliar a saúde dos seus repositórios GitHub com foco em:
- segurança básica;
- qualidade de código em nível de sinais iniciais;
- manutenção e continuidade do projeto.

O fluxo central do produto é: autenticar com GitHub, listar repositórios, executar análises, armazenar resultados e exibir dashboard com score, recomendações e histórico.

## 2) Stack Oficial do Projeto
- Frontend: React + Vite + React Router
- Backend: Node.js + NestJS + Prisma
- Banco: PostgreSQL
- Integrações: GitHub OAuth + GitHub REST API
- Analytics: Google Analytics 4 (GA4) + Measurement Protocol

Não trocar stack sem solicitação explícita.

## 3) Objetivo do MVP
Entregar uma base funcional que permita:
1. autenticação via GitHub OAuth;
2. listagem de repositórios do usuário autenticado;
3. execução de checks iniciais (segurança, qualidade, manutenção);
4. persistência dos resultados no PostgreSQL;
5. dashboard React com score por repositório, recomendações objetivas e histórico de análises.

## 4) Regras de Trabalho
1. Respeitar estritamente o escopo da tarefa solicitada.
2. Não implementar funcionalidades não pedidas ("scope creep").
3. Para tarefas grandes, criar plano por etapas antes de implementar.
4. Priorizar mudanças pequenas, revisáveis e testáveis.
5. Registrar suposições quando faltar contexto.
6. Nunca executar comandos destrutivos sem solicitação explícita.

## 5) Padrões de Segurança Obrigatórios
1. Nunca expor token OAuth, refresh token, segredo de cliente ou credenciais de banco.
2. Tratar `.env` como fonte de configuração sensível, nunca como artefato versionável.
3. Aplicar validação de entrada em qualquer dado externo (usuário, webhook, GitHub API, query params).
4. Evitar logs com dados sensíveis (token, e-mail completo, headers de autenticação, payload privado).
5. Aplicar princípio do menor privilégio nas permissões solicitadas ao GitHub.

## 6) Limites do Agente
1. Não criar nem usar tokens/secrets reais.
2. Não publicar credenciais em código, logs, exemplos ou documentação.
3. Não alterar arquitetura global sem alinhamento.
4. Não alterar escopo original da tarefa para "aproveitar" mudanças paralelas.
5. Não iniciar implementação de backend/frontend/db quando a tarefa for apenas documental.

## 7) Validações Esperadas Antes de Encerrar Tarefa
1. Confirmar se o objetivo solicitado foi cumprido por completo.
2. Listar arquivos alterados e impacto técnico de cada um.
3. Informar riscos, pendências e decisões que exigem validação humana.
4. Confirmar que nenhuma credencial real foi criada ou exposta.
5. Sinalizar próximos passos seguros e de menor risco.

## 8) Formato de Resposta Final de Cada Tarefa
Toda resposta final do agente deve incluir:
1. resumo do que foi feito;
2. lista de arquivos alterados/criados;
3. validações executadas;
4. limitações ou pontos não cobertos;
5. próximos passos recomendados.

## 9) Regra de Planejamento para Tarefas Grandes
Antes de implementar qualquer tarefa com impacto amplo (múltiplos módulos, integração externa, migração de dados, autenticação, analytics), o agente deve:
1. propor plano com etapas curtas;
2. explicitar riscos por etapa;
3. só então iniciar execução.

## 10) Regra de Preservação de Escopo
Se a solicitação for específica (ex.: apenas documentação, apenas revisão, apenas teste), o agente deve:
1. executar somente esse tipo de trabalho;
2. evitar criação de código de produto fora do escopo;
3. reportar sugestões extras apenas como recomendação, sem implementação automática.
