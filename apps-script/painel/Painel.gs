/**
 * PAINEL DE FALTANTES — parte do servidor (Web App do Apps Script)
 *
 * Fica no MESMO projeto de Apps Script da planilha "Conteneirização de Pacotes - Base SSP53"
 * (Extensões > Apps Script), junto com o importar-relatorios. Arquivos do painel:
 *   Painel.gs    (este)  – lê a planilha e monta os pacotes
 *   PainelTela.html      – a tela (HTML; não pode ter o mesmo nome do Painel.gs)
 *   Regras.html          – as regras de classificação (rodam na tela)
 * Publicação e atualização: ver docs/painel.md
 *
 * Tudo aqui dentro fica no objeto PainelFaltantes para não brigar com nomes de outros scripts do projeto.
 */
const PainelFaltantes = (() => {
  const CFG = {
    JANELA_HORAS: 36,  // linha do tempo: 1º bipe do pacote no Histórico (sorting) no dia + 36 h
    DIAS_LEITURA: 3,   // lê o dia analisado e os 2 seguintes
    CACHE_SEG: 21600,  // resultado guardado por 6 h; o gatilho de 5 min (painelPreparar) renova os dias recentes
    DIAS_PREPARAR: 4,  // o gatilho deixa prontos os dias com faltantes dos últimos 4 dias
    PREPARAR_MIN: 5,   // de quantos em quantos minutos o gatilho prepara os dados
    // A tela e as regras vêm do GitHub (mudou lá, o painel muda sozinho). Se o GitHub falhar, usa as cópias do projeto.
    GITHUB_RAW: 'https://raw.githubusercontent.com/rafaelmoreirasb/painel-faltantes/main/apps-script/painel/',
    GITHUB_CACHE_SEG: 300,
    ABA_MANUAL: 'Classificação manual',
    ABA_REGRAS: 'Regras', // ordem, liga/desliga e texto das regras (o Rafael edita direto na planilha)
    PLANILHA_ID: '1nDqe83XDoY-A3u6rNxaMP2RT74mZNjrYSDUY2c9dKhk', // Conteneirização de Pacotes - Base SSP53
  };

  /* Cada aba que entra na linha do tempo. "data" é a coluna usada para achar as linhas dos dias. */
  const FONTES = {
    historico: { aba: 'Histórico', id: 'IdPacote', data: 'Data', hora: 'Horas',
      colunas: ['Data', 'Horas', 'IdPacote', 'SubStatus', 'UserID', 'Processo', 'Ext', 'Origem'],
      texto: (g) => juntar(g('Processo'), g('SubStatus'), g('Ext') || g('UserID'), g('Origem') && 'origem ' + g('Origem')) },
    carrinho: { aba: 'Auditoria de Carrinho', id: 'Shipment ID', data: 'Data', hora: 'Hora',
      colunas: ['Shipment ID', 'Data', 'Hora', 'Gaiola', 'Estado', 'Rep auditoria', 'Tipo'],
      texto: (g) => juntar(g('Gaiola') && 'gaiola ' + g('Gaiola'), g('Estado'), g('Rep auditoria')) },
    aduana: { aba: 'Aduana', id: 'Shipment ID', data: 'Data auditoria', hora: 'Hora',
      colunas: ['Shipment ID', 'Placa', 'Data auditoria', 'Hora', 'ID da rota', 'Estado', 'Rep auditoria', 'Tipo do pacote'],
      texto: (g) => juntar(g('ID da rota'), g('Estado'), g('Rep auditoria'), g('Placa') && 'placa ' + g('Placa')) },
    ps: { aba: 'Problem Solving', id: 'ID do pacote', data: 'Data', hora: 'Hora',
      colunas: ['ID do pacote', 'Problema', 'Estado', 'Problem Solver', 'Hora', 'Data', 'Resolução', 'Status de resolução',
        'Origem de dano', 'Motivo', 'Tipo de dano', 'Tipo de caso', 'Rota sugerida', 'Motivo da exclusão', 'ID do caso'],
      texto: (g) => juntar(g('Problema'), g('Estado'), g('Resolução'), g('Status de resolução'), g('Motivo'),
        g('Rota sugerida') && 'rota sugerida ' + g('Rota sugerida'), g('Problem Solver')) },
    inventario: { aba: 'Inventário', id: 'Shipment ID', data: 'Data Reporte', hora: 'Horario',
      colunas: ['Shipment ID', 'Situação', 'Ârea', 'Operador', 'Comentario', 'Verificado', 'Pendente', 'Deslocado', 'Data Reporte', 'Horario'],
      texto: (g) => juntar(g('Situação'), g('Ârea'), g('Operador'), g('Comentario')) },
    torre: { aba: 'Torre Aduana', id: 'Shipment ID', data: 'Concluido em', hora: null,
      colunas: ['Shipment ID', 'Estado aduana', 'Rota', 'Gaiola (rota otim,)', 'Doca', 'Estado carrinho', 'Hora aduana', 'Auditor aduana',
        'Classificacao', 'Situacao', 'Status tratativa', 'Tratativa - responsavel/obs', 'Concluido em'],
      texto: (g) => juntar(g('Estado aduana'), g('Gaiola (rota otim,)'), g('Classificacao'), g('Status tratativa'), g('Tratativa - responsavel/obs')) },
    direcionamento: { aba: 'Direcionamento Manual', id: 'ID DO PRODUTO', data: null, hora: null, quando: 'Carimbo de data/hora',
      colunas: ['Carimbo de data/hora', 'ID DO PRODUTO', 'STATUS', 'REDIRECIONAMENTO', 'ROTA', 'CICLO'],
      texto: (g) => juntar(g('STATUS'), g('REDIRECIONAMENTO') && 'redirecionamento ' + g('REDIRECIONAMENTO'), g('ROTA')) },
  };

  /* ---------- ajudantes ---------- */
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const juntar = (...p) => p.filter((x) => x && String(x).trim() && String(x).trim() !== '-').join(' · ');
  const pad = (n) => String(n).padStart(2, '0');
  const dmy = (d) => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  const somaDias = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };

  /** "05/11/2026" (+ "7:33:31") → Date. Aceita "05/11/2026 7:10" e "5/11/26". */
  function lerDataHora(data, hora) {
    const m = String(data || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    let h = m[4], mi = m[5], s = m[6];
    const t = String(hora || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (t) { h = t[1]; mi = t[2]; s = t[3]; }
    const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return new Date(ano, Number(m[2]) - 1, Number(m[1]), Number(h || 0), Number(mi || 0), Number(s || 0));
  }
  /** Só a parte "dd/mm/aaaa" de um texto de data, já com zeros. */
  function diaDe(s) {
    const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return '';
    return pad(m[1]) + '/' + pad(m[2]) + '/' + (m[3].length === 2 ? '20' + m[3] : m[3]);
  }

  /** Abre a planilha pelo ID (o projeto pode ou não estar preso à planilha). Guarda para não abrir duas vezes. */
  let _ss = null;
  function planilha() {
    if (_ss) return _ss;
    const ativa = SpreadsheetApp.getActiveSpreadsheet();
    _ss = ativa && ativa.getId() === CFG.PLANILHA_ID ? ativa : SpreadsheetApp.openById(CFG.PLANILHA_ID);
    return _ss;
  }

  /** Lê uma aba devolvendo só as colunas pedidas (pelo nome do cabeçalho) e, se der, só as linhas dos dias pedidos. */
  function lerAba(fonte, dias) {
    const f = FONTES[fonte];
    const aba = planilha().getSheetByName(f.aba);
    if (!aba) return { linhas: [], aviso: 'Aba "' + f.aba + '" não existe.' };
    const ultima = aba.getLastRow();
    if (ultima < 2) return { linhas: [] };
    const nCols = aba.getLastColumn();
    const cab = aba.getRange(1, 1, 1, nCols).getDisplayValues()[0].map((c) => String(c).trim());
    const idx = {};
    cab.forEach((c, i) => { const k = norm(c); if (c && !(k in idx)) idx[k] = i; });
    if (!(norm(f.id) in idx)) return { linhas: [], aviso: 'Aba "' + f.aba + '": não achei a coluna "' + f.id + '".' };

    // Acha o trecho de linhas dos dias (lendo só a coluna de data) para não ler a aba inteira
    let ini = 2, fim = ultima;
    if (f.data && dias && norm(f.data) in idx) {
      const alvo = new Set(dias.map(dmy));
      const col = aba.getRange(2, idx[norm(f.data)] + 1, ultima - 1, 1).getDisplayValues();
      let a = -1, b = -1;
      for (let i = 0; i < col.length; i++) if (alvo.has(diaDe(col[i][0]))) { if (a < 0) a = i; b = i; }
      if (a < 0) return { linhas: [] };
      ini = a + 2; fim = b + 2;
    }
    const usar = f.colunas.filter((c) => norm(c) in idx);
    const menor = Math.min(...usar.map((c) => idx[norm(c)])), maior = Math.max(...usar.map((c) => idx[norm(c)]));
    const valores = aba.getRange(ini, menor + 1, fim - ini + 1, maior - menor + 1).getDisplayValues();
    const linhas = valores.map((r) => { const o = {}; usar.forEach((c) => { o[c] = String(r[idx[norm(c)] - menor] == null ? '' : r[idx[norm(c)] - menor]).trim(); }); return o; });
    return { linhas };
  }

  /* ---------- cache em pedaços (o Google limita 100 KB por item) ---------- */
  function cacheLer(chave) {
    try {
      const c = CacheService.getScriptCache();
      const n = Number(c.get(chave + ':n'));
      if (!n) return null;
      const partes = c.getAll(Array.from({ length: n }, (_, i) => chave + ':' + i));
      let s = '';
      for (let i = 0; i < n; i++) { const p = partes[chave + ':' + i]; if (p == null) return null; s += p; }
      return JSON.parse(s);
    } catch (e) { return null; }
  }
  function cacheGravar(chave, obj) {
    try {
      const s = JSON.stringify(obj);
      const tam = 90000, itens = {};
      const n = Math.ceil(s.length / tam);
      if (n > 50) return; // grande demais: não guarda
      for (let i = 0; i < n; i++) itens[chave + ':' + i] = s.slice(i * tam, (i + 1) * tam);
      itens[chave + ':n'] = String(n);
      CacheService.getScriptCache().putAll(itens, CFG.CACHE_SEG);
    } catch (e) { /* sem cache, tudo bem */ }
  }

  /* ---------- funções chamadas pela tela ---------- */
  function listarDias(forcar) {
    if (!forcar) { const cache = cacheLer('dias'); if (cache) return cache; }
    const { linhas } = lerAba('aduana', null);
    const cont = {};
    for (const o of linhas) if (norm(o['Estado']) === 'faltante') { const d = diaDe(o['Data auditoria']); if (d) cont[d] = (cont[d] || 0) + 1; }
    const dias = Object.keys(cont).map((d) => ({ dia: d, n: cont[d], t: lerDataHora(d).getTime() })).sort((a, b) => b.t - a.t);
    cacheGravar('dias', dias);
    return dias;
  }

  function dadosDoDia(dia, forcar) {
    const D = lerDataHora(dia);
    if (!D) throw new Error('Dia inválido: ' + dia);
    const chave = 'dia:' + dia;
    if (!forcar) { const c = cacheLer(chave); if (c) return c; }
    const inicioProc = Date.now();
    const dias = Array.from({ length: CFG.DIAS_LEITURA }, (_, i) => somaDias(D, i));

    // 1) faltantes do dia na Aduana
    const ad = lerAba('aduana', dias);
    const falt = new Map();
    for (const o of ad.linhas) {
      if (norm(o['Estado']) !== 'faltante' || diaDe(o['Data auditoria']) !== dia) continue;
      const id = String(o['Shipment ID']).trim();
      if (!id) continue;
      if (!falt.has(id)) falt.set(id, { aduana: o, vezes: 0 });
      falt.get(id).vezes++;
    }

    // 2) registros desses pacotes em todas as abas
    const avisos = [];
    const eventos = new Map([...falt.keys()].map((id) => [id, []]));
    for (const fonte of Object.keys(FONTES)) {
      const f = FONTES[fonte];
      const r = fonte === 'aduana' ? ad : lerAba(fonte, f.data ? dias : null);
      if (r.aviso) avisos.push(r.aviso);
      for (const o of r.linhas) {
        const id = String(o[f.id] || '').trim();
        if (!eventos.has(id)) continue;
        const g = (k) => String(o[k] == null ? '' : o[k]).trim();
        const quando = f.quando ? lerDataHora(g(f.quando)) : lerDataHora(g(f.data), f.hora ? g(f.hora) : '');
        if (!quando) continue;
        const texto = f.texto(g);
        eventos.get(id).push({ t: quando.getTime(), fonte, texto, dados: o, chave: fonte + '|' + quando.getTime() + '|' + texto });
      }
    }

    // 3) janela: tudo começa no sorting — 1º bipe do pacote no dia na aba Histórico (qualquer processo) + 36 h.
    //    Depois das 36 h o pacote não recebe mais bipes no painel.
    const pacotes = [];
    for (const [id, x] of falt) {
      const vistos = {};
      const todos = eventos.get(id).sort((a, b) => a.t - b.t).filter((e) => (vistos[e.chave] ? false : (vistos[e.chave] = true)));
      const sort = todos.find((e) => e.fonte === 'historico' && dmy(new Date(e.t)) === dia);
      const inicio = sort ? sort.t : D.getTime();
      const fim = inicio + CFG.JANELA_HORAS * 3600 * 1000;
      pacotes.push({
        id, dia, aduana: x.aduana, vezesFaltante: x.vezes, temSorting: !!sort, ancora: sort ? sort.chave : null,
        inicio, fim, janelaFechada: Date.now() > fim, eventos: todos.filter((e) => e.t >= inicio && e.t <= fim),
        rota: x.aduana['ID da rota'] || '', horaAduana: x.aduana['Hora'] || '', rep: x.aduana['Rep auditoria'] || '',
      });
    }
    const out = { dia, geradoEm: Date.now(), segundos: Math.round((Date.now() - inicioProc) / 100) / 10, pacotes, avisos };
    cacheGravar(chave, out);
    return out;
  }

  /* ---------- aba Regras ---------- */
  const CAB_REGRAS = ['Ordem', 'Código', 'Ligada', 'Pergunta (se SIM, o pacote para aqui)', 'Resultado', 'Observação', 'Abas usadas'];

  /** Lê a aba Regras. Devolve null se a aba não existe (aí o painel usa a ordem padrão do código). */
  function lerRegras() {
    const aba = planilha().getSheetByName(CFG.ABA_REGRAS);
    if (!aba) return null;
    if (aba.getLastRow() < 2) return [];
    const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();
    const idx = {};
    v[0].forEach((c, i) => { const k = norm(c).split(' (')[0]; if (k && !(k in idx)) idx[k] = i; });
    const g = (r, nome) => (norm(nome) in idx ? String(r[idx[norm(nome)]]).trim() : '');
    return v.slice(1).map((r, i) => ({
      linha: i + 2, ordem: Number(String(g(r, 'Ordem')).replace(',', '.')) || 0, codigo: g(r, 'Código').toUpperCase(),
      ligada: !/^(n|nao|não|0|false|desligada)$/i.test(g(r, 'Ligada')), pergunta: g(r, 'Pergunta'), resultado: g(r, 'Resultado'),
      observacao: g(r, 'Observação'), abas: g(r, 'Abas usadas'),
    })).filter((r) => r.codigo).sort((a, b) => a.ordem - b.ordem || a.linha - b.linha);
  }

  /* Regras iniciais do Rafael (08/11/2026). Mesma lista de PADRAO em Regras.html. Colunas = CAB_REGRAS. */
  const REGRAS_INICIAIS = [
    ['1', 'R01', 'Sim', 'Bipado no Histórico e encontrado na Torre A MAIS em outra rota?', 'Erro de Conteinerização', '', 'Histórico, Torre Aduana, Aduana'],
    ['2', 'R02', 'Sim', 'Bipado no Histórico e bipado no Direcionamento Manual (qualquer resultado na auditoria de carrinho, torre ou aduana)?', '(coluna STATUS do Direcionamento Manual)', 'O resultado mostrado é o STATUS do Direcionamento', 'Histórico, Direcionamento Manual'],
    ['3', 'R03', 'Sim', 'Bipado no Histórico, faltante na Aduana e na Torre, e logo depois Verificado no Inventário?', 'Erro de Conteinerização', '', 'Histórico, Aduana, Torre Aduana, Inventário'],
    ['4', 'R04', 'Sim', 'Bipado no Histórico, faltante na Aduana e na Torre, e depois Problem Solving: pacote avariado / não reparado?', 'Pacote Avariado', 'Com ou sem auditoria de carrinho', 'Histórico, Aduana, Torre Aduana, Problem Solving'],
  ];

  /** Cria a aba Regras com o cabeçalho e as regras iniciais. Se a aba já tiver regras, não mexe. */
  function criarAbaRegras() {
    const ss = planilha();
    let aba = ss.getSheetByName(CFG.ABA_REGRAS);
    if (aba && aba.getLastRow() >= 2) return 'A aba "' + CFG.ABA_REGRAS + '" já tem regras — nada foi alterado.';
    if (!aba) aba = ss.insertSheet(CFG.ABA_REGRAS);
    aba.getRange(1, 1, 200, CAB_REGRAS.length).setNumberFormat('@');
    aba.getRange(1, 1, 1, CAB_REGRAS.length).setValues([CAB_REGRAS]).setFontWeight('bold');
    aba.getRange(2, 1, REGRAS_INICIAIS.length, CAB_REGRAS.length).setValues(REGRAS_INICIAIS);
    aba.setFrozenRows(1);
    return 'Aba "' + CFG.ABA_REGRAS + '" pronta com ' + REGRAS_INICIAIS.length + ' regras.';
  }

  function lerManual() {
    const aba = planilha().getSheetByName(CFG.ABA_MANUAL);
    if (!aba || aba.getLastRow() < 2) return {};
    const v = aba.getRange(2, 1, aba.getLastRow() - 1, 5).getDisplayValues();
    const m = {};
    for (const r of v) {
      const id = String(r[1]).trim(), cl = String(r[2]).trim();
      if (!id || !cl) continue;
      m[(diaDe(r[0]) || '*') + '|' + id] = { classificacao: cl, raciocinio: String(r[3]).trim(), quem: String(r[4]).trim() };
    }
    return m;
  }

  function salvarClassificacao(dia, id, classificacao, raciocinio) {
    if (!diaDe(dia) || !/^\d+$/.test(String(id))) throw new Error('Dia ou shipment inválido.');
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = planilha();
      let aba = ss.getSheetByName(CFG.ABA_MANUAL);
      if (!aba) { aba = ss.insertSheet(CFG.ABA_MANUAL); aba.appendRow(['Data', 'Shipment ID', 'Classificação', 'Raciocínio', 'Quem classificou']); aba.setFrozenRows(1); }
      let quem = '';
      try { quem = Session.getActiveUser().getEmail(); } catch (e) {}
      const linha = [diaDe(dia), String(id), String(classificacao || '').trim(), String(raciocinio || '').trim(), quem || '(painel)'];
      const n = aba.getLastRow();
      let alvo = 0;
      if (n > 1) {
        const v = aba.getRange(2, 1, n - 1, 2).getDisplayValues();
        for (let i = v.length - 1; i >= 0; i--) if (diaDe(v[i][0]) === linha[0] && String(v[i][1]).trim() === linha[1]) { alvo = i + 2; break; }
      }
      if (!alvo) alvo = n + 1;
      const r = aba.getRange(alvo, 1, 1, 5);
      r.setNumberFormat('@');
      r.setValues([linha]);
      return { ok: true, quem: linha[4] };
    } finally {
      lock.releaseLock();
    }
  }

  /** Gatilho de 5 min: deixa prontos (no cache) a lista de dias e os dias recentes. Assim o painel abre na hora. */
  function preparar() {
    const inicio = Date.now();
    const dias = listarDias(true);
    const limite = Date.now() - CFG.DIAS_PREPARAR * 86400000;
    const feitos = [];
    for (const d of dias) {
      if (d.t < limite) continue;
      if (Date.now() - inicio > 4.5 * 60 * 1000) break; // não passa do limite de 6 min do Google
      dadosDoDia(d.dia, true);
      feitos.push(d.dia);
    }
    return { dias: feitos, segundos: Math.round((Date.now() - inicio) / 100) / 10 };
  }

  /** Texto de um arquivo da tela: do GitHub (guardado 5 min) ou, se falhar, a cópia do projeto. */
  function arquivoTela(nome) {
    const chave = 'gh:' + nome;
    try {
      const c = CacheService.getScriptCache().get(chave);
      if (c) return c;
    } catch (e) {}
    try {
      const r = UrlFetchApp.fetch(CFG.GITHUB_RAW + nome + '.html', { muteHttpExceptions: true });
      const texto = r.getResponseCode() === 200 ? r.getContentText('UTF-8') : '';
      if (texto && texto.length > 50) {
        try { if (texto.length < 95000) CacheService.getScriptCache().put(chave, texto, CFG.GITHUB_CACHE_SEG); } catch (e) {}
        return texto;
      }
    } catch (e) { console.warn('GitHub indisponível (' + nome + '): ' + e.message); }
    return HtmlService.createHtmlOutputFromFile(nome).getContent();
  }

  return { CFG, FONTES, listarDias, dadosDoDia, lerManual, lerRegras, criarAbaRegras, salvarClassificacao, lerDataHora, diaDe, planilha, preparar, arquivoTela };
})();

