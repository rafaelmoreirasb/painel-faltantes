# Painel de faltantes — instalar e publicar

O painel é um site do **Google Apps Script** que roda com a sua conta. A planilha
**Conteneirização de Pacotes - Base SSP53** continua privada: só quem estiver logado com conta da DHL abre o painel.

**Link do painel:** https://script.google.com/a/macros/dhl.com/s/AKfycby_asEzOPexlsqS279IgK4b-SI8D6MHjAHx5eAeg5s5lBxOz8zQ-cqyy7tnNRNj2Vpq/exec

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
- **Regras em uso**: a lista da aba Regras, com quantos pacotes do dia caíram em cada regra. Na aba você muda ordem,
  liga/desliga e o texto do resultado sozinho (ver `regras/REGRAS.md`).
- **Sua classificação**: nas duas últimas colunas você escolhe/escreve a classificação e o raciocínio. Salva sozinho ao sair
  do campo, na aba **Classificação manual** (com o e-mail de quem classificou). Também dá para escrever direto na aba.
- **Bipes novos** (amarelo): o que apareceu desde a última vez que você abriu o painel neste navegador.
- Atualiza sozinho a cada 5 min. O botão **Atualizar agora** relê a planilha na hora.

## Instalar (uma vez)
1. Abra o projeto de Apps Script **Importar Relatórios** (o mesmo do importador; em script.google.com).
   O projeto não precisa estar preso à planilha: o painel abre a planilha pelo ID.
2. Crie os 3 arquivos (botão **+** ao lado de **Files**) e cole o conteúdo do GitHub:
   - **Script** chamado `Painel` → conteúdo de `apps-script/painel/Painel.gs`
   - **HTML** chamado `PainelTela` → conteúdo de `apps-script/painel/PainelTela.html`
   - **HTML** chamado `Regras` → conteúdo de `apps-script/painel/Regras.html`
   (Os nomes têm que ser exatamente esses; o Google acrescenta `.gs`/`.html` sozinho. O Apps Script não aceita dois
   arquivos com o mesmo nome, mesmo de tipos diferentes — por isso a tela não se chama `Painel`.)
3. Salve. Escolha a função **painelCriarAbaRegras** e clique em **Run** (uma vez só: cria a aba **Regras** na planilha;
   se ela já existir, não mexe). Depois escolha **painelTestar** e clique em **Run**. Aceite as permissões.
   Em **Execution log** deve aparecer algo como "05/11/2026: 46 faltantes, 0 sem sorting no dia, 4.2 s" e
   "Aba Regras: 0 regras".
4. **Deploy** (Implantar) › **New deployment** (Nova implantação) › engrenagem › **Web app**.
   - Description: `Painel de faltantes`
   - **Execute as: Me** (Eu)
   - **Who has access: Anyone within DHL Group** (Qualquer pessoa na DHL). Se essa opção não aparecer, me avise
     antes de escolher outra — "Anyone" deixaria o painel aberto para qualquer pessoa.
   - **Deploy** › copie o link **Web app URL** (termina em `/exec`). Esse é o endereço do painel.
5. Mande o link para quem vai usar na reunião (precisam estar logados com conta DHL).

## Quando o código mudar
Colar o código novo **não** muda o painel publicado sozinho. Depois de colar e salvar:
**Deploy › Manage deployments** (Gerenciar implantações) › lápis (Editar) › **Version: New version** › **Deploy**.
O link continua o mesmo.

## Problemas comuns
| O que aparece | O que fazer |
|---|---|
| "Não foi possível atualizar: Aba … não existe" | O nome da aba mudou na planilha. Me avise o nome novo. |
| Painel lento na primeira vez do dia | Normal: lê ~1 milhão de células. Depois fica guardado por 5 min. |
| "Você precisa de permissão" ao abrir o link | A pessoa não está logada com conta DHL, ou o acesso não está como "Anyone within DHL Group". |
| Classificação não salva | A conta que publicou (Execute as: Me) precisa ser editora da planilha. |
