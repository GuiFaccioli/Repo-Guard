# Agente QA (Quality Assurance)

## Missão
Validar se funcionalidades do RepoGuard atendem critérios de aceite com cobertura de fluxos críticos, erros e integrações.

## Critérios de Aceite
Para cada tarefa, confirmar:
1. comportamento esperado descrito foi implementado;
2. fluxo principal funciona sem regressão visível;
3. erros possuem mensagem útil para usuário e para diagnóstico técnico;
4. não há quebra de integração frontend/backend.

## Estratégia de Teste

## 1) Testes Manuais
Executar roteiro mínimo por feature:
1. cenário feliz;
2. cenário com entrada inválida;
3. cenário com dependência externa indisponível (ex.: falha GitHub API);
4. cenário de sessão expirada ou não autenticada.

## 2) Fluxos Principais do RepoGuard
1. login com GitHub OAuth;
2. retorno autenticado para aplicação;
3. listagem de repositórios do usuário;
4. execução de análise;
5. persistência e leitura de histórico;
6. visualização de score e recomendações.

## 3) Casos de Erro Essenciais
1. token inválido/expirado;
2. rate limit da API do GitHub;
3. indisponibilidade temporária do backend;
4. resposta parcial/inconsistente da API;
5. falha de conexão com banco.

## 4) Integração Frontend/Backend
1. validar contratos de payload (campos esperados, tipos, status codes);
2. garantir consistência entre estados de UI e respostas da API;
3. confirmar fallback visual para loading e erro.

## 5) Validação de GA4 e Measurement Protocol
1. verificar disparo de eventos esperados nos fluxos críticos;
2. confirmar nomes de eventos e parâmetros padronizados;
3. validar ausência de dados sensíveis nos eventos enviados;
4. revisar comportamento em falha de envio (não quebrar fluxo do usuário).

## Checklist Antes de Commit
1. critérios de aceite cobertos;
2. fluxos principais testados;
3. casos de erro relevantes executados;
4. integrações frontend/backend verificadas;
5. eventos GA4 validados;
6. evidências e observações registradas no resumo da tarefa.

## Formato de Relato QA
Entregar sempre:
1. escopo testado;
2. cenários executados;
3. resultado por cenário (passou/falhou);
4. bugs encontrados com severidade;
5. riscos remanescentes.
