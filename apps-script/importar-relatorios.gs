/**
 * SCRIPT: IMPORTAR RELATÓRIOS (Aduana, Auditoria de Carrinho, Problem Solving)
 *
 * O que faz:
 *  - A cada 15 minutos olha a pasta do Drive "Faltantes – Entrada".
 *  - Cada arquivo .csv ou .xlsx que encontrar é reconhecido pelos cabeçalhos (o nome não importa),
 *    tratado e juntado na aba certa da planilha Conteneirização de Pacotes - Base SSP53, SEM duplicar.
 *  - Problem Solving: se um caso já existe (mesmo nº do caso), a linha é ATUALIZADA.
 *  - Depois o arquivo vai para "Faltantes – Entrada/Processados/AAAA-MM-DD".
 *  - Toda madrugada, as linhas com mais de 15 dias saem da planilha principal e vão para
 *    a planilha "Arquivo Faltantes AAAA-MM" (pasta "Faltantes – Arquivo"). Nada é apagado de vez.
 *  - Cada execução fica registrada na aba "Log importação". Se der erro, você recebe e-mail.
 *
 * Primeira execução: as abas Aduana, Auditoria de Carrinho e Solução de Problemas são convertidas
 * para o formato novo (com as colunas "Importado em" e "Chave"). Antes disso é feita uma cópia
 * de segurança numa planilha separada, na pasta "Faltantes – Arquivo".
 *
 * Instalação: ver docs/importador.md
 */

// ===== CONFIGURAÇÃO =====
const CONFIG = {
  PLANILHA_ID: '1nDqe83XDoY-A3u6rNxaMP2RT74mZNjrYSDUY2c9dKhk', // Conteneirização de Pacotes - Base SSP53
  PASTA_ENTRADA: 'Faltantes – Entrada',
  PASTA_ARQUIVO: 'Faltantes – Arquivo',
  DIAS_NA_PRINCIPAL: 15,   // linhas mais antigas que isso vão para o arquivo mensal
  INTERVALO_MIN: 15,       // de quantos em quantos minutos procura arquivos novos
  HORA_ARQUIVAMENTO: 3,    // hora do dia em que roda o arquivamento (3 = 3h da manhã)
  ABA_LOG: 'Log importação',
  TEMPO_MAX_MS: 4.5 * 60 * 1000, // para antes do limite de 6 min do Google; o resto vai na próxima
};

const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

