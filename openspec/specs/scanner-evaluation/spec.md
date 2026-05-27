# Scanner Evaluation Specification

## Purpose

Definir o comportamento alvo da avaliação do scanner do RepoGuard com uma varredura única, contextual e didática, removendo score global e preservando comunicação educacional, calma e prática.

## Requirements

### Requirement: Avaliação sem score global

O sistema MUST remover completamente score global e MUST apresentar resultado apenas por verificações individuais.

#### Scenario: Relatório sem nota agregada

- GIVEN um repositório analisado
- WHEN o relatório de diagnóstico é gerado
- THEN nenhuma nota/score global é exibida
- AND o resultado é exibido por verificações individuais

### Requirement: Fluxo único de varredura

O sistema MUST oferecer uma única varredura geral para o usuário e MUST NOT expor modos Green/Yellow/Red como opção de execução.

#### Scenario: Usuário inicia análise

- GIVEN um usuário na experiência de análise de repositório
- WHEN a análise é iniciada
- THEN existe apenas um fluxo de scan disponível
- AND não existe seletor de modo de scan

### Requirement: Classificação didática por verificação

Cada verificação MUST ser classificada como Green, Yellow ou Red com explicação didática e não alarmista contendo: o que foi verificado, por que importa, o que foi encontrado e ação sugerida.

#### Scenario: Exibição de verificação classificada

- GIVEN uma verificação concluída
- WHEN seu resultado é apresentado
- THEN o resultado inclui status Green/Yellow/Red
- AND inclui explicação didática com os quatro elementos obrigatórios
- AND não utiliza linguagem alarmista

### Requirement: Avaliação contextual entre tipos de repositório

O sistema MUST adaptar a avaliação ao contexto do repositório com base em sinais observáveis e MUST evitar marcar como má prática um padrão válido para o contexto detectado.

#### Scenario: Contextos diferentes com critérios distintos

- GIVEN dois repositórios com contextos distintos (ex.: app fullstack e artigo científico)
- WHEN ambos são analisados
- THEN ao menos parte dos critérios aplicados difere conforme o contexto
- AND padrões aceitáveis no contexto detectado não são classificados como erro automaticamente

### Requirement: Detecção contextual de erros, más práticas e falhas de segurança

O sistema MUST identificar erros, más práticas e falhas de segurança de forma contextual e defensiva, sem instruções ofensivas.

#### Scenario: Achado de segurança em contexto aplicável

- GIVEN um repositório com configuração insegura relevante ao seu contexto
- WHEN a análise é executada
- THEN o achado é classificado com Green/Yellow/Red apropriado
- AND a explicação descreve risco e melhoria de forma educativa
- AND não inclui instruções de exploração ofensiva

### Requirement: Evidências e fontes por argumento

Cada argumento de diagnóstico MUST apresentar fontes de suporte. O mínimo MUST ser 1 fonte por argumento. O nível preferido SHOULD ser 2 ou mais fontes independentes quando houver material confiável disponível e relevante.

#### Scenario: Argumento com suporte mínimo

- GIVEN um argumento de diagnóstico publicado
- WHEN o usuário consulta sua fundamentação
- THEN existe pelo menos 1 fonte de referência associada ao argumento

#### Scenario: Argumento com suporte preferido

- GIVEN um argumento de diagnóstico para tema com ampla documentação
- WHEN o relatório é gerado
- THEN o argumento apresenta preferencialmente 2 ou mais fontes independentes

### Requirement: Comportamento sob incerteza e ambiguidade

Quando não houver sinais suficientes para conclusão forte, o sistema MUST sinalizar incerteza de forma explícita, MUST informar limitação de confiança e MUST recomendar validação manual.

#### Scenario: Evidência insuficiente

- GIVEN um repositório com contexto ambíguo ou dados incompletos
- WHEN a análise não consegue concluir com confiança
- THEN o resultado marca a limitação de confiança explicitamente
- AND inclui recomendação de verificação manual
- AND evita afirmações categóricas sem evidência

### Requirement: Restrições de segurança e comunicação

O sistema MUST respeitar limites defensivos e de privacidade: não expor segredos, tokens ou credenciais, e manter tom educacional, calmo e prático em toda comunicação ao usuário.

#### Scenario: Geração de relatório seguro

- GIVEN a geração de um relatório de diagnóstico
- WHEN os dados são apresentados ao usuário
- THEN nenhum segredo/token/credencial é exibido
- AND o texto mantém tom não alarmista e prático

## Acceptance Criteria

1. Em todas as superfícies de relatório, não existe score global exibido.
2. O fluxo do usuário expõe apenas um tipo de scan, sem seletor de modo.
3. 100% das verificações exibidas contêm status Green/Yellow/Red e os quatro campos didáticos obrigatórios.
4. Há evidência de adaptação contextual entre pelo menos dois contextos distintos de repositório, com redução de classificações inadequadas por ausência de contexto.
5. 100% dos argumentos possuem no mínimo 1 fonte; meta preferida: >= 70% dos argumentos com 2+ fontes quando aplicável.
6. Em casos ambíguos, o relatório exibe limitação de confiança e recomendação de verificação manual.
7. Nenhum conteúdo de saída contém segredos, tokens, credenciais, nem orientação ofensiva.
8. A redação dos achados mantém tom didático, calmo e não alarmista.

## Non-Goals and Constraints

- Não implementar frontend, backend, banco, autenticação, analytics ou migração nesta mudança de spec.
- Não reintroduzir score global, ranking, média, ou mentalidade de competição.
- Não criar múltiplos modos de scan para o usuário nesta proposta.
- Não incluir instruções ofensivas, exploração de vulnerabilidades ou conteúdo fora do escopo defensivo.
- Não exigir exposição de dados sensíveis para fundamentar argumentos.
