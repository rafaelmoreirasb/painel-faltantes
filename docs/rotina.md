# Rotina diária — Painel de Faltantes

Quase tudo roda sozinho. A parte do Rafael: **exportar, olhar o painel e decidir o que a regra não decide.**

## Todo dia
1. **Exportar os 3 relatórios** (~5 min): Aduana (tem "Placa"), Auditoria de Carrinho (tem "Gaiola") e Problem Solving.
   De tarde (~15h, quando ficam disponíveis) e, se der, **de novo de manhã antes da reunião** (pega o que aconteceu à noite).
   Pode repetir dias — nada duplica.
2. **Jogar na pasta do Drive "Faltantes – Entrada"** (computador ou app do Drive no celular). O nome do arquivo não importa.
3. **Esperar até 15 min**: os arquivos somem da pasta (vão para "Processados") = entraram na planilha. ~5 min depois o
   painel já mostra. Com pressa: **Atualizar agora** no painel (~10 s).
4. **Abrir o painel** (conta @dhl.com; no computador pessoal, janela anônima + login DHL):
   https://script.google.com/a/macros/dhl.com/s/AKfycby_asEzOPexlsqS279IgK4b-SI8D6MHjAHx5eAeg5s5lBxOz8zQ-cqyy7tnNRNj2Vpq/exec
   Escolher o dia. Conferir no topo "Dados preparados às HH:MM" (no máximo ~10 min atrás).
5. **Revisar, nesta ordem** (10–20 min):
   1. **Para decidir** → "Mostrar só os conflitos" → *Manter a minha* ou *Usar a regra*.
   2. **Regra em aberto** (barra cinza) → ler a linha do tempo → preencher *Sua classificação* e *Raciocínio* (salva sozinho).
   3. **Bipes novos** (amarelo) → ver se mudam alguma conclusão.
   4. **Sem sorting no dia** → conferir esses pacotes.
6. **Na reunião**: painel aberto; clicar nas barras de "Resultado de cada faltante" para mostrar cada grupo; busca por
   shipment/rota/rep. Atualiza sozinho a cada 5 min.

## Uma vez por semana (2 min)
- Aba **Log importação** da planilha: linhas com "OK".
- E-mail "Painel de Faltantes: erro em…" → abrir o log e mandar print ao Claude.
- Arquivamento (> 15 dias → arquivo mensal), gatilhos e cache são automáticos.

## Se algo der errado
| O que aparece | O que fazer |
|---|---|
| Arquivo parado em "Faltantes – Entrada" há mais de 30 min | Apps Script › **Triggers**: tem `importarRelatorios`? Se não, rodar `criarGatilhoRelatorios` |
| Arquivo foi para "Não reconhecidos" | O formato do relatório mudou → mandar o arquivo ao Claude |
| "Dados preparados às" com horário velho | **Triggers**: tem `painelPreparar`? Se não, rodar `painelCriarGatilho` |
| Painel não abre | Conferir login com a conta @dhl.com |
| Linha do tempo estranha | **Atualizar agora**; se continuar, mandar shipment + dia ao Claude |

## Quando quiser mudar algo
1. Pedir na conversa do assunto ("Faltantes · Regras", "Faltantes · Painel"…), em português normal.
2. **Visual ou regras** → o Claude altera e em até 5 min aparece no painel. Nada a fazer.
3. **`Painel.gs`** (leitura da planilha, raro) → o Claude avisa; colar o arquivo no Apps Script e
   Deploy › Manage deployments › lápis › New version › Deploy.
4. **Ordem, liga/desliga e texto das regras** → direto na aba **Regras** da planilha.
