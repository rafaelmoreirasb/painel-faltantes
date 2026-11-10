# Painel de faltantes — instalar e publicar

O painel é um site do **Google Apps Script** que roda com a sua conta. A planilha
**Conteneirização de Pacotes - Base SSP53** continua privada: só quem estiver logado com conta da DHL abre o painel.

**Link do painel (atalho):** https://faltantes-ssp53.vercel.app/ — responsáveis: https://faltantes-ssp53.vercel.app/responsaveis

**Link direto (Web App):** https://script.google.com/a/macros/dhl.com/s/AKfycby_asEzOPexlsqS279IgK4b-SI8D6MHjAHx5eAeg5s5lBxOz8zQ-cqyy7tnNRNj2Vpq/exec

Código: [`apps-script/painel/`](../apps-script/painel/) — 3 arquivos: `Painel.gs`, `PainelTela.html`, `Regras.html`.

## O que o painel mostra
- **Dia analisado**: os dias que têm faltantes na aba **Aduana** (Estado = Faltante).
- Para cada faltante, a **linha do tempo**: começa no **sorting** — primeiro bipe do pacote no dia na aba Histórico
  (qualquer processo) — e vai até **36 h depois**, juntando Histórico, Auditoria de Carrinho, Aduana, Problem Solving,
  Inventário, Torre Aduana e Direcionamento Manual. Depois das 36 h não entra mais nada daquele pacote (enquanto a janela
  está aberta aparece "janela aberta até …"). Sem bipe no Histórico no dia, a linha do tempo começa à 00:00 e ele ganha
  a etiqueta "sem sorting no dia".
- **Resultado**: a regra automática (aba **Regras** + `Regras.html`; o que nenhuma cobrir fica "Regra em aberto")
  ou a **sua classificação**, que sempre vence.
- **regra ✓** (pílula verde): quando a sua classificação manual e a regra dizem a mesma coisa, o painel mostra qual regra
  concordou (ex.: "R01 concorda · A mais na Torre na rota A3_AM1 (faltou na A1_AM1)").
- **Regras em uso**: a lista da aba Regras, com quantos pacotes do dia caíram em cada regra. Na aba você muda ordem,
  liga/desliga e o texto do resultado sozinho (ver `regras/REGRAS.md`).
- **Sua classificação**: nas duas últimas colunas você escolhe/escreve a classificação e o raciocínio. Salva sozinho ao sair
  do campo, na aba **Classificação manual** (com o e-mail de quem classificou). Também dá para escrever direto na aba.
- **Conflito: sua classificação × regra**: se um pacote tem classificação sua e uma regra passa a dizer outra coisa
  (por exemplo, chegou um bipe novo), o painel **pergunta qual manter**: indicador "Para decidir", aviso no topo com
  "Mostrar só os conflitos" e, no pacote, os botões **Manter a minha** (grava a regra na coluna F "Regra conferida" da
  aba Classificação manual — não pergunta de novo, a não ser que a regra mude outra vez) e **Usar a regra** (apaga a sua
  classificação; o raciocínio fica). Mudar o texto da sua classificação "zera" a decisão.
- **Período: Um dia · Semana · Mês · Escolher dias** (seletor no topo). Na semana/mês: indicadores do período, evolução
  por dia, **erros de conteinerização por responsável e por ilha**, resultados e a lista de pacotes. Clicar num dia abre o
  detalhe com a linha do tempo. Os dados vêm da aba **Resumo diário**, que o gatilho preenche sozinho (1 linha por faltante
  por dia) — por isso o mês continua disponível mesmo depois que a planilha arquiva os dados com mais de 15 dias.
- **Duas abas no topo: Faltantes · Responsáveis por ilha.** A aba **Responsáveis por ilha** (link direto:
  `…/exec?aba=responsaveis`, pensado para o assistente que só vai preencher isso) tem o campo **Dia**, o botão
  "Copiar do dia anterior" e **6 linhas em branco**: em cada uma digita-se a **letra da ilha** (letra da rota: A1, A2… =
  ilha **A**) e escolhe-se o nome da lista da aba **Colaboradores** (coluna "Nome"; só o nome é lido). Salva sozinho ao
  sair do campo, na aba **Responsáveis**. "+ Acrescentar ilha" cria mais linhas só naquele dia (no dia seguinte volta a
  6). Trocar a letra de uma linha já salva apaga a ilha antiga; letra repetida ou com número é recusada.
  Na aba Faltantes, pacote com **erro de conteinerização** mostra "cobrar: Nome", e o cartão "Erros de conteinerização do
  dia por responsável" resume (com o link "Preencher responsáveis por ilha ›").
  (Vale para todos os pacotes até existir a aba que diz o que é volumoso.)
- **Bipes novos** (amarelo): o que apareceu desde a última vez que você abriu o painel neste navegador.
- **Rápido**: um gatilho (`painelPreparar`, a cada 5 min) deixa prontos os dias com faltantes dos últimos 4 dias. O painel
  abre em 1–2 s e mostra "Dados preparados às HH:MM". Dias mais antigos são calculados na 1ª vez (~10 s) e ficam guardados 6 h.
- Atualiza sozinho a cada 5 min. O botão **Atualizar agora** relê a planilha na hora (~10 s).
- **A tela e as regras vêm do GitHub**: `PainelTela.html` e `Regras.html` são buscados em
  `raw.githubusercontent.com/rafaelmoreirasb/painel-faltantes/main/apps-script/painel/` (guardados 5 min). Se o GitHub
  falhar, usa as cópias do projeto. ⚠️ Quem puder alterar o repositório muda o painel — hoje só o Rafael (e o Claude).

