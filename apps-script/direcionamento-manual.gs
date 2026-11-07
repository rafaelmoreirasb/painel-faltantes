/**
 * SCRIPT: DIRECIONAMENTO MANUAL
 * O que faz: a cada 15 minutos copia da planilha de origem (gid=1903954199) só as linhas
 * novas para a aba "Direcionamento Manual" da planilha "Conteneirização de Pacotes - Base SSP53".
 * Quando a coluna "ID do produto" tem vários IDs separados por quebra de linha,
 * cria uma linha para cada ID.
 *
 * Onde instalar: projeto SEPARADO em script.google.com (Novo projeto), não dentro do Labor_Sorting.
 * Como usar: colar o código > salvar > executar importarDirecionamento (até aparecer
 *            "0 linhas novas") > executar criarGatilhoDirecionamento (uma vez).
 */

// ===== CONFIGURAÇÃO =====
const ORIGEM_ID     = '1No0tZ8yI7HJpKV2V2_PgKqIBpHXVlbTKsdy-lhBzkYk';
const ORIGEM_GID    = 1903954199;
const DESTINO_ID    = '1nDqe83XDoY-A3u6rNxaMP2RT74mZNjrYSDUY2c9dKhk'; // Conteneirização de Pacotes - Base SSP53
const DESTINO_GID   = 1197001023;                                     // aba "Direcionamento Manual"
const COLUNA_IDS    = 'ID do produto'; // coluna que pode ter vários IDs separados por quebra de linha
const INTERVALO_MIN = 15;
const LOTE_MAX      = 30000;           // máximo de linhas gravadas por execução

function importarDirecionamento() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // evita duas execuções ao mesmo tempo

  try {
    const origem = abaPorGid(SpreadsheetApp.openById(ORIGEM_ID), ORIGEM_GID);
    const dados = origem.getDataRange().getDisplayValues();
    if (dados.length < 2) { console.log('Origem vazia: nada a fazer'); return; }

    const cab = dados[0];
    const colIds = acharColuna(cab, COLUNA_IDS);
    const destino = abaPorGid(SpreadsheetApp.openById(DESTINO_ID), DESTINO_GID);

    if (destino.getLastRow() === 0) {
      destino.appendRow([...cab, 'Importado em', 'Chave']);
    }

    // Lê as chaves que já estão no destino
    const colChave = cab.length + 2;
    const ultima = destino.getLastRow();
    const existentes = {};
    if (ultima > 1) {
      destino.getRange(2, colChave, ultima - 1, 1).getValues().flat()
        .forEach(k => existentes[k] = (existentes[k] || 0) + 1);
    }

    // Separa os IDs (um por linha) e seleciona só o que é novo
    const agora = new Date();
    const vistos = {};
    const novas = [];
    let restantes = 0;
    for (const linha of dados.slice(1)) {
      if (linha.every(c => c === '')) continue; // ignora linhas vazias
      const base = hash(linha);
      const ids = String(linha[colIds]).split(/\r\n|\r|\n/).map(s => s.trim()).filter(s => s !== '');
      const partes = ids.length ? ids : [''];
      partes.forEach((id, i) => {
        const k = base + ':' + (i + 1);
        vistos[k] = (vistos[k] || 0) + 1;
        if (vistos[k] <= (existentes[k] || 0)) return; // já importada
        if (novas.length >= LOTE_MAX) { restantes++; return; }
        const nova = linha.slice();
        nova[colIds] = id;
        novas.push([...nova, agora, k]);
      });
    }

    if (novas.length) {
      const inicio = destino.getLastRow() + 1;
      const faltam = inicio + novas.length - 1 - destino.getMaxRows();
      if (faltam > 0) destino.insertRowsAfter(destino.getMaxRows(), faltam);
      destino.getRange(inicio, 1, novas.length, novas[0].length).setValues(novas);
    }
    console.log(novas.length + ' linhas novas importadas' +
      (restantes ? ' (faltam ' + restantes + ', vão nas próximas execuções)' : ''));
  } finally {
    lock.releaseLock();
  }
}

function abaPorGid(planilha, gid) {
  const aba = planilha.getSheets().find(s => s.getSheetId() === gid);
  if (!aba) throw new Error('Aba com gid=' + gid + ' não encontrada em "' + planilha.getName() + '".');
  return aba;
}

// Acha a coluna pelo nome do cabeçalho, ignorando maiúsculas, acentos e espaços
function acharColuna(cab, nome) {
  const norm = s => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const alvo = norm(nome);
  let i = cab.findIndex(c => norm(c) === alvo);
  if (i === -1) i = cab.findIndex(c => norm(c).includes(alvo));
  if (i === -1) throw new Error('Coluna "' + nome + '" não encontrada. Cabeçalhos da origem: ' + cab.join(' | '));
  return i;
}

function hash(linha) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, linha.join(String.fromCharCode(31)));
  return Utilities.base64Encode(bytes);
}

// Rode UMA vez para ativar a execução automática (só mexe no gatilho deste script)
function criarGatilhoDirecionamento() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'importarDirecionamento')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importarDirecionamento').timeBased().everyMinutes(INTERVALO_MIN).create();
}
