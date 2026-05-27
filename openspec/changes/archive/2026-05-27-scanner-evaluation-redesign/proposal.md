# Proposta de Mudança: Redesenho da Avaliação do Scanner

## Intento
Redesenhar a avaliação do scanner do RepoGuard para substituir o modelo atual orientado por score/modos por uma única varredura forte, contextual e didática, alinhada ao objetivo educacional do produto.

## Problema
A abordagem de score global e múltiplos modos de scan tende a:
- simplificar demais contextos técnicos diferentes;
- induzir leitura competitiva/ansiosa em vez de aprendizado;
- dificultar explicações claras sobre por que algo está bom ou precisa de atenção.

Além disso, repositórios com perfis muito distintos (ex.: fullstack vibecoding vs. repositório de artigo científico) exigem interpretação contextual para evitar falso positivo de “má prática” quando algo é apenas uma escolha válida para aquele contexto.

## Decisões já aprovadas (fixas nesta mudança)
1. Remover completamente score global.
2. Substituir o conceito de scanner multimodo por uma única varredura geral poderosa.
3. Manter feedback didático e não alarmista em Green/Yellow/Red.
4. Suportar contextos diversos de repositório.
5. Identificar erros, más práticas e falhas de segurança de forma contextual.
6. Fornecer o máximo possível de fontes de apoio para cada argumento apresentado.

## Escopo
### Incluído
- Definição funcional da nova experiência de avaliação sem score global.
- Modelo conceitual de classificação Green/Yellow/Red com linguagem educacional e prática.
- Estratégia de contextualização por tipo/sinais de repositório.
- Diretrizes de evidência e fontes para sustentar cada achado.
- Critérios de aceite de produto para fase de implementação futura.

### Não incluído
- Implementação de frontend/backend.
- Alterações em APIs, banco, autenticação ou analytics.
- Migrações de dados.
- Criação de varreduras ofensivas (fora do escopo e contra diretrizes de segurança).

## Áreas afetadas
- Produto/UX do relatório de diagnóstico.
- Lógica de avaliação do scanner (conceitual, não implementada neste artefato).
- Documentação de critérios e fundamentação dos achados.

## Abordagem proposta
1. **Scanner único e contextual**
   - Unificar a entrada de avaliação em uma varredura geral.
   - Inferir contexto do repositório por sinais observáveis (estrutura, stack, presença/ausência esperada por tipo de projeto, metadados, automações).
   - Avaliar com regras sensíveis ao contexto, evitando penalizar padrões aceitáveis em cenários específicos.

2. **Diagnóstico sem score**
   - Remover qualquer nota global.
   - Exibir status por verificação (Green/Yellow/Red) com explicações objetivas:
     - o que foi verificado;
     - por que importa;
     - o que foi encontrado;
     - ação sugerida.

3. **Didática e tom de comunicação**
   - Linguagem calma, educativa e prática.
   - Evitar alarmismo e termos de medo.
   - Priorizar “como melhorar” em vez de “quão ruim está”.

4. **Fundamentação por fontes**
   - Cada conclusão deve referenciar fontes de suporte (docs oficiais, boas práticas reconhecidas, padrões amplamente aceitos).
   - Estruturar saída para suportar múltiplas fontes por item quando aplicável.

5. **Tratamento de incerteza**
   - Quando contexto não permitir conclusão forte, sinalizar limitação de confiança com recomendação de verificação manual.

## Riscos
- **Complexidade de contextualização**: regras contextuais podem crescer rápido e exigir governança.
- **Falsos positivos/negativos**: inferência de contexto imperfeita pode degradar confiança.
- **Custo de curadoria de fontes**: manter referências atualizadas requer processo contínuo.
- **Ambiguidade de Yellow**: categoria intermediária precisa critérios claros para consistência.

## Mitigação e rollback
- Mitigação:
  - definir taxonomia inicial de contextos e critérios mínimos por contexto;
  - introduzir nível de confiança por verificação;
  - estabelecer política de revisão periódica das fontes.
- Rollback:
  - manter feature flag de avaliação para permitir retorno temporário ao fluxo anterior durante rollout (a ser detalhado na fase de implementação).

## Critérios de sucesso (draft)
1. Não há exibição de score global em nenhum ponto do relatório.
2. Existe apenas um fluxo de scan para o usuário (sem seleção de modo).
3. Todas as verificações exibem Green/Yellow/Red com explicação didática e ação sugerida.
4. Achados variam conforme contexto do repositório, com redução observável de alertas inadequados entre contextos distintos.
5. Cada argumento de diagnóstico apresenta pelo menos uma fonte de referência; quando aplicável, múltiplas fontes.
6. Conteúdo mantém tom educacional, calmo e não alarmista.

## Dependências
- Definição de taxonomia inicial de contextos de repositório.
- Estratégia de catálogo/versionamento de fontes de referência.
- Especificação de contrato de saída para verificações contextualizadas.

## Segurança e conformidade
- Sem uso/exposição de segredos, tokens ou credenciais.
- Escopo permanece defensivo e educativo.
- Sem instruções ofensivas.

## Próximos passos recomendados
1. Converter esta proposta em spec detalhada (requisitos funcionais e exemplos de saída).
2. Definir matriz inicial de contextos (ex.: app fullstack, biblioteca, ciência/artigo, automação).
3. Definir esquema de “evidências + fontes” por verificação.
4. Planejar implementação incremental com validação por amostra de repositórios reais diversos.