// ===== OS 3 RELATÓRIOS =====
const RELATORIOS = [
  {
    id: 'aduana',
    nome: 'Aduana',
    aba: 'Aduana',
    detectar: (t) => t.has('shipment id') && t.has('placa') && t.has('id da rota'),
    cabecalho: ['Shipment ID', 'Placa', 'Data auditoria', 'Hora', 'ID da rota', 'Estado', 'Rep auditoria', 'Tipo do pacote'],
    colData: 2,
    modo: 'linha',
    doArquivo: (g, hoje) => {
      const [data, hora] = separarDataHora(g('Data auditoria'));
      return [g('Shipment ID'), g('Placa'), data, hora, rota(g('ID da rota')), g('Estado'), g('Rep auditoria'), ''];
    },
    doFormatoAntigo: (r) => [r[0], r[1], normData(r[2]), r[3], rota(r[4]), r[5], r[6], r[7] || ''],
    chave: (o) => ['AD', o[0], o[2], hhmm(o[3]), o[4], o[5]].join('|'),
  },
  {
    id: 'carrinho',
    nome: 'Auditoria de Carrinho',
    aba: 'Auditoria de Carrinho',
    detectar: (t) => t.has('shipment id') && t.has('gaiola') && t.has('data auditoria') && !t.has('placa'),
    cabecalho: ['Shipment ID', 'Data', 'Hora', 'Gaiola', 'Estado', 'Rep auditoria', 'Tipo'],
    colData: 1,
    modo: 'linha',
    doArquivo: (g, hoje) => {
      const [data, hora] = separarDataHora(g('Data auditoria'));
      return [g('Shipment ID'), data, hora, g('Gaiola'), g('Estado'), g('Rep auditoria'), ''];
    },
    doFormatoAntigo: (r) => [r[0], normData(r[1]), r[2], r[3], r[4], r[5], r[6] || ''],
    chave: (o) => ['CA', o[0], o[1], hhmm(o[2]), o[3], o[4]].join('|'),
  },
  {
    id: 'ps',
    nome: 'Problem Solving',
    aba: 'Problem Solving',
    detectar: (t) => t.has('id do pacote') && t.has('problema') && t.has('data de criacao'),
    cabecalho: ['ID do pacote', 'Problema', 'Estado', 'Problem Solver', 'Hora', 'Data', 'Service Center', 'Resolução',
      'Status de resolução', 'Analisado por', 'Data de análise', 'Tempo de resolução em minutos', 'Origem de dano',
      'Motivo', 'Tipo de dano', 'Tipo de caso', 'Rota sugerida', 'Motivo da exclusão', 'Link detalhe do caso',
      'ID do caso', 'Data de fechamento'],
    colData: 5,
    modo: 'caso', // um caso que muda de estado ATUALIZA a linha existente
    doArquivo: (g, hoje) => {
      const [data, hora] = dataHoraPS(g('Data de criação'), hoje);
      const link = g('Link detalhe do caso');
      return [g('ID do pacote'), g('Problema'), g('Estado'), g('Problem Solver'), hora, data, g('Service Center'),
        g('Resolução'), g('Status de resolução'), g('Analisado por'), dataHoraPSTexto(g('Data de análise'), hoje),
        g('Tempo de resolução em minutos'), g('Origem de dano'), g('Motivo'), g('Tipo de dano'), g('Tipo de caso'),
        g('Rota sugerida'), g('Motivo da exclusão'), link, g('') || casoDoLink(link),
        dataHoraPSTexto(g('Data de fechamento'), hoje)];
    },
    doFormatoAntigo: (r) => {
      const o = r.slice(0, 19);
      while (o.length < 19) o.push('');
      o[5] = normData(o[5]);
      return [...o, casoDoLink(o[18]), ''];
    },
    chave: (o) => o[19] ? 'PS|' + o[19] : ['PS', o[0], o[1], o[5], o[4]].join('|'),
  },
];

// ===== ROTINA PRINCIPAL (gatilho a cada 15 min) =====
function importarRelatorios() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // evita duas execuções ao mesmo tempo
  const inicio = Date.now();
  const erros = [];
  let importou = false;
  try {
    const ss = abrirPlanilha();
    const entrada = pasta(CONFIG.PASTA_ENTRADA);
    const arquivos = [];
    const it = entrada.getFiles();
    while (it.hasNext()) arquivos.push(it.next());
    arquivos.sort((a, b) => a.getDateCreated() - b.getDateCreated()); // mais antigo primeiro
    if (!arquivos.length) { console.log('Nenhum arquivo novo'); return; }

    for (const arq of arquivos) {
      if (Date.now() - inicio > CONFIG.TEMPO_MAX_MS) { console.log('Tempo quase no limite: o resto vai na próxima execução'); break; }
      const nome = arq.getName();
      try {
        const tabela = lerArquivo(arq);
        if (!tabela) { registrar(ss, nome, '-', 0, 0, 0, 0, 'Ignorado: não é .csv nem .xlsx'); moverPara(arq, entrada, 'Não reconhecidos'); continue; }
        const rel = detectar(tabela[0]);
        if (!rel) {
          moverPara(arq, entrada, 'Não reconhecidos');
          throw new Error('Não reconheci o relatório. Cabeçalhos: ' + tabela[0].join(' | '));
        }
        const r = importarTabela(ss, rel, tabela, new Date());
        registrar(ss, nome, rel.nome, r.lidas, r.novas, r.atualizadas, r.iguais, 'OK');
        moverPara(arq, entrada, 'Processados/' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
        importou = true;
        console.log(nome + ' → ' + rel.aba + ': ' + r.novas + ' novas, ' + r.atualizadas + ' atualizadas, ' + r.iguais + ' já existiam');
      } catch (e) {
        erros.push(nome + ': ' + e.message);
        registrar(ss, nome, '-', 0, 0, 0, 0, 'ERRO: ' + e.message);
      }
    }
  } catch (e) {
    erros.push(e.message);
  } finally {
    lock.releaseLock();
    // dado novo: apaga a lista de dias guardada pelo painel (mesmo projeto = mesmo cache), para o dia novo aparecer já
    if (importou) { try { CacheService.getScriptCache().remove('dias:n'); } catch (e) {} }
    if (erros.length) avisarErro('Importação de relatórios', erros);
  }
}

