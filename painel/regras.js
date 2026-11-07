/**
 * REGRAS DE CLASSIFICAÇÃO — Painel de Faltantes SSP53
 *
 * Fonte da verdade em português: ../regras/REGRAS.md (seção "Regras vigentes").
 * Este arquivo só traduz aquelas regras para o computador. O resto do painel não precisa mudar.
 *
 * classificar(pacote) recebe um pacote e devolve { resultado, regra, detalhe }.
 * Cada pacote tem:
 *   pacote.id                 Shipment ID
 *   pacote.dia                dia analisado, "dd/mm/aaaa"
 *   pacote.aduana             linha da aba Aduana que marcou o faltante (campos pelo nome da coluna)
 *   pacote.temConteinerizacao true se houve bipe "containerize" no Histórico no dia analisado
 *   pacote.inicio / .fim      começo e fim da janela (Date) — conteinerização até 36 h depois
 *   pacote.eventos            linha do tempo, em ordem de horário. Cada evento:
 *        { quando: Date, fonte: 'historico'|'carrinho'|'aduana'|'ps'|'inventario'|'torre'|'direcionamento',
 *          texto: 'resumo legível', dados: { 'Nome da coluna': 'valor', ... } }
 *
 * Funções de ajuda (para as regras novas): depois(pacote, evento, fonte?) devolve o próximo evento
 * depois de outro; eventosDe(pacote, fonte) devolve todos os eventos de uma fonte.
 *
 * Enquanto as regras novas não chegam, todo pacote sai como "Regra em aberto".
 */
(function () {
  const eventosDe = (p, fonte) => p.eventos.filter((e) => e.fonte === fonte);
  const depois = (p, ev, fonte) => p.eventos.find((e) => e.quando > ev.quando && (!fonte || e.fonte === fonte)) || null;

  const REGRAS = [
    // Exemplo de como uma regra vai ficar (desligado):
    // {
    //   codigo: 'R1',
    //   nome: 'Produto avariado não reparado',
    //   resultado: 'PRODUTO AVARIADO',
    //   testa: (p) => eventosDe(p, 'ps').some((e) => e.dados['Problema'] === 'Pacote avariado' && e.dados['Resolução'] === 'Não reparado'),
    // },
  ];

  window.REGRAS = {
    versao: 'provisória (aguardando regras novas)',
    lista: REGRAS,
    ajuda: { eventosDe, depois },
    classificar(p) {
      for (const r of REGRAS) {
        try {
          if (r.testa(p)) return { resultado: r.resultado, regra: r.codigo + ' · ' + r.nome, detalhe: r.detalhe ? r.detalhe(p) : '' };
        } catch (e) {
          console.error('Regra ' + r.codigo + ' falhou no pacote ' + p.id, e);
        }
      }
      return { resultado: 'Regra em aberto', regra: '', detalhe: REGRAS.length ? 'Nenhuma regra se aplicou.' : 'As regras novas ainda não foram cadastradas.' };
    },
  };
})();
