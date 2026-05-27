# Design — scanner-evaluation-redesign

## 1) Objetivo
Materializar o desenho técnico-funcional para substituir avaliação por score/modos por **scan único contextual** com saída didática por check (Green/Yellow/Red), incluindo confiança e fontes.

## 2) Decisões fixas
1. Sem score global em qualquer superfície.
2. Sem seletor de modo de scan (fluxo único).
3. Resultado por check com: `status`, `what_checked`, `why_it_matters`, `what_found`, `suggested_action`, `confidence`, `sources[]`.
4. Avaliação contextual por sinais observáveis do repositório.
5. Tom educacional, defensivo e não alarmista.
6. Mínimo de 1 fonte por argumento; preferível 2+ quando aplicável.

## 3) Arquitetura lógica proposta (conceitual)
1. **Context inference**: identifica contexto provável (ex.: fullstack app, biblioteca, científico/artigo, automação) por heurísticas defensivas.
2. **Rule selection**: ativa conjunto de checks obrigatório + checks contextuais.
3. **Evaluation engine**: classifica cada check em Green/Yellow/Red com confiança.
4. **Evidence enrichment**: anexa evidências e fontes por argumento.
5. **Didactic formatter**: produz payload final sem score global.

## 4) Fluxo de dados
1. Entrada: metadados e sinais do repositório (estrutura, arquivos-chave, automações, atividade).
2. Inferência de contexto + nível de confiança de contexto.
3. Execução de regras aplicáveis ao contexto.
4. Geração de resultados por check com explicação didática e ação sugerida.
5. Anexação/validação de fontes (mínimo 1 por argumento).
6. Saída final consumida pelo frontend (sem score e sem modo).

## 5) Contrato canônico de saída
```ts
type CheckStatus = 'green' | 'yellow' | 'red'

type ScannerCheckResult = {
  check_id: string
  check_name: string
  status: CheckStatus
  what_checked: string
  why_it_matters: string
  what_found: string
  suggested_action: string
  confidence: {
    level: 'high' | 'medium' | 'low'
    limitations?: string
    manual_verification_recommended: boolean
  }
  sources: Array<{
    title: string
    url: string
    publisher?: string
    accessed_at?: string
  }>
}

type ScannerEvaluationResult = {
  repository_id: string
  context: {
    type: 'fullstack-app' | 'library' | 'scientific' | 'automation' | 'unknown'
    confidence: 'high' | 'medium' | 'low'
  }
  checks: ScannerCheckResult[]
}
```

## 6) Mudanças planejadas por área (implementação futura)
- **Backend (`packages/coding-agent`/scanner domain equivalente):**
  - remover campos de score global e modo no contrato de resposta;
  - adicionar módulos de contexto, avaliação, confiança e fontes;
  - adicionar validações de contrato (1+ fonte/check).
- **Frontend (consumidor do relatório):**
  - remover UI de score e seletor de modo;
  - renderizar lista vertical por check com G/Y/R, explicações, fontes e incerteza.

## 7) Estratégia de testes
1. **Contrato:** falhar se existir score global/modo no payload.
2. **Didática por check:** 100% checks com campos obrigatórios.
3. **Contexto:** cenários com ao menos 2 contextos diferentes e critérios distintos.
4. **Incerteza:** casos ambíguos exigem limitação + recomendação manual.
5. **Fontes:** 100% argumentos com >=1 fonte; meta >=70% com 2+ quando aplicável.
6. **Segurança/comunicação:** sem segredos/tokens e sem conteúdo ofensivo/alarmista.

## 8) Rollout e rollback (design)
- Rollout incremental com feature flag do novo avaliador.
- Métricas de qualidade: regressão funcional, falso positivo contextual, cobertura de fontes.
- Rollback: retorno temporário ao avaliador anterior ao detectar regressão crítica.

## 9) Riscos e mitigação
- **Complexidade de regras contextuais:** iniciar com taxonomia mínima e expandir por evidência.
- **Inconsistência de Yellow:** rubricar critérios objetivos em testes.
- **Manutenção de fontes:** catálogo versionado e revisão periódica.

## 10) Fora de escopo nesta mudança
- Implementação de código runtime.
- Migrações de banco/API/auth/analytics.
- Qualquer instrução ofensiva de segurança.