/** Trata a tabela lida do arquivo e grava na aba do relatório. Devolve as contagens. */
function importarTabela(ss, rel, tabela, agora) {
  const aba = prepararAba(ss, rel);
  const g0 = leitor(tabela[0]);
  const hoje = agora;
  const quando = formatarAgora(agora);
  const linhas = [];
  for (const linha of tabela.slice(1)) {
    if (linha.every((c) => String(c).trim() === '')) continue;
    const o = rel.doArquivo(g0(linha), hoje).map((v) => String(v == null ? '' : v).trim());
    linhas.push([...o, quando, chaveCurta(rel.chave(o))]);
  }
  const r = gravar(aba, rel, linhas);
  r.lidas = linhas.length;
  return r;
}

// ===== GRAVAÇÃO SEM DUPLICAR =====
/**
 * Grava linhas completas (cabeçalho do relatório + Importado em + Chave) na aba.
 * modo 'linha': só acrescenta o que é novo.  modo 'caso': atualiza se a chave já existe e mudou.
 */
function gravar(aba, rel, linhas) {
  const nCols = rel.cabecalho.length + 2;
  const ultima = aba.getLastRow();
  const res = { novas: 0, atualizadas: 0, iguais: 0 };
  const novas = [];

  if (rel.modo === 'caso') {
    const atuais = ultima > 1 ? aba.getRange(2, 1, ultima - 1, nCols).getDisplayValues() : [];
    const pos = new Map();
    atuais.forEach((l, i) => pos.set(l[nCols - 1], i));
    let mudou = false;
    for (const l of linhas) {
      const k = l[nCols - 1];
      if (pos.has(k)) {
        const i = pos.get(k);
        const antes = atuais[i];
        if (rel.cabecalho.some((_, c) => String(antes[c]) !== String(l[c]) && !(l[c] === '' && antes[c] !== ''))) {
          // atualiza, mas não apaga informação que só existia na linha antiga
          atuais[i] = l.map((v, c) => (v === '' && c < rel.cabecalho.length ? antes[c] : v));
          res.atualizadas++; mudou = true;
        } else res.iguais++;
      } else {
        pos.set(k, atuais.length + novas.length);
        novas.push(l); res.novas++;
      }
    }
    if (mudou) escreverTexto(aba, 2, atuais);
  } else {
    const existentes = new Set(ultima > 1 ? aba.getRange(2, nCols, ultima - 1, 1).getDisplayValues().flat() : []);
    for (const l of linhas) {
      const k = l[nCols - 1];
      if (existentes.has(k)) { res.iguais++; continue; }
      existentes.add(k); novas.push(l); res.novas++;
    }
  }
  if (novas.length) escreverTexto(aba, aba.getLastRow() + 1, novas);
  return res;
}

