# Regras de classificação — faltantes na aduana (SSP53)

Fonte da verdade das regras (em português). Cada regra vive em 3 lugares, cada um com um papel:

| Onde | O que fica lá | Quem muda |
|---|---|---|
| **Aba `Regras`** da planilha principal | Ordem, Código, Ligada (Sim/Não), Pergunta, Resultado, Observação, Abas usadas | **o Rafael, sozinho** |
| `apps-script/painel/Regras.html` (objeto `LOGICA`) | o que cada regra verifica na linha do tempo, pelo Código | o Claude |
| este arquivo | a explicação de cada regra, para consulta | o Claude, a cada regra nova/alterada |

**Sem mexer em código o Rafael pode:** mudar a ordem (a primeira regra que bater classifica o pacote), desligar uma
regra (Ligada = Não), mudar o texto do Resultado e a Observação. O painel mostra a lista em **"Regras em uso"**, com
quantos pacotes do dia caíram em cada uma. Mudança na aba vale no próximo **Atualizar agora**.
**Mudar o que a regra verifica** (a pergunta em si) ou criar regra nova: pedir ao Claude. Regra que está na aba mas
ainda não tem lógica no código aparece como "sem lógica ainda — pedir ao Claude" e é pulada.

**Como o painel monta cada pacote:** faltante = linha da aba **Aduana** com Estado "Faltante" no dia analisado.
Tudo começa no **sorting**: a linha do tempo começa no **primeiro bipe do pacote no dia na aba Histórico** (qualquer
processo — sorting ou conteinerização) e vai até **36 h depois**, juntando Histórico, Auditoria de Carrinho, Aduana,
Problem Solving, Inventário, Torre Aduana e Direcionamento Manual. Passadas as 36 h, não entra mais nada daquele pacote.
Sem bipe no Histórico no dia: a linha do tempo começa à 00:00 e o pacote ganha a etiqueta "sem sorting no dia".
As regras olham essa linha do tempo. A mesma regra vale para separáveis e volumosos.

O que nenhuma regra cobrir fica **Regra em aberto** e o Rafael classifica no painel (aba `Classificação manual`),
que sempre vence a regra.

### Como mandar uma regra nova (modelo)
- **Pergunta** (se SIM, o pacote para aqui): ex. "Depois do sorting, o próximo bipe foi avaria com dano Produto e Não reparado?"
- **Resultado**: ex. "PRODUTO AVARIADO"
- **Onde olhar**: abas e colunas (ex. Problem Solving › Problema = "Pacote avariado", Resolução = "Não reparado")
- **Exemplo**: um Shipment ID e o dia em que isso aconteceu (para testar)
- **Ordem**: antes/depois de qual regra

## Regras vigentes

*(vazio — o Rafael vai mandar as regras novas.)*

| Ordem | Código | Pergunta (se SIM, o pacote para aqui) | Resultado | Abas usadas | Observação |
|---|---|---|---|---|---|

---

## Anexo — regras antigas (NÃO usadas)
Regras do fluxograma "Regras do Faltante Volumoso" (artefato no claude.ai, 14 regras, até 07/11/2026).
O Rafael decidiu em 07/11 trocar por regras novas; ficam aqui só como referência.

### Separação inicial
1. **Saiu A MAIS em outra vaga?** (Torre de Aduana) → Sim: Regra 1
2. **Bipado no sorting no dia?** → Não: Regra 2 · Sim: Regra 3

### Regra 1 — saiu a mais em outra vaga (vale com ou sem bipe no sorting)
| # | Código | Pergunta | Resultado | Tipo |
|---|---|---|---|---|
| r01 | P01 caso 2 | Vários pacotes da mesma rota a mais na torre? | ERRO NA PUXADA | erro |
| r02 | P01 caso 1 | (senão) | ERRO DE CONTEINERIZAÇÃO | erro |

### Regra 2 — sem bipe no sorting
| # | Código | Pergunta | Resultado | Tipo | Observação |
|---|---|---|---|---|---|
| r03 | P02 sem sorting | Avaria: dano Produto e Não reparado? | PRODUTO AVARIADO | avariado | Produto danificado, não volta para a operação |
| r04 | P05 / P06 | Está na aba Tratativa? | PACOTE PERDIDO + coluna S | perdido | **Provisória**: você vai procurar onde foram bipados |
| r05 | P07 | (senão) | REGRA EM ABERTO | aberto | Caso: 48364043262 |

### Regra 3 — com bipe no sorting (ordem de avaliação)
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

### Regra 4 — com sorting, NÃO bipado na auditoria de carrinho (ramo de r06)
| # | Código | Pergunta | Resultado | Tipo | Observação |
|---|---|---|---|---|---|
| r09 | P03 regra 1 | Próximo bipe foi no Sorting? | ERRO DE CONTEINERIZAÇÃO + erro na auditoria | erro | Regra 2 do P03 (cobertura da auditoria por rota, separável × volumoso) ainda a verificar |
| r10 | P03 sub-regra | Próximo bipe: inventário e logo depois sorting? | ERRO DE CONTEINERIZAÇÃO + erro na auditoria | erro | |
| — | — | (senão) | REGRA EM ABERTO | aberto | |

### Resultados conhecidos (lista do painel)
- Erros de processo: Erro de conteinerização · Erro de conteinerização + erro na auditoria · Erro na puxada · Erro de puxada, etiqueta blanca · Erro de aduana
- Perdido: Pacote perdido · Pacote Perdido Risco de Allowance
- Outros: Produto avariado · Abertura de Caso PS/Avaria Após Iniciar Aduana · Pacote no inventário - deslocado - ok

### Pendências (da versão antiga)
- Histórico de sorting de 29/10 com exatamente 25.000 linhas: confirmar com quem alimenta a planilha de Conteneirização.
- Regra 2 do P03: precisa da base com o tipo (separável × volumoso) de todos os pacotes da rota.
- Ponte: Aduana importa só A:N e Tratativa só A:T — decidir se volta para A:Z e A:AI.
- P05/P06 sem bipe no sorting: regra provisória.
- P07 (48364043262): regra em aberto.
- Regras para **separáveis** ainda não estão documentadas aqui (estavam só no código do painel antigo).
