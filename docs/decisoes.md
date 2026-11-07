# Decisões do projeto

| Data | Decisão | Motivo |
|---|---|---|
| 07/11/2026 | Um repositório (`painel-faltantes`) + uma conversa do Claude por tópico | Conversas organizadas; o `CLAUDE.md` dá o contexto a cada conversa nova |
| 07/11/2026 | Excel diários entram por uma pasta no Google Drive + Apps Script a cada 15 min | Funciona sem o Claude; quando a query sair, é só desligar |
| 07/11/2026 | Painel novo em HTML público (GitHub Pages) lendo a planilha ao vivo | O painel antigo (artefato) usava um retrato dos dados e não via bipes da noite |
| 07/11/2026 | Planilha compartilhada como "qualquer pessoa com o link" | Necessário para o HTML público ler os dados; decisão do Rafael |
| 07/11/2026 | Regras aplicadas no navegador; o que não casa vira "Regra em aberto" | Classificação manual na aba `Classificação manual` sempre vence a regra |
| 07/11/2026 | Painel lê só a janela necessária (consulta com filtro de data) | A aba Histórico tem ~240 mil linhas; baixar tudo travaria o navegador |