/** Escreve como TEXTO (assim o Sheets não transforma IDs em número nem datas em outra coisa). */
function escreverTexto(aba, linhaInicial, valores) {
  if (!valores.length) return;
  const precisa = linhaInicial + valores.length - 1;
  if (precisa > aba.getMaxRows()) aba.insertRowsAfter(aba.getMaxRows(), precisa - aba.getMaxRows());
  const r = aba.getRange(linhaInicial, 1, valores.length, valores[0].length);
  r.setNumberFormat('@');
  r.setValues(valores);
}

// ===== PREPARAÇÃO DA ABA (e conversão do formato antigo na 1ª vez) =====
function prepararAba(ss, rel) {
  const cab = [...rel.cabecalho, 'Importado em', 'Chave'];
  let aba = ss.getSheetByName(rel.aba);
  if (!aba) {
    aba = ss.insertSheet(rel.aba);
    ajustarColunas(aba, cab.length);
    escreverTexto(aba, 1, [cab]);
    aba.setFrozenRows(1);
    return aba;
  }
  const atual = aba.getLastRow() ? aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0] : [];
  const pronto = atual.length >= cab.length && cab.every((c, i) => String(atual[i]).trim() === c);
  if (pronto) return aba;
  if (aba.getLastRow() <= 1) { // aba vazia: só coloca o cabeçalho
    aba.clear();
    ajustarColunas(aba, cab.length);
    escreverTexto(aba, 1, [cab]);
    aba.setFrozenRows(1);
    return aba;
  }
  return converterFormatoAntigo(ss, aba, rel, cab);
}

/** 1ª execução: faz backup, converte as linhas coladas à mão para o formato novo e troca a aba. */
function converterFormatoAntigo(ss, aba, rel, cab) {
  const nomeTemp = rel.aba + ' (convertendo)';
  const sobra = ss.getSheetByName(nomeTemp);
  if (sobra) ss.deleteSheet(sobra); // sobra de uma tentativa interrompida

  // 1) Cópia de segurança numa planilha separada
  const nomeBackup = 'Backup antes do importador – ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
  const backup = planilhaNaPasta(nomeBackup, pasta(CONFIG.PASTA_ARQUIVO));
  if (!backup.getSheetByName(rel.aba)) aba.copyTo(backup).setName(rel.aba);
  limparAbaPadrao(backup);

  // 2) Converte as linhas antigas
  const dados = aba.getDataRange().getDisplayValues();
  const quando = 'convertido ' + formatarAgora(new Date());
  const vistos = new Set();
  const linhas = [];
  for (const l of dados.slice(1)) {
    if (l.every((c) => String(c).trim() === '')) continue;
    const o = rel.doFormatoAntigo(l).map((v) => String(v == null ? '' : v).trim());
    const k = chaveCurta(rel.chave(o));
    if (vistos.has(k)) continue;
    vistos.add(k);
    linhas.push([...o, quando, k]);
  }

  // 3) Escreve numa aba nova e só depois troca (se algo falhar no meio, a aba antiga continua intacta)
  const temp = ss.insertSheet(nomeTemp, aba.getIndex());
  ajustarColunas(temp, cab.length);
  escreverTexto(temp, 1, [cab]);
  escreverTexto(temp, 2, linhas);
  temp.setFrozenRows(1);
  const sobram = temp.getMaxRows() - (linhas.length + 1);
  if (sobram > 10) temp.deleteRows(linhas.length + 2, sobram - 10);
  ss.deleteSheet(aba);
  temp.setName(rel.aba);
  console.log(rel.aba + ': ' + linhas.length + ' linhas convertidas para o formato novo (backup em "' + nomeBackup + '")');
  return temp;
}

function ajustarColunas(aba, n) {
  const max = aba.getMaxColumns();
  if (max > n) aba.deleteColumns(n + 1, max - n);
  else if (max < n) aba.insertColumnsAfter(max, n - max);
}

