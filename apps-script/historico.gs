/**
 * SCRIPT: HISTÓRICO
 * O que faz: a cada 15 minutos copia da planilha do Labor (aba gid=0) só as linhas
 * que ainda não estão na aba "Histórico" da planilha onde o script está instalado.
 * Nunca apaga nada do histórico.
 *
 * Onde está instalado: projeto Apps Script "Labor_Sorting" (planilha Base Mirassol SSP53).
 * Como usar: Extensões > Apps Script > colar o código > salvar >
 *            executar importarNovasLinhas (teste) > executar criarGatilho (uma vez).
 */

// ===== CONFIGURAÇÃO =====
const ORIGEM_ID     = '1O4clXDtcty6TiCVsBXFu0I45Hv9LSysBoI70M4Kd6qc';
const ORIGEM_GID    = 0;            // aba do link (gid=0)
const DESTINO_ABA   = 'Histórico';  // aba na SUA planilha
const TEM_CABECALHO = true;
const INTERVALO_MIN = 15;

function importarNovasLinhas() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // evita duas execuções ao mesmo tempo

  try {
    const planOrigem = SpreadsheetApp.openById(ORIGEM_ID);
    const origem = planOrigem.getSheets().find(s => s.getSheetId() === ORIGEM_GID);
    if (!origem) throw new Error('Aba com gid=' + ORIGEM_GID + ' não encontrada na planilha original.');

    const dados = origem.getDataRange().getDisplayValues();
    const inicio = TEM_CABECALHO ? 1 : 0;
    if (dados.length <= inicio) return; // origem zerada: nada a fazer

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const destino = ss.getSheetByName(DESTINO_ABA) || ss.insertSheet(DESTINO_ABA);
    const nCols = dados[0].length;

    if (destino.getLastRow() === 0) {
      const cab = TEM_CABECALHO ? dados[0] : dados[0].map((_, i) => 'Coluna ' + (i + 1));
      destino.appendRow([...cab, 'Importado em', 'Chave']);
    }

    // Lê as chaves que já estão no histórico
    const colChave = nCols + 2;
    const ultima = destino.getLastRow();
    const existentes = {};
    if (ultima > 1) {
      destino.getRange(2, colChave, ultima - 1, 1).getValues().flat()
        .forEach(k => existentes[k] = (existentes[k] || 0) + 1);
    }

    // Seleciona só as linhas novas
    const agora = new Date();
    const vistos = {};
    const novas = [];
    for (const linha of dados.slice(inicio)) {
      if (linha.every(c => c === '')) continue; // ignora linhas vazias
      const k = chave(linha);
      vistos[k] = (vistos[k] || 0) + 1;
      if (vistos[k] > (existentes[k] || 0)) novas.push([...linha, agora, k]);
    }

    if (novas.length) {
      destino.getRange(destino.getLastRow() + 1, 1, novas.length, novas[0].length).setValues(novas);
    }
    console.log(novas.length + ' linhas novas importadas');
  } finally {
    lock.releaseLock();
  }
}

function chave(linha) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, linha.join('␟'));
  return Utilities.base64Encode(bytes);
}

// Rode UMA vez para ativar a execução automática
// Só apaga o PRÓPRIO gatilho (a versão antiga apagava todos, inclusive os do importador e do painel)
function criarGatilho() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'importarNovasLinhas')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importarNovasLinhas').timeBased().everyMinutes(INTERVALO_MIN).create();
}
