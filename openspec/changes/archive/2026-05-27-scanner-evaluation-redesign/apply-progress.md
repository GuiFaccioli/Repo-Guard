# Apply Progress — scanner-evaluation-redesign

## Status
In progress (single PR, size exception accepted)

## Completed tasks
- [x] T1 — Baseline/inventário (superfícies de score/modos e contrato atual mapeadas durante apply).
- [x] T2 — Contrato sem score global e scan único no backend de repositórios.
- [x] T3 — Taxonomia inicial de contexto (fullstack-app, library-sdk, scientific, automation, unknown).
- [x] T4 — Motor inicial de classificação didática Green/Yellow/Red com confiança e incerteza.
- [x] T5 — Catálogo inicial de fontes por argumento (>=1 por item, com múltiplas em checks críticos).
- [x] T6 — Integração frontend total para render didático completo por check.
- [x] T7 — Hardening final + rollout/rollback documentado.

## Files changed
- `backend/src/repositories/repositories.controller.ts`
- `backend/src/repositories/repositories.service.ts`
- `backend/src/repositories/repositories.types.ts`
- `backend/src/repositories/scanner-evaluation.ts`
- `backend/src/repositories/scanner-evaluation.spec.ts`
- `openspec/changes/scanner-evaluation-redesign/proposal.md`
- `openspec/changes/scanner-evaluation-redesign/specs/scanner-evaluation/spec.md`
- `openspec/changes/scanner-evaluation-redesign/tasks.md`
- `openspec/changes/scanner-evaluation-redesign/apply-progress.md`
- `openspec/changes/scanner-evaluation-redesign/rollout-rollback.md`
- `frontend/src/pages/RepositoryDetailPage.jsx`

## TDD Cycle Evidence
| Task | RED (failing) | GREEN (passing) | TRIANGULATE/REFACTOR |
|---|---|---|---|
| T1 Baseline/inventário | Contrato antigo ainda expunha mentalidade de score/modos no fluxo legado de relatório e seleção de scan | Inventário fechado e backlog de migração definido; baseline congelada para remoção de score/modos na saída principal | Consolidação do inventário em superfícies backend/frontend + artefatos SDD |
| T2 Contrato sem score global + scan único | Testes/consumidores legados dependiam de shape anterior sem `didacticChecks` como alvo principal | `cd backend && npm test` GREEN após introdução do contrato geral (`general`) sem score global e com campos didáticos | Ajuste incremental para manter compatibilidade transitória com `checks` legados |
| T3 Taxonomia de contexto | `cd backend && npm test -- scanner-evaluation.spec.ts` falhou inicialmente no cenário científico (esperado `scientific`, recebido `library-sdk`) | Mesmo comando passou após ajuste de inferência contextual por sinais válidos (`hasPassingSignal`) | Refactor leve de helper de inferência |
| T4 Motor G/Y/R + incerteza | Regras iniciais não refletiam bem baixa confiança em contexto ambíguo | `cd backend && npm test -- scanner-evaluation.spec.ts` GREEN com caso de ambiguidade retornando `yellow` + `uncertainty_note` | Normalização de status/confiança para manter consistência didática |
| T5 Evidências + fontes | Cobertura inicial de fontes não estava consolidada por check no novo contrato didático | `cd backend && npm test` GREEN com garantia de >=1 fonte por item no builder didático | Catálogo inicial de fontes centralizado + fallback defensivo |
| T6 Frontend didático primário | Primeira migração do `RepositoryDetailPage` gerou erro de parsing/lint (duplicação acidental de bloco e referências legadas), quebrando análise estática | Ajustes de render para `didacticChecks` + remoção de blocos legados + alinhamento de analytics para `general` restauraram build (`cd frontend && npm run build`) | Refactor de efeitos para evitar cascata e manter comportamento de auto-scan |
| T7 Hardening + rollout/rollback | Rollout/rollback não estava explicitado no change, elevando risco operacional | Documento `rollout-rollback.md` criado + builds principais GREEN (`backend`/`frontend`) | Plano com fases, kill switch e rollback operacional explícito |

### Medição objetiva de fontes (estado atual)
- Métrica mínima: **100% dos checks com >=1 fonte** (atendida).
- Meta preferida: **>=70% com 2+ fontes quando aplicável**.
- Situação atual: **medição formal registrada como pendente de instrumentação dedicada**; tratada como warning conhecido nesta entrega.

## Test commands run
- `cd backend && npm test -- scanner-evaluation.spec.ts` (RED -> GREEN)
- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm run build`
- `cd backend && npm run lint` (falha por dívida técnica pré-existente fora do escopo desta mudança)
- `cd frontend && npm run lint` (falha por dívida técnica pré-existente em `RepositoryListPage.jsx`/`RepositoryCheckGuidePage.jsx`, fora do escopo desta mudança)

## Deviations from design
- Mantida compatibilidade por `checks` legados junto com `didacticChecks` novos.
- Para respeitar política de UX didática, o relatório agora prioriza explicitamente `didacticChecks` e só usa aliases para links de "Learn more".

## Remaining tasks
- Nenhuma tarefa pendente nesta fatia (T6/T7 concluídos).

## Workload / PR boundary
- Estratégia aprovada: **single PR com size exception**.
- Boundary desta entrega: conclusão de integração frontend didática + hardening documental de rollout/rollback.