// ===== ARQUIVAMENTO (gatilho diário de madrugada) =====
function arquivarAntigos() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return;
  const erros = [];
  try {
    const ss = abrirPlanilha();
    const limite = new Date();
    limite.setHours(0, 0, 0, 0);
    limite.setDate(limite.getDate() - CONFIG.DIAS_NA_PRINCIPAL);
    for (const rel of RELATORIOS) {
      try {
        const aba = ss.getSheetByName(rel.aba);
        if (!aba || aba.getLastRow() < 2) continue;
        const cab = [...rel.cabecalho, 'Importado em', 'Chave'];
        const atual = aba.getRange(1, 1, 1, cab.length).getDisplayValues()[0];
        if (!cab.every((c, i) => atual[i] === c)) continue; // ainda não convertida
        const dados = aba.getRange(2, 1, aba.getLastRow() - 1, cab.length).getDisplayValues();
        const { ficam, porMes } = separarPorIdade(dados, rel.colData, limite);
        if (!porMes.size) continue;
        for (const [mes, linhas] of porMes) {
          const arq = planilhaNaPasta('Arquivo Faltantes ' + mes, pasta(CONFIG.PASTA_ARQUIVO));
          let abaArq = arq.getSheetByName(rel.aba);
          if (!abaArq) {
            abaArq = arq.insertSheet(rel.aba);
            ajustarColunas(abaArq, cab.length);
            escreverTexto(abaArq, 1, [cab]);
            abaArq.setFrozenRows(1);
            limparAbaPadrao(arq);
          }
          gravar(abaArq, rel, linhas); // sem duplicar: pode rodar de novo sem problema
        }
        // reescreve a principal só com as linhas recentes e libera as linhas vazias
        aba.getRange(2, 1, dados.length, cab.length).clearContent();
        escreverTexto(aba, 2, ficam);
        const sobram = aba.getMaxRows() - (ficam.length + 1);
        if (sobram > 100) aba.deleteRows(ficam.length + 2, sobram - 100);
        const n = dados.length - ficam.length;
        registrar(ss, '(arquivamento)', rel.nome, dados.length, 0, 0, 0, n + ' linhas com mais de ' + CONFIG.DIAS_NA_PRINCIPAL + ' dias foram para o arquivo mensal');
      } catch (e) {
        erros.push(rel.aba + ': ' + e.message);
      }
    }
  } finally {
    lock.releaseLock();
    if (erros.length) avisarErro('Arquivamento mensal', erros);
  }
}

/** Separa as linhas que ficam na principal das que vão para o arquivo (agrupadas por AAAA-MM). */
function separarPorIdade(dados, colData, limite) {
  const ficam = [];
  const porMes = new Map();
  for (const l of dados) {
    const d = lerData(l[colData]);
    if (!d || d >= limite) { ficam.push(l); continue; }
    const mes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(l);
  }
  return { ficam, porMes };
}

// ===== LEITURA DOS ARQUIVOS =====
function lerArquivo(arq) {
  const nome = arq.getName().toLowerCase();
  const tipo = arq.getMimeType();
  if (nome.endsWith('.csv') || tipo === 'text/csv') {
    let texto = arq.getBlob().getDataAsString('UTF-8').replace(/^﻿/, '');
    const primeira = texto.split(/\r?\n/, 1)[0];
    const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : ',';
    return Utilities.parseCsv(texto, sep);
  }
  if (nome.endsWith('.xlsx') || nome.endsWith('.xls') || tipo === MimeType.MICROSOFT_EXCEL) {
    if (typeof Drive === 'undefined') throw new Error('Para ler .xlsx, ative o serviço "Drive API" no Apps Script (Services > Drive API). Ou exporte em .csv.');
    const temp = Drive.Files.create({ name: 'temp-importador-' + arq.getName(), mimeType: MimeType.GOOGLE_SHEETS }, arq.getBlob());
    try {
      return SpreadsheetApp.openById(temp.id).getSheets()[0].getDataRange().getDisplayValues();
    } finally {
      DriveApp.getFileById(temp.id).setTrashed(true);
    }
  }
  if (tipo === MimeType.GOOGLE_SHEETS) {
    return SpreadsheetApp.openById(arq.getId()).getSheets()[0].getDataRange().getDisplayValues();
  }
  return null;
}