## Endereço no Vercel (atalho para os colaboradores DHL)
O Vercel é só um **endereço fácil de lembrar** que leva ao painel. Ele não guarda nenhum dado: quem abre cai no Web App
e precisa estar logado com a **conta DHL** (o painel é "Anyone within DHL Group"; a DHL bloqueia o acesso para quem é
de fora). Configuração: `vercel.json` na raiz do repositório.

| Endereço | Abre |
|---|---|
| `https://faltantes-ssp53.vercel.app/` | o painel (aba Faltantes) |
| `https://faltantes-ssp53.vercel.app/responsaveis` | direto a aba Responsáveis por ilha |

Publicar (uma vez, feito pelo Rafael — o Claude não tem acesso à conta Vercel):
1. Entrar em **vercel.com** com a conta do GitHub (a mesma do sistema gestao-qualidade).
2. **Add New… › Project** › na lista, **Import** em `painel-faltantes`.
3. **Framework Preset: Other**; não mexer em Build/Output › **Deploy**.
4. (Opcional) **Settings › Domains** › editar o nome para algo como `faltantes-ssp53.vercel.app`.

Depois disso, todo push no `main` republica sozinho. Se o link do Web App mudar um dia, basta trocar no `vercel.json`.

## Instalar (uma vez)
1. Abra o projeto de Apps Script **Importar Relatórios** (o mesmo do importador; em script.google.com).
   O projeto não precisa estar preso à planilha: o painel abre a planilha pelo ID.
2. Crie os 3 arquivos (botão **+** ao lado de **Files**) e cole o conteúdo do GitHub:
   - **Script** chamado `Painel` → conteúdo de `apps-script/painel/Painel.gs`
   - **HTML** chamado `PainelTela` → conteúdo de `apps-script/painel/PainelTela.html`
   - **HTML** chamado `Regras` → conteúdo de `apps-script/painel/Regras.html`
   (Os nomes têm que ser exatamente esses; o Google acrescenta `.gs`/`.html` sozinho. O Apps Script não aceita dois
   arquivos com o mesmo nome, mesmo de tipos diferentes — por isso a tela não se chama `Painel`.)
3. Salve. Rode, uma vez cada (lista de funções ao lado de **Debug** › **Run**), aceitando as permissões
   (inclui "conectar a um serviço externo", que é o GitHub):
   - **painelCriarAbaRegras** — cria a aba **Regras** na planilha (se ela já existir, não mexe);
   - **painelCriarGatilho** — liga a preparação automática dos dados.
   - **painelPreencherResumo** — preenche a aba **Resumo diário** com os dias que já estão na planilha (uma vez; se
     aparecer "rode de novo", rode de novo). Em **Execution log** deve aparecer "Preparados: …"
     e "Gatilho criado". (Para conferir só a leitura, há também **painelTestar**.)
4. **Deploy** (Implantar) › **New deployment** (Nova implantação) › engrenagem › **Web app**.
   - Description: `Painel de faltantes`
   - **Execute as: Me** (Eu)
   - **Who has access: Anyone within DHL Group** (Qualquer pessoa na DHL). Se essa opção não aparecer, me avise
     antes de escolher outra — "Anyone" deixaria o painel aberto para qualquer pessoa.
   - **Deploy** › copie o link **Web app URL** (termina em `/exec`). Esse é o endereço do painel.
5. Mande o link para quem vai usar na reunião (precisam estar logados com conta DHL).

## Como pedir e aplicar uma alteração (layout, regras, colunas…)
1. **Peça ao Claude** na conversa do tópico ("Faltantes · Painel", "Faltantes · Regras"…), em português normal.
2. **O Claude altera, testa com dados reais e envia para o GitHub**, e diz no fim **quais arquivos mudaram**.
3. Depende do arquivo:
   - **`PainelTela.html` (visual) ou `Regras.html` (regras)** → **você não faz nada.** Em até 5 min o painel já mostra a
     versão nova (recarregue a página).
   - **`Painel.gs` (leitura dos dados — raro)** → cole o arquivo no Apps Script, salve e publique a versão nova:
     **Deploy › Manage deployments** › lápis › **Version: New version** › **Deploy**. O link continua o mesmo.
     (Quando isso acontecer, o Claude avisa — e cuida para a tela nova continuar funcionando com o `Painel.gs` antigo
     até você publicar.)

## Problemas comuns
| O que aparece | O que fazer |
|---|---|
| "Não foi possível atualizar: Aba … não existe" | O nome da aba mudou na planilha. Me avise o nome novo. |
| Dia novo não aparece no seletor | **Atualizar agora**. A lista de dias fica guardada só 5 min e o importador limpa ao importar. Se não aparecer, rodar **painelPreparar** e ver **Executions**. Quando entra dia novo, a aba **Log importação** ganha uma linha "(painel) … dia(s) novo(s)" |
| "Dados preparados às" com horário velho (mais de 10 min) | O gatilho parou: em **Triggers** confira `painelPreparar`; se não estiver, rode `painelCriarGatilho`. |
| Painel lento ao abrir um dia antigo | Normal na 1ª vez (~10 s); depois fica guardado 6 h. |
| "Você precisa de permissão" ao abrir o link | A pessoa não está logada com conta DHL, ou o acesso não está como "Anyone within DHL Group". |
| Classificação não salva | A conta que publicou (Execute as: Me) precisa ser editora da planilha. |
