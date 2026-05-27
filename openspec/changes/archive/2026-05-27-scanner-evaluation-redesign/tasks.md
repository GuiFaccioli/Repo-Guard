# Tasks — scanner-evaluation-redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (contratos + domínio) → PR 2 (motor contextual + fontes) → PR 3 (integração + UX de saída) → PR 4 (hardening + rollout) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Premissas e escopo
- Sem implementação nesta fase; apenas planejamento executável.
- Remover score global em toda saída.
- Fluxo único de scan (sem seletor de modo).
- Classificação didática Green/Yellow/Red por check, tom não alarmista.
- Avaliação contextual por tipo/sinais de repositório.
- Cada argumento com fontes (mínimo 1; preferível 2+ quando aplicável).
- Tratamento explícito de incerteza e recomendação de validação manual.

## Work units (dependentes e revisáveis)

### T1 — Baseline e inventário de superfícies afetadas (RED)
**Objetivo:** mapear contratos e pontos que hoje expõem score/modos e lacunas para contextualização.

**Alvos de arquivo (descoberta obrigatória):**
- `backend/src/scans/**`
- `backend/src/**/dto/**`
- `backend/src/**/controller*.ts`
- `frontend/src/**/repositories/**`
- `frontend/src/**/report/**` (ou equivalentes)
- testes existentes em `backend/src/**/*.spec.ts` e `backend/test/**`

**Entregáveis/aceite:**
- Matriz “superfície atual vs alvo” anexada ao PR.
- Lista fechada de endpoints/DTOs/componentes que removem score e modo.
- Casos de teste faltantes identificados (unit/integration/e2e).

---

### T2 — Contrato canônico de saída didática sem score (RED → GREEN)
**Objetivo:** definir e cobrir contrato de resultado por check (G/Y/R + 4 campos didáticos + confiança + fontes).

**Alvos de arquivo:**
- `backend/src/scans/dto/*` (ou pasta de contratos equivalente)
- `backend/src/scans/**/*.spec.ts`
- `frontend/src/types/**` (se existir tipagem compartilhada no front)

**Entregáveis/aceite:**
- Testes RED primeiro validando ausência de score global e ausência de modo de scan.
- Estrutura de saída com campos obrigatórios: `status`, `what_checked`, `why_it_matters`, `what_found`, `suggested_action`, `confidence`, `sources[]`.
- Regra de validação mínima: 1 fonte por argumento.

---

### T3 — Taxonomia inicial de contexto + heurísticas defensivas (RED → GREEN → TRIANGULATE)
**Objetivo:** introduzir classificação contextual mínima (ex.: fullstack app, biblioteca, artigo/científico, automação) e critérios por contexto.

**Alvos de arquivo:**
- `backend/src/scans/**/context*.ts`
- `backend/src/scans/**/rules*.ts`
- `backend/src/scans/**/*.spec.ts`

**Entregáveis/aceite:**
- Testes cobrindo pelo menos 2 contextos distintos com diferenças de critérios.
- Evidência de redução de falso positivo por contexto (casos de teste dedicados).
- Sem instruções ofensivas; somente interpretação defensiva.

---

### T4 — Motor de avaliação G/Y/R contextual + política de incerteza (RED → GREEN)
**Objetivo:** aplicar regras contextuais para classificar erros, más práticas e segurança com confiança explícita.

**Alvos de arquivo:**
- `backend/src/scans/**/evaluation*.ts`
- `backend/src/scans/**/confidence*.ts`
- `backend/src/scans/**/*.spec.ts`

**Entregáveis/aceite:**
- Casos ambíguos retornam limitação de confiança + recomendação manual.
- Classificação G/Y/R consistente por check.
- Linguagem de saída validada como didática e não alarmista (asserts de conteúdo mínimo).

---

### T5 — Pipeline de evidências e catálogo de fontes (GREEN → REFACTOR)
**Objetivo:** garantir fundamentação rastreável por argumento com suporte a múltiplas fontes.

**Alvos de arquivo:**
- `backend/src/scans/**/evidence*.ts`
- `backend/src/scans/**/sources*.ts` ou `backend/src/scans/data/sources.*`
- `backend/src/scans/**/*.spec.ts`

**Entregáveis/aceite:**
- 100% dos argumentos com pelo menos 1 fonte em testes.
- Meta operacional testável: >=70% dos argumentos com 2+ fontes em cenários aplicáveis.
- Deduplicação e validação de links/fontes no pipeline.

---

### T6 — Integração backend→frontend do fluxo único (RED → GREEN)
**Objetivo:** alinhar UI para consumir apenas scan único e renderizar checks didáticos sem score.

**Alvos de arquivo:**
- `frontend/src/routes/**`
- `frontend/src/pages/repositories/**`
- `frontend/src/components/**report**`
- `frontend/src/services/**`

**Entregáveis/aceite:**
- Sem seletor de modo de scan na experiência.
- Sem score global em nenhuma superfície de relatório.
- Renderização por check com G/Y/R, explicação didática, fontes e incerteza quando houver.

---

### T7 — Testes integrados, regressão e rollout controlado (TRIANGULATE → REFACTOR)
**Objetivo:** fechar qualidade, risco de rollout e estratégia de fallback.

**Alvos de arquivo:**
- `backend/test/**/*.ts`
- `backend/src/**/*.spec.ts`
- `frontend` testes existentes (se houver)
- docs operacionais da mudança em `docs/**` ou `openspec/changes/scanner-evaluation-redesign/**`

**Entregáveis/aceite:**
- Plano de rollout por etapas com feature flag/fallback do avaliador antigo (se ainda existir).
- Checklist de regressão funcional (sem score, scan único, G/Y/R didático, fontes, incerteza).
- Critérios de rollback com gatilhos objetivos (erro funcional, regressão crítica, aumento de falso positivo).

## Checkpoints de aceitação estritos (gate por PR)
1. **Gate A (T1-T2):** contrato sem score + testes RED/GREEN aprovados.
2. **Gate B (T3-T4):** contexto + classificação + incerteza aprovados em testes.
3. **Gate C (T5):** evidências/fontes com cobertura mínima e meta preferida monitorada.
4. **Gate D (T6):** UX final sem score/sem modo e com explicações completas por check.
5. **Gate E (T7):** regressão completa + rollout/rollback documentados.

## Plano de validação (comandos)
- Backend unit/integration: `cd backend && npm test`
- Backend lint: `cd backend && npm run lint`
- Backend build: `cd backend && npm run build`
- Backend e2e: `cd backend && npm run test:e2e`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

## Estratégia de split sugerida (cadeia de PRs)
- **PR 1:** T1 + T2 (inventário + contrato canônico + testes base)
- **PR 2:** T3 + T4 (contexto + motor G/Y/R + incerteza)
- **PR 3:** T5 + T6 (evidências/fontes + integração UI)
- **PR 4:** T7 (hardening, regressão completa, rollout e rollback)

## Riscos principais e mitigação
- **Risco de explosão de regras contextuais:** limitar taxonomia inicial e revisar por telemetria de falso positivo.
- **Risco de inconsistência em Yellow:** rubricar critérios objetivos por contexto nos testes.
- **Risco de manutenção de fontes:** catálogo versionado e revisão periódica.
- **Risco de ultrapassar orçamento de revisão:** manter cadeia de PRs com gates independentes.