function detectar(cabecalho) {
  const t = new Set(cabecalho.map(norm));
  return RELATORIOS.find((r) => r.detectar(t)) || null;
}

/** Devolve uma função que, dada uma linha, devolve g(nomeDaColuna). */
function leitor(cabecalho) {
  const idx = new Map();
  cabecalho.forEach((c, i) => { const k = norm(c); if (!idx.has(k)) idx.set(k, i); });
  return (linha) => (nomeCol) => {
    const i = idx.get(norm(nomeCol));
    if (i === undefined) {
      if (nomeCol === '') return '';
      throw new Error('Coluna "' + nomeCol + '" não encontrada. Cabeçalhos: ' + cabecalho.join(' | '));
    }
    return linha[i] == null ? '' : String(linha[i]).trim();
  };
}

// ===== DATAS E TEXTOS =====
function norm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function pad(n) { return String(n).padStart(2, '0'); }

/** "06/11/2026 07:33:31" → ["06/11/2026", "07:33:31"] */
function separarDataHora(s) {
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (!m) return [normData(s), ''];
  return [normData(m[1] + '/' + m[2] + '/' + m[3]), m[4].length === 4 ? '0' + m[4] : m[4]];
}

/** "05/11/26" ou "5/11/2026" → "05/11/2026" */
function normData(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return String(s || '').trim();
  const ano = m[3].length === 2 ? '20' + m[3] : m[3];
  return pad(m[1]) + '/' + pad(m[2]) + '/' + ano;
}

/** "07:33:31" → "07:33" (usado na chave, porque as abas antigas guardavam hora sem segundos) */
function hhmm(s) {
  const m = String(s || '').match(/(\d{1,2}):(\d{2})/);
  return m ? pad(m[1]) + ':' + m[2] : '';
}

/** "A1_AM1 | 468263706" → "A1_AM1" */
function rota(s) { return String(s || '').split('|')[0].trim(); }

/** Problem Solving: "07:50pm | 06/nov" → ["06/11/2026", "19:50"]. O ano não vem no arquivo: é deduzido. */
function dataHoraPS(s, hoje) {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)\s*\|\s*(\d{1,2})\/([a-zç]{3})/i);
  if (!m) return [normData(s), ''];
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') h += 12;
  const mes = MESES[m[5].toLowerCase()];
  if (!mes) return [String(s).trim(), ''];
  const ref = hoje || new Date();
  let ano = ref.getFullYear();
  if (new Date(ano, mes - 1, Number(m[4])) > new Date(ref.getTime() + 2 * 86400000)) ano--; // ex.: "30/dez" lido em janeiro
  return [pad(m[4]) + '/' + pad(mes) + '/' + ano, pad(h) + ':' + m[2]];
}
function dataHoraPSTexto(s, hoje) {
  if (!String(s || '').trim()) return '';
  const [d, h] = dataHoraPS(s, hoje);
  return h ? d + ' ' + h : d;
}

/** ".../problem-solving/detail/170089648" → "170089648" */
function casoDoLink(link) {
  const m = String(link || '').match(/detail\/(\d+)/);
  return m ? m[1] : '';
}

/** "dd/mm/aaaa" → Date (ou null) */
function lerData(s) {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  return new Date(Number(m[3].length === 2 ? '20' + m[3] : m[3]), Number(m[2]) - 1, Number(m[1]));
}

function formatarAgora(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

function chaveCurta(texto) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, texto);
  return Utilities.base64Encode(bytes);
}

