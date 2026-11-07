# Importador dos relatórios diários — passo a passo

Script: [`apps-script/importar-relatorios.gs`](../apps-script/importar-relatorios.gs)

## O que ele faz
Você joga os arquivos exportados (Aduana, Auditoria de Carrinho, Problem Solving) na pasta
**Faltantes – Entrada** do Google Drive. A cada 15 minutos o script:

1. reconhece cada arquivo pelos cabeçalhos (o nome do arquivo não importa; aceita `.csv` e `.xlsx`);
2. trata as colunas para o formato da aba (data e hora separadas, rota sem o número, hora 24h);
3. junta na aba certa da planilha **Base Mirassol SSP53** sem duplicar
   (no Problem Solving, um caso que mudou de estado **atualiza** a linha);
4. move o arquivo para **Faltantes – Entrada › Processados › AAAA-MM-DD**;
5. registra tudo na aba **Log importação** e manda e-mail se der erro.

Toda madrugada (3h) as linhas com mais de 15 dias saem da planilha principal e vão para a planilha
**Arquivo Faltantes AAAA-MM**, na pasta **Faltantes – Arquivo**. Nada é apagado de vez — isso só evita
que a planilha principal passe do limite de 10 milhões de células do Google.

| Arquivo exportado | Aba |
|---|---|
| `audited_shipments…` com coluna **Placa** (Aduana) | Aduana |
| `audited_shipments…` com coluna **Gaiola** (Auditoria de Carrinho) | Auditoria de Carrinho |
| `report_logistics_problem_solving…` | Solução de Problemas |

## Instalação (uma vez só, ~10 minutos)
O seu Apps Script está em inglês; os nomes dos botões estão em inglês com a tradução entre parênteses.

1. Acesse **script.google.com** (com a mesma conta da planilha) e clique em **New project** (Novo projeto).
2. Clique em "Untitled project" no topo e renomeie para **Importar Relatórios**.
3. Apague o que estiver no editor e cole **todo** o conteúdo de `apps-script/importar-relatorios.gs`.
   Clique no disquete (**Save**).
4. *(Só se você for usar `.xlsx`)* No menu da esquerda, **Services** (Serviços) › **+** › escolha **Drive API** › **Add**.
   Para `.csv` não precisa.
5. No topo, escolha a função **criarGatilhoRelatorios** e clique em **Run** (Executar).
   O Google vai pedir permissão: **Review permissions** › escolha sua conta › **Advanced** (Avançado) ›
   **Go to Importar Relatórios (unsafe)** › **Allow** (Permitir). Isso é normal para scripts seus.
   Ele cria a pasta **Faltantes – Entrada** no seu Drive e os dois gatilhos.
6. Coloque os 3 arquivos de hoje na pasta **Faltantes – Entrada**.
7. Volte ao Apps Script, escolha **importarRelatorios** e clique em **Run**.
   - **Na primeira vez** ele converte as abas antigas para o formato novo e faz uma cópia de segurança em
     **Faltantes – Arquivo › Backup antes do importador – dd-mm-aaaa**. Pode demorar alguns minutos.
   - Se aparecer erro de tempo esgotado ("Exceeded maximum execution time"), é só clicar **Run** de novo:
     ele continua de onde parou.
8. Confira a aba **Log importação** na planilha e o menu **Executions** (Execuções) do Apps Script.

Pronto. A partir daí, é só jogar os arquivos na pasta todo dia.

## Dia a dia
- Exporte os 3 relatórios e arraste para **Faltantes – Entrada** (pode ser pelo celular, no app do Drive).
- Pode mandar arquivos com dias repetidos: o que já existe não entra de novo.
- Em até 15 minutos os arquivos somem da pasta (vão para Processados) e os dados estão na planilha.

## Quando algo der errado
| Sinal | O que fazer |
|---|---|
| Arquivo foi para **Não reconhecidos** | O cabeçalho mudou. Mande o arquivo para o Claude ajustar o script. |
| E-mail "erro em Importação de relatórios" | Veja a aba **Log importação**; a mensagem diz o arquivo e o motivo. |
| Arquivos parados na pasta há mais de 30 min | Apps Script › **Triggers** (Acionadores): confira se `importarRelatorios` está lá. Se não, rode `criarGatilhoRelatorios` de novo. |

## Observações
- **Tipo do pacote** (Aduana) e **Tipo** (Auditoria de Carrinho) ficam em branco por enquanto. Quando chegar a
  aba que diferencia separável × volumoso, o painel faz o cruzamento. As linhas antigas que já tinham tipo mantêm.
- As abas antigas de Problem Solving tinham a hora **sem am/pm** (ex.: "10:47" que era 22:47). Os casos que vierem
  de novo num arquivo são corrigidos automaticamente; os mais antigos ficam como estavam.
- Quando o acesso às queries sair, desligue o gatilho `importarRelatorios` em **Triggers**.
