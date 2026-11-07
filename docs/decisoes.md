# Decisões do projeto

| Data | Decisão | Motivo |
|---|---|---|
| 07/11/2026 | Um repositório (`painel-faltantes`) + uma conversa do Claude por tópico | Conversas organizadas; o `CLAUDE.md` dá o contexto a cada conversa nova |
| 07/11/2026 | Excel diários entram por uma pasta no Google Drive + Apps Script a cada 15 min | Funciona sem o Claude; quando a query sair, é só desligar |
| 07/11/2026 | Painel novo em HTML público (GitHub Pages) lendo a planilha ao vivo | O painel antigo (artefato) usava um retrato dos dados e não via bipes da noite |
| 07/11/2026 | Planilha compartilhada como "qualquer pessoa com o link" | Necessário para o HTML público ler os dados; decisão do Rafael |
| 07/11/2026 | Regras aplicadas no navegador; o que não casa vira "Regra em aberto" | Classificação manual na aba `Classificação manual` sempre vence a regra |
| 07/11/2026 | Painel lê só a janela necessária (consulta com filtro de data) | A aba Histórico tem ~240 mil linhas; baixar tudo travaria o navegador |
| 07/11/2026 | Importador único (`importar-relatorios.gs`) para Aduana, Auditoria de Carrinho e Problem Solving, reconhecendo o arquivo pelos cabeçalhos | O Rafael exporta esses 3 CSV todo dia; Inventário e Tratativas já se atualizam sozinhos |
| 07/11/2026 | Planilha principal guarda 15 dias; o resto vai para "Arquivo Faltantes AAAA-MM" toda madrugada | Acumular tudo na principal estouraria o limite de 10 milhões de células em ~1 mês |
| 07/11/2026 | Problem Solving: chave = nº do caso, e o caso é atualizado quando muda | O mesmo caso aparece em vários exports com estado diferente |
| 07/11/2026 | Tipo do pacote em branco por enquanto | O Rafael vai trazer uma aba que diferencia separável × volumoso |
| 07/11/2026 | Excluídas as colunas vazias L–Z da aba Histórico (Conteneirização) | Liberou ~3,7 milhões de células; a planilha caiu de ~8,7 para ~5 milhões. O script do Histórico só escreve até K |
| 07/11/2026 | Painel = Web App do Apps Script (e não GitHub Pages) | A planilha é da conta DHL e só compartilhada com dhl.com; deixá-la pública exporia dados da empresa |
| 07/11/2026 | Faltantes = aba Aduana, Estado "Faltante" no dia; linha do tempo = 1º bipe de conteinerização do dia (Histórico) + 36 h | Decisão do Rafael: a análise é diária e começa na conteinerização |
| 07/11/2026 | Separáveis e volumosos numa lista só; Tratativas fora por enquanto | Ainda não há aba de tipo na planilha nova; Tratativas só existe na planilha antiga |
| 07/11/2026 | Regras antigas aposentadas; painel sai com "Regra em aberto" e classificação manual no próprio painel | O Rafael vai mandar regras novas, iguais para os dois tipos |
