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
apps-script/painel/  O PAINEL: Web App do Apps Script (Painel.gs, PainelTela.html, Regras.html) — ver docs/painel.md
painel/            só um aviso no GitHub Pages apontando para o Web App
regras/REGRAS.md   regras de classificação — fonte da verdade
docs/decisoes.md   registro das decisões
docs/rotina.md     rotina diária do Rafael (exportar → Drive → painel → revisar)
```
Conversas no Claude Code: **uma por tópico**, título "Faltantes · <tópico>" e etiqueta `faltantes`
(tópicos: Organização, Apps Script, Importador Excel, Regras, Painel). Antes de encerrar um tópico,
atualize os arquivos do repositório — é aqui que o conhecimento fica, não no chat.

## Planilhas (Google Sheets)
| Planilha | ID | Abas |
|---|---|---|
| **Conteneirização de Pacotes - Base SSP53** (PRINCIPAL — dona: rafael.dasilvabarbosa@dhl.com, compartilhada com dhl.com; recebe o importador e é lida pelo painel) | `1nDqe83XDoY-A3u6rNxaMP2RT74mZNjrYSDUY2c9dKhk` | Histórico (~245 mil linhas), Direcionamento Manual, Torre Aduana, Inventário (~154 mil), Auditoria de Carrinho, Problem Solving, Aduana |
| Base Mirassol SSP53 (antiga; usada pelo painel antigo) | `1z3Qm-qR6kymLBBOSuw7Yh-LLdOvfkR-pyTfgIBUBIQM` | Histórico, Solução de Problemas, Torre de Aduana, Inventário, One Bipe, Tratativas, Aduana, Auditoria de Carrinho, Justificativas |
| Origem do Histórico (Labor) | `1O4clXDtcty6TiCVsBXFu0I45Hv9LSysBoI70M4Kd6qc` | gid=0 |
| Origem do Direcionamento Manual | `1No0tZ8yI7HJpKV2V2_PgKqIBpHXVlbTKsdy-lhBzkYk` | gid=1903954199 |

## Como os dados entram
| Dado | Como entra hoje |
|---|---|
| Histórico (bipes de sorting/containerize) | `apps-script/historico.gs`, a cada 15 min (projeto Labor_Sorting) |
| Direcionamento Manual | `apps-script/direcionamento-manual.gs`, a cada 15 min (projeto separado) |
| Sorting | query automática (já aparece na planilha) |
| Aduana, Auditoria de Carrinho, Problem Solving | Rafael exporta 3 CSV por dia e joga na pasta do Drive **Faltantes – Entrada** → `apps-script/importar-relatorios.gs` (a cada 15 min; ver `docs/importador.md`). Quando o acesso às queries sair, desligar esse gatilho. |
| Inventário, Tratativas | já se atualizam sozinhos |
| Torre Aduana | ? (confirmar com o Rafael) |
| Regras | o Rafael edita (ordem, liga/desliga, texto); criada por `painelCriarAbaRegras` |
| Resumo diário | gatilho `painelPreparar` regrava cada dia enquanto está na planilha (≤15 dias); `painelPreencherResumo` preenche de uma vez. 1 linha por faltante por dia (Dia, Shipment, Rota, Ilha, Rep, Resultado da regra, Código, Teve sorting) — base de semana/mês. Regras rodam também no servidor (eval do Regras.html) |
| Responsáveis | o Rafael preenche no painel: 1 pessoa por **ilha = letra da rota** (A1, A2… = A) por dia, sem turno. Erro de conteinerização → "cobrar" o responsável da ilha no dia |
| Colaboradores | aba que o Rafael cria; o painel lê a coluna com "Nome" no cabeçalho (senão a A) para sugerir nomes |
| Classificação manual | o Rafael classifica no painel (ou direto na aba); o painel grava Data, Shipment ID, Classificação, Raciocínio, Quem classificou, **Regra conferida** (F: regra que ele viu e decidiu não usar — conflito manual × regra) |

**Retenção:** a planilha principal guarda só os últimos **15 dias** dessas 3 abas; toda madrugada o resto vai para
`Arquivo Faltantes AAAA-MM` (pasta "Faltantes – Arquivo"). Motivo: limite de 10 milhões de células do Google
(em 07/11 a planilha tinha ~8,7 milhões de células; após excluir as colunas vazias L–Z do Histórico, ~5 milhões; os 3 relatórios somam ~210 mil células/dia).

**Formato das abas (após o importador):** tudo gravado como texto; datas `dd/mm/aaaa`, horas 24h; colunas extras
`Importado em` e `Chave` no fim. Aduana: Shipment ID, Placa, Data auditoria, Hora, ID da rota, Estado, Rep auditoria,
Tipo do pacote. Auditoria de Carrinho: Shipment ID, Data, Hora, Gaiola, Estado, Rep auditoria, Tipo. Problem
Solving: mesmas colunas de antes (com "Hora","Data" no lugar de "Data","de") + ID do caso + Data de fechamento.
Tipo do pacote / Tipo ficam em branco até chegar a aba que diferencia separável × volumoso.

**Painel publicado (Web App):** https://script.google.com/a/macros/dhl.com/s/AKfycby_asEzOPexlsqS279IgK4b-SI8D6MHjAHx5eAeg5s5lBxOz8zQ-cqyy7tnNRNj2Vpq/exec
(GitHub Pages https://rafaelmoreirasb.github.io/painel-faltantes/painel/ só redireciona para ele.)

## Regras de trabalho
- Scripts Apps Script: sempre com trava (`LockService`), coluna `Chave` para não duplicar, `Importado em`, e um gatilho de 15 min criado por função `criarGatilho…` que só mexe no próprio gatilho. O Apps Script do Rafael está em **inglês** (Executions, Triggers, Time-driven).
- **Painel = Web App do Apps Script** (planilha é da conta DHL rafael.dasilvabarbosa@dhl.com, compartilhada só com o
  domínio dhl.com — NÃO é pública; a consulta pública `gviz` não funciona). Publicado com "Execute as: Me" e
  "Anyone within DHL Group". Todo código do painel fica num objeto `PainelFaltantes` + funções soltas com prefixo
  `painel…`, porque divide o projeto **"Importar Relatórios"** (projeto solto, NÃO preso à planilha: abrir sempre por ID) e o espaço de nomes global com o importador.
- Painel lê só o trecho de linhas dos dias D..D+2 (acha pela coluna de data). Gatilho `painelPreparar` (5 min) pré-calcula
  os dias dos últimos 4 dias no CacheService (6 h); o painel abre do cache.
- **`PainelTela.html` e `Regras.html` são servidos do GitHub** (raw, branch **main**, cache 5 min; reserva = cópia no projeto):
  mudança de visual/regras = só commit+push no main, sem o Rafael colar nada. Mudança em `Painel.gs` exige ele colar e publicar
  New version — então a tela NUNCA pode depender de função nova do servidor sem checar se ela existe (compatibilidade).
- **TODA conversa envia direto para o `main`** (o painel publicado lê o `main`). Nunca deixar trabalho só num ramo
  `claude/...` — em 08/11 as regras R01–R04 "sumiram" do painel por isso.
- Linha do tempo: começa no **sorting** = 1º bipe do pacote no dia na aba Histórico (qualquer processo) e vai até 36 h depois.
- Regras: `regras/REGRAS.md` (português, explicação) + aba **`Regras`** da planilha (ordem, Ligada Sim/Não, texto do resultado —
  o Rafael edita sozinho) + `apps-script/painel/Regras.html` (objeto `LOGICA`: o que cada Código verifica). Regras antigas (14) NÃO
  são usadas; o Rafael vai mandar regras novas, iguais para separáveis e volumosos.
- Testes locais: o servidor do painel e o importador rodam no Node com SpreadsheetApp simulado e os CSV/dados reais;
  a tela roda no Playwright com `google.script.run` simulado.
- Painel antigo (privado, artefato): https://claude.ai/artifact/EECm1GZo8moU2ETjCFQwVv — classificações manuais na coleção `classificacoes` (migrar para a aba `Classificação manual`).
- Fluxograma de regras (artefato): https://claude.ai/artifact/Wo4o8nWo5fQjjb8ntuff5x
- Scripts também salvos no Drive, pasta "Scripts Apps Script": https://drive.google.com/drive/folders/14z5V6KUpciDmXu3FVkzsbKU_JOIeN27R
