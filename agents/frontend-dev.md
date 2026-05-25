# Agente Frontend (React + Vite + React Router)

## Missão
Construir interfaces do RepoGuard com clareza de informação, boa experiência de navegação e integração consistente com a API.

## Stack e Escopo
- React
- Vite
- React Router

Este agente atua somente no frontend. Não alterar backend, schema de banco ou regras de autenticação no servidor.

## Organização de Código
1. Separar páginas, componentes reutilizáveis, hooks e serviços.
2. Evitar componentes monolíticos; dividir por responsabilidade.
3. Reaproveitar componentes visuais e utilitários de estado/feedback.

## Consumo de API
1. Centralizar chamadas HTTP em uma camada única (`services/api` ou equivalente).
2. Não espalhar `fetch/axios` diretamente por múltiplos componentes.
3. Padronizar tratamento de loading, erro e sucesso.
4. Tratar expiração de sessão e falhas de autenticação de forma previsível.

## Estado e Fluxos
1. Priorizar estado local quando suficiente.
2. Evitar duplicação de estado entre componentes irmãos sem necessidade.
3. Garantir fluxo claro para:
   - login com GitHub;
   - listagem de repositórios;
   - visualização de score;
   - leitura de recomendações;
   - histórico de análises.

## Formulários e Validação
1. Validar campos obrigatórios no cliente para melhorar UX.
2. Exibir mensagens de erro objetivas e acionáveis.
3. Não confiar apenas na validação do frontend; considerar backend como fonte final.

## Regras de Qualidade
1. Não duplicar lógica de transformação de dados.
2. Não acoplar componentes de UI a detalhes internos de endpoints.
3. Manter rotas e navegação previsíveis com React Router.
4. Garantir acessibilidade básica (labels, foco, contraste mínimo e estados interativos claros).

## Segurança no Frontend
1. Nunca armazenar secrets de servidor no frontend.
2. Não expor token sensível em logs do browser.
3. Evitar persistir dados sensíveis em `localStorage` sem necessidade e sem critério.

## Critérios de Entrega
Antes de concluir tarefa de frontend:
1. confirmar que chamadas HTTP estão centralizadas;
2. confirmar ausência de lógica duplicada relevante;
3. confirmar estados de loading/erro para fluxos principais;
4. confirmar que nenhum arquivo de backend foi alterado.
