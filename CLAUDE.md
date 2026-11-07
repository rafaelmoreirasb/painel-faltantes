# Painel de Faltantes — SSP53 Mirassol

Projeto do Rafael (analista novo na operação SSP53). Responda sempre em **português do Brasil**, linguagem simples (ele não é programador).

## Objetivo
Para a reunião diária, mostrar cada pacote **faltante na aduana**, a linha do tempo de todos os bipes do shipment
nas últimas **36 h** e a **classificação do problema** segundo as regras de `regras/REGRAS.md`.
O painel precisa se atualizar sozinho: um bipe que entra à noite tem que aparecer na reunião do dia seguinte.

## Como o projeto está organizado
```
CLAUDE.md          este arquivo (contexto que toda conversa nova lê)
apps-script/       scripts do Google Apps Script (cópia fiel do que está instalado)
painel/            painel HTML público (GitHub Pages)
regras/REGRAS.md   regras de classificação — fonte da verdade
docs/decisoes.md   registro das decisões
```
Conversas no Claude Code: **uma por tópico**, título "Faltantes · <tópico>" e etiqueta `faltantes`
(tópicos: Organização, Apps Script, Importador Excel, Regras, Painel). Antes de encerrar um tópico,
atualize os arquivos do repositório — é aqui que o conhecimento fica, não no chat.

## Planilhas (Google Sheets)
| Planilha | ID | Abas |
|---|---|---|
| **Base Mirassol SSP53** (principal, lida pelo painel) | `1z3Qm-qR6kymLBBOSuw7Yh-LLdOvfkR-pyTfgIBUBIQM` | Histórico (~240 mil linhas), Solução de Problemas, Torre de Aduana, Inventário, One Bipe, Tratativas, Aduana, Auditoria de Carrinho, Justificativas |
| Conteneirização de Pacotes - Base SSP53 | `1nDqe83XDoY-A3u6rNxaMP2RT74mZNjrYSDUY2c9dKhk` | Histórico, Direcionamento Manual |
| Origem do Histórico (Labor) | `1O4clXDtcty6TiCVsBXFu0I45Hv9LSysBoI70M4Kd6qc` | gid=0 |
| Origem do Direcionamento Manual | `1No0tZ8yI7HJpKV2V2_PgKqIBpHXVlbTKsdy-lhBzkYk` | gid=1903954199 |

## Como os dados entram
| Dado | Como entra hoje |
|---|---|
| Histórico (bipes de sorting/containerize) | `apps-script/historico.gs`, a cada 15 min (projeto Labor_Sorting) |
| Direcionamento Manual | `apps-script/direcionamento-manual.gs`, a cada 15 min (projeto separado) |
| Sorting | query automática (já aparece na planilha) |
| Aduana, Auditoria de Carrinho, Solução de Problemas | Rafael exporta 3 CSV por dia e joga na pasta do Drive **Faltantes – Entrada** → `apps-script/importar-relatorios.gs` (a cada 15 min; ver `docs/importador.md`). Quando o acesso às queries sair, desligar esse gatilho. |
| Inventário, Tratativas | já se atualizam sozinhos |
| Torre de Aduana | ? (confirmar com o Rafael) |

**Retenção:** a planilha principal guarda só os últimos **15 dias** dessas 3 abas; toda madrugada o resto vai para
`Arquivo Faltantes AAAA-MM` (pasta "Faltantes – Arquivo"). Motivo: limite de 10 milhões de células do Google
(a planilha já tinha ~4,8 milhões; os 3 relatórios somam ~210 mil células/dia).

**Formato das abas (após o importador):** tudo gravado como texto; datas `dd/mm/aaaa`, horas 24h; colunas extras
`Importado em` e `Chave` no fim. Aduana: Shipment ID, Placa, Data auditoria, Hora, ID da rota, Estado, Rep auditoria,
Tipo do pacote. Auditoria de Carrinho: Shipment ID, Data, Hora, Gaiola, Estado, Rep auditoria, Tipo. Solução de
Problemas: mesmas colunas de antes (com "Hora","Data" no lugar de "Data","de") + ID do caso + Data de fechamento.
Tipo do pacote / Tipo ficam em branco até chegar a aba que diferencia separável × volumoso.

## Regras de trabalho
- Scripts Apps Script: sempre com trava (`LockService`), coluna `Chave` para não duplicar, `Importado em`, e um gatilho de 15 min criado por função `criarGatilho…` que só mexe no próprio gatilho. O Apps Script do Rafael está em **inglês** (Executions, Triggers, Time-driven).
- Painel: nunca baixar a aba Histórico inteira; ler pela consulta `gviz/tq` com filtro de data.
- Planilha pública: contém nomes de funcionários; não adicionar dados pessoais além do necessário.
- Painel antigo (privado, artefato): https://claude.ai/artifact/EECm1GZo8moU2ETjCFQwVv — classificações manuais na coleção `classificacoes` (migrar para a aba `Classificação manual`).
- Fluxograma de regras (artefato): https://claude.ai/artifact/Wo4o8nWo5fQjjb8ntuff5x
- Scripts também salvos no Drive, pasta "Scripts Apps Script": https://drive.google.com/drive/folders/14z5V6KUpciDmXu3FVkzsbKU_JOIeN27R
