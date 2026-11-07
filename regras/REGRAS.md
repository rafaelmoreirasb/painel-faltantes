# Regras de classificação — faltantes na aduana (SSP53)

Fonte da verdade das regras. O painel (`painel/index.html`) implementa exatamente o que está aqui.
Origem: fluxograma "Regras do Faltante Volumoso" (artefato no claude.ai, coleção `regras`, 14 regras, 07/11/2026).

**Como funciona:** cada pacote faltante desce pelas perguntas na ordem e **para na primeira que responder "sim"**.
O que não se encaixa em nenhuma regra fica **REGRA EM ABERTO** e é classificado à mão
(aba `Classificação manual` da planilha — a classificação manual sempre vence a regra).

Janela de análise: todos os registros do shipment nas **36 h** antes da reunião (histórico, sorting,
auditoria de carrinho, inventário, solução de problemas, tratativas, torre de aduana).

## Separação inicial
1. **Saiu A MAIS em outra vaga?** (Torre de Aduana) → Sim: Regra 1
2. **Bipado no sorting no dia?** → Não: Regra 2 · Sim: Regra 3

## Regra 1 — saiu a mais em outra vaga (vale com ou sem bipe no sorting)
| # | Código | Pergunta | Resultado | Tipo |
|---|---|---|---|---|
| r01 | P01 caso 2 | Vários pacotes da mesma rota a mais na torre? | ERRO NA PUXADA | erro |
| r02 | P01 caso 1 | (senão) | ERRO DE CONTEINERIZAÇÃO | erro |

## Regra 2 — sem bipe no sorting
| # | Código | Pergunta | Resultado | Tipo | Observação |
|---|---|---|---|---|---|
| r03 | P02 sem sorting | Avaria: dano Produto e Não reparado? | PRODUTO AVARIADO | avariado | Produto danificado, não volta para a operação |
| r04 | P05 / P06 | Está na aba Tratativa? | PACOTE PERDIDO + coluna S | perdido | **Provisória**: você vai procurar onde foram bipados |
| r05 | P07 | (senão) | REGRA EM ABERTO | aberto | Caso: 48364043262 |

## Regra 3 — com bipe no sorting (ordem de avaliação)
| Ordem | # | Código | Pergunta | Resultado | Tipo | Observação |
|---|---|---|---|---|---|---|
| 5.4 | r14 | Etiqueta blanca | Próximo bipe: Etiqueta blanca na Solução de problemas e bipado no sorting no mesmo dia ou no seguinte? | ERRO DE PUXADA, ETIQUETA BLANCA | erro | Não deu rota, mas o produto deveria ir para a vaga para ser bipado na aduana |
| 5.5 | r13 | Solução | Próximo bipe foi em Solução de problemas? | Coluna B + coluna K (ex.: Pacote desconteinerizado, Não cabe no veículo) | análise | Vale com ou sem auditoria de carrinho; avaria com dano Produto/Não reparado continua Produto avariado |
| 6 | r06 | — | Bipado na auditoria de carrinho (Correto/A mais)? | Não se aplica → segue | — | Pendente ou Faltante na auditoria conta como NÃO bipado. Se **não** bipado → Regra 4 |
| 7 | r07 | P02 | Próximo bipe: avaria, dano Produto, Não reparado? | PRODUTO AVARIADO | avariado | |
| 8 | r08 | Deslocado | Deslocado/Verificado em Problem Solving e sorting no dia seguinte? | PACOTE NO INVENTÁRIO - DESLOCADO - OK | ok | Sem bipe no dia seguinte: mostra só área e situação |
| 11 | r11 | P04 | Só Pendente no inventário e está na Tratativa? | PACOTE PERDIDO + coluna S | perdido | Significado dos status do inventário a confirmar |
| 12 | r12 | — | Depois do sorting, só aparece na Tratativa? | PACOTE PERDIDO + coluna S | perdido | |
| — | — | — | (senão) | REGRA EM ABERTO | aberto | |

## Regra 4 — com sorting, NÃO bipado na auditoria de carrinho (ramo de r06)
| # | Código | Pergunta | Resultado | Tipo | Observação |
|---|---|---|---|---|---|
| r09 | P03 regra 1 | Próximo bipe foi no Sorting? | ERRO DE CONTEINERIZAÇÃO + erro na auditoria | erro | Regra 2 do P03 (cobertura da auditoria por rota, separável × volumoso) ainda a verificar |
| r10 | P03 sub-regra | Próximo bipe: inventário e logo depois sorting? | ERRO DE CONTEINERIZAÇÃO + erro na auditoria | erro | |
| — | — | (senão) | REGRA EM ABERTO | aberto | |

## Resultados conhecidos (lista do painel)
- Erros de processo: Erro de conteinerização · Erro de conteinerização + erro na auditoria · Erro na puxada · Erro de puxada, etiqueta blanca · Erro de aduana
- Perdido: Pacote perdido · Pacote Perdido Risco de Allowance
- Outros: Produto avariado · Abertura de Caso PS/Avaria Após Iniciar Aduana · Pacote no inventário - deslocado - ok

## Pendências
- Histórico de sorting de 29/10 com exatamente 25.000 linhas: confirmar com quem alimenta a planilha de Conteneirização.
- Regra 2 do P03: precisa da base com o tipo (separável × volumoso) de todos os pacotes da rota.
- Ponte: Aduana importa só A:N e Tratativa só A:T — decidir se volta para A:Z e A:AI.
- P05/P06 sem bipe no sorting: regra provisória.
- P07 (48364043262): regra em aberto.
- Regras para **separáveis** ainda não estão documentadas aqui (estavam só no código do painel antigo).