/* ===== Funções que o Google chama (precisam ficar soltas, com nomes únicos no projeto) ===== */
function doGet() {
  return HtmlService.createTemplate(PainelFaltantes.arquivoTela('PainelTela')).evaluate()
    .setTitle('Faltantes na Aduana · SSP53')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function painelIncluir(nome) { return PainelFaltantes.arquivoTela(nome); }
/** Rode UMA vez: cria o gatilho que prepara os dados a cada 5 min (só mexe no próprio gatilho). */
function painelCriarGatilho() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'painelPreparar').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('painelPreparar').timeBased().everyMinutes(PainelFaltantes.CFG.PREPARAR_MIN).create();
  painelPreparar();
  console.log('Gatilho criado: os dados do painel são preparados a cada ' + PainelFaltantes.CFG.PREPARAR_MIN + ' min.');
}
function painelPreparar() {
  const r = PainelFaltantes.preparar();
  console.log('Preparados: ' + (r.dias.join(', ') || 'nenhum dia recente') + ' em ' + r.segundos + ' s');
}
function painelListarDias() { return PainelFaltantes.listarDias(); }
function painelDadosDoDia(dia, forcar) {
  const d = PainelFaltantes.dadosDoDia(dia, !!forcar);
  return JSON.stringify({ dados: d, manual: PainelFaltantes.lerManual(), regras: PainelFaltantes.lerRegras(), url: PainelFaltantes.planilha().getUrl() });
}
function painelSalvarClassificacao(dia, id, classificacao, raciocinio) {
  return PainelFaltantes.salvarClassificacao(dia, id, classificacao, raciocinio);
}
/** Para testar no editor: escolha esta função e clique em Run. Mostra quantos faltantes e quanto tempo levou. */
function painelTestar() {
  const dias = PainelFaltantes.listarDias();
  console.log('Dias com faltantes: ' + dias.map((d) => d.dia + ' (' + d.n + ')').join(', '));
  if (!dias.length) return;
  const d = PainelFaltantes.dadosDoDia(dias[0].dia, true);
  const sem = d.pacotes.filter((p) => !p.temSorting).length;
  console.log(d.dia + ': ' + d.pacotes.length + ' faltantes, ' + sem + ' sem sorting no dia, ' + d.segundos + ' s. Avisos: ' + (d.avisos.join(' | ') || 'nenhum'));
  const r = PainelFaltantes.lerRegras();
  console.log(r === null ? 'Aba Regras não existe (rode painelCriarAbaRegras).' : 'Aba Regras: ' + r.length + ' regras (' + r.filter((x) => x.ligada).length + ' ligadas).');
}
/** Rode uma vez no editor: cria a aba "Regras" na planilha (não apaga nada se ela já existir). */
function painelCriarAbaRegras() { console.log(PainelFaltantes.criarAbaRegras()); }