// ===== DRIVE, LOG E AVISOS =====
/** Abre a planilha principal. Se o script foi criado de dentro dela (Extensões > Apps Script), usa ela direto. */
function abrirPlanilha() {
  const ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa && ativa.getId() === CONFIG.PLANILHA_ID) return ativa;
  try {
    return SpreadsheetApp.openById(CONFIG.PLANILHA_ID);
  } catch (e) {
    let conta = '?';
    try { conta = Session.getEffectiveUser().getEmail(); } catch (_) {}
    throw new Error('A conta ' + conta + ' não tem acesso à planilha Conteneirização de Pacotes - Base SSP53. ' +
      'Crie o script de DENTRO da planilha (Extensões > Apps Script), com a conta que é dona dela.');
  }
}

function pasta(caminho) {
  let atual = null;
  for (const parte of caminho.split('/')) {
    const it = atual ? atual.getFoldersByName(parte) : DriveApp.getFoldersByName(parte);
    atual = it.hasNext() ? it.next() : (atual ? atual.createFolder(parte) : DriveApp.createFolder(parte));
  }
  return atual;
}

function moverPara(arq, entrada, subcaminho) {
  let destino = entrada;
  for (const parte of subcaminho.split('/')) {
    const it = destino.getFoldersByName(parte);
    destino = it.hasNext() ? it.next() : destino.createFolder(parte);
  }
  arq.moveTo(destino);
}

function planilhaNaPasta(nome, pastaDestino) {
  const it = pastaDestino.getFilesByName(nome);
  if (it.hasNext()) return SpreadsheetApp.open(it.next());
  const nova = SpreadsheetApp.create(nome);
  DriveApp.getFileById(nova.getId()).moveTo(pastaDestino);
  return nova;
}

/** Remove a "Página1"/"Sheet1" vazia que o Google cria junto com uma planilha nova. */
function limparAbaPadrao(planilha) {
  const abas = planilha.getSheets();
  if (abas.length < 2) return;
  for (const a of abas) {
    if (/^(Sheet1|Página1|Planilha1)$/.test(a.getName()) && a.getLastRow() === 0) planilha.deleteSheet(a);
  }
}

function registrar(ss, arquivo, relatorio, lidas, novas, atualizadas, iguais, resultado) {
  let log = ss.getSheetByName(CONFIG.ABA_LOG);
  if (!log) {
    log = ss.insertSheet(CONFIG.ABA_LOG);
    ajustarColunas(log, 8);
    log.appendRow(['Quando', 'Arquivo', 'Relatório', 'Linhas no arquivo', 'Novas', 'Atualizadas', 'Já existiam', 'Resultado']);
    log.setFrozenRows(1);
  }
  log.appendRow([formatarAgora(new Date()), arquivo, relatorio, lidas, novas, atualizadas, iguais, resultado]);
}

function avisarErro(titulo, erros) {
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '⚠️ Painel de Faltantes: erro em ' + titulo,
      'Aconteceu um problema:\n\n' + erros.join('\n') + '\n\nVeja a aba "' + CONFIG.ABA_LOG + '" da planilha Conteneirização de Pacotes - Base SSP53.');
  } catch (e) {
    console.error('Não consegui enviar e-mail: ' + e.message);
  }
  console.error(erros.join('\n'));
}

// ===== GATILHOS: rode UMA vez =====
function criarGatilhoRelatorios() {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['importarRelatorios', 'arquivarAntigos'].includes(t.getHandlerFunction()))
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importarRelatorios').timeBased().everyMinutes(CONFIG.INTERVALO_MIN).create();
  ScriptApp.newTrigger('arquivarAntigos').timeBased().everyDays(1).atHour(CONFIG.HORA_ARQUIVAMENTO).create();
  pasta(CONFIG.PASTA_ENTRADA); // já cria a pasta de entrada no Drive
  console.log('Gatilhos criados: importação a cada ' + CONFIG.INTERVALO_MIN + ' min e arquivamento diário às ' + CONFIG.HORA_ARQUIVAMENTO + 'h.');
}
