// ============================================================
// MALLA DE TURNOS — Apps Script para Google Sheets
// Departamento de Abastecimiento · El Buen Gusto
// Pega este código en Extensiones → Apps Script
// ============================================================

const SHEET_ID = '16LkvSU6xDM6yvaTgbmUaOcSsGrAppBAL0RHpSMcsj7w';

// Colores por tipo de turno
const COLORES = {
  'D':  { bg: '#F1EFE8', text: '#5F5E5A' },  // Descanso — gris
  'V':  { bg: '#E6F1FB', text: '#185FA5' },  // Vacaciones — azul
  'F':  { bg: '#FAEEDA', text: '#854F0B' },  // Día familia — ámbar
  'C':  { bg: '#EEEDFE', text: '#3C3489' },  // Compensatorio — morado
  'INV':{ bg: '#FCEBEB', text: '#A32D2D' },  // Inventario — rojo
  'WORK':{ bg: '#E1F5EE', text: '#085041' }, // Turno normal — verde
  'HEAD':{ bg: '#1a1a1a', text: '#FFFFFF' }, // Encabezado — negro
  'NAME':{ bg: '#F5F4F0', text: '#1a1a1a' }, // Nombre empleado — gris claro
  'TOTAL':{ bg: '#EAF3DE', text: '#27500A'}, // Total horas — verde oscuro
  'WARN': { bg: '#FCEBEB', text: '#A32D2D' }, // Advertencia horas — rojo
};

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DIA_LABEL = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo'
};

// Calcula horas netas (sin almuerzo) igual que el frontend.
// Siempre recalcula desde entrada/salida para no depender del campo
// "horas" que la IA a veces reporta en bruto.
function calcHorasNetas(t) {
  if (!t) return 0;
  const cod = String(t.codigo || '');
  if (['D','V','F','C'].includes(cod)) return 0;
  if (cod === 'INVENT' || cod === 'INV') return t.horas || 7;
  const parseH = function(s) {
    if (!s || s === '-' || s === '?') return null;
    const m = s.match(/^(\d+)(am|pm)$/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    if (m[2].toLowerCase() === 'pm' && h !== 12) h += 12;
    if (m[2].toLowerCase() === 'am' && h === 12) h = 0;
    return h;
  };
  const hi = parseH(t.entrada);
  const hs = parseH(t.salida);
  if (hi !== null && hs !== null && hs > hi) {
    return t.almuerzo ? (hs - hi - 1) : (hs - hi);
  }
  // Fallback: campo horas, descontando almuerzo si aplica
  const h = t.horas || 0;
  return t.almuerzo ? Math.max(0, h - 1) : h;
}

// ============================================================
// FUNCIÓN PRINCIPAL — recibe el POST desde la app web
// ============================================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'escribirMalla') {
      return escribirMalla(payload);
    } else if (action === 'getMallas') {
      return getMallas();
    } else if (action === 'generarMalla') {
      return generarConIA(payload);
    } else if (action === 'guardarConfigEmpleados') {
      return guardarConfigEmpleados(payload);
    } else if (action === 'guardarConfigTurnos') {
      return guardarConfigTurnos(payload);
    } else if (action === 'ping') {
      return respuesta({ ok: true, mensaje: 'Conectado correctamente ✓' });
    } else {
      return respuesta({ ok: false, error: 'Acción no reconocida: ' + action });
    }
  } catch(err) {
    return respuesta({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter && e.parameter.action;
  if (action === 'getMallas') return getMallas();
  if (action === 'getMalla') return getMallaDetalle(e.parameter.hoja);
  if (action === 'getConfigEmpleados') return getConfigEmpleados();
  if (action === 'getConfigTurnos') return getConfigTurnos();
  if (action === 'getHistorial') return getHistorial();
  return respuesta({ ok: true, mensaje: 'Malla de Turnos API activa ✓' });
}

// ============================================================
// LISTAR TODAS LAS MALLAS PUBLICADAS (hojas con prefijo "Sem")
// ============================================================
function getMallas() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheets = ss.getSheets();
  const mallas = [];

  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (!name.startsWith('Sem ')) return;

    // Read header rows to get semana label and fecha aprobacion
    const data = sheet.getRange(1, 1, 4, 11).getValues();
    const titulo = data[1][0] ? String(data[1][0]) : name;
    const aprobada = data[1][7] ? String(data[1][7]).replace('Aprobada: ', '') : '';

    // Read employee rows: start at row 6 (index 5), col 1-11
    const lastRow = sheet.getLastRow();
    const empRange = sheet.getRange(6, 1, Math.max(1, lastRow - 8), 11).getValues();
    const empleados = [];
    empRange.forEach(row => {
      if (row[0] && String(row[0]).match(/^\d+$/)) {
        empleados.push({
          num: row[0],
          nombre: row[1],
          cargo: row[2],
          lunes: row[3], martes: row[4], miercoles: row[5],
          jueves: row[6], viernes: row[7], sabado: row[8],
          domingo: row[9], total: row[10]
        });
      }
    });

    mallas.push({
      hoja: name,
      semana: titulo.replace('Semana: ', ''),
      aprobada: aprobada,
      empleados: empleados
    });
  });

  // Sort newest first by sheet order (last sheet = newest)
  mallas.reverse();
  return respuesta({ ok: true, mallas: mallas });
}

function getMallaDetalle(nombreHoja) {
  if (!nombreHoja) return respuesta({ ok: false, error: 'Nombre de hoja requerido' });
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) return respuesta({ ok: false, error: 'Hoja no encontrada: ' + nombreHoja });

  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(1, 1, lastRow, 11).getValues();
  const semana = data[1][0] ? String(data[1][0]).replace('Semana: ', '') : nombreHoja;
  const aprobada = data[1][7] ? String(data[1][7]).replace('Aprobada: ', '') : '';

  const empleados = [];
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (row[0] && String(row[0]).match(/^\d+$/)) {
      empleados.push({
        num: row[0], nombre: row[1], cargo: row[2],
        lunes: row[3], martes: row[4], miercoles: row[5],
        jueves: row[6], viernes: row[7], sabado: row[8],
        domingo: row[9], total: row[10]
      });
    }
  }
  return respuesta({ ok: true, hoja: nombreHoja, semana, aprobada, empleados });
}

// ============================================================
// ESCRIBIR MALLA EN UNA HOJA NUEVA
// ============================================================
function escribirMalla(payload) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const mallaData = payload.malla;       // objeto con turnos por empleado
  const semana = payload.semana;         // ej: "26 May - 1 Jun 2026"
  const empleados = payload.empleados;   // array con {nombre, cargo}
  const fechaAprobacion = payload.fechaAprobacion;
  const notas = payload.notas || '';

  // Nombre de la hoja: "Sem 26-May" (sin caracteres especiales)
  const nombreHoja = 'Sem ' + semana.split(' - ')[0].replace(/ /g, '-');

  // Si ya existe la hoja, la elimina y la recrea
  let sheet = ss.getSheetByName(nombreHoja);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(nombreHoja);

  // Mover la hoja al final
  ss.moveActiveSheet(ss.getSheets().length);

  let fila = 1;

  // ── Fila 1: Título principal ──────────────────────────────
  sheet.getRange(fila, 1, 1, 11).merge();
  const celdaTitulo = sheet.getRange(fila, 1);
  celdaTitulo.setValue('MALLA DE TURNOS — DEPARTAMENTO DE ABASTECIMIENTO · EL BUEN GUSTO');
  celdaTitulo.setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  celdaTitulo.setBackground('#1a1a1a').setFontColor('#FFFFFF');
  sheet.setRowHeight(fila, 36);
  fila++;

  // ── Fila 2: Semana y metadatos ────────────────────────────
  sheet.getRange(fila, 1, 1, 7).merge();
  sheet.getRange(fila, 1).setValue('Semana: ' + semana);
  sheet.getRange(fila, 1).setFontSize(11).setFontWeight('bold').setBackground('#F5F4F0').setFontColor('#1a1a1a');

  sheet.getRange(fila, 8, 1, 4).merge();
  sheet.getRange(fila, 8).setValue('Aprobada: ' + fechaAprobacion);
  sheet.getRange(fila, 8).setFontSize(10).setHorizontalAlignment('right').setFontColor('#888888').setBackground('#F5F4F0');
  sheet.setRowHeight(fila, 26);
  fila++;

  if (notas) {
    sheet.getRange(fila, 1, 1, 11).merge();
    sheet.getRange(fila, 1).setValue('Notas: ' + notas);
    sheet.getRange(fila, 1).setFontSize(10).setFontColor('#633806').setBackground('#FAEEDA').setFontStyle('italic');
    sheet.setRowHeight(fila, 22);
    fila++;
  }

  fila++; // fila vacía de separación

  // ── Encabezado de la tabla ────────────────────────────────
  const colEncabezado = ['Nº', 'Nombre del colaborador', 'Cargo / Rol',
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Total horas'];

  colEncabezado.forEach((titulo, i) => {
    const c = sheet.getRange(fila, i + 1);
    c.setValue(titulo);
    c.setBackground(COLORES.HEAD.bg).setFontColor(COLORES.HEAD.text);
    c.setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center').setWrap(false);
  });
  sheet.getRange(fila, 2).setHorizontalAlignment('left');
  sheet.getRange(fila, 3).setHorizontalAlignment('left');
  sheet.setRowHeight(fila, 28);
  fila++;

  // ── Filas de empleados ────────────────────────────────────
  const nombresEnMalla = Object.keys(mallaData.turnos || {});
  let numFila = 1;

  nombresEnMalla.forEach(nombre => {
    const turnos = mallaData.turnos[nombre];
    const empInfo = empleados.find(e =>
      e.nombre.toLowerCase().includes(nombre.toLowerCase().split(' ')[0])
    ) || { cargo: '' };

    let totalHoras = 0;
    DIAS.forEach(d => { totalHoras += calcHorasNetas(turnos[d]); });

    // Nº
    sheet.getRange(fila, 1).setValue(numFila).setHorizontalAlignment('center')
      .setFontSize(10).setBackground(COLORES.NAME.bg).setFontColor(COLORES.NAME.text);

    // Nombre
    sheet.getRange(fila, 2).setValue(nombre).setFontSize(10).setFontWeight('bold')
      .setBackground(COLORES.NAME.bg).setFontColor(COLORES.NAME.text).setHorizontalAlignment('left');

    // Cargo
    sheet.getRange(fila, 3).setValue(empInfo.cargo || '').setFontSize(9)
      .setBackground(COLORES.NAME.bg).setFontColor('#888888').setHorizontalAlignment('left');

    // Días
    DIAS.forEach((dia, i) => {
      const t = turnos[dia] || { codigo: '?', entrada: '-', salida: '-', horas: 0 };
      const celda = sheet.getRange(fila, 4 + i);
      let valor, colorInfo;

      if (t.codigo === 'D') {
        valor = 'D'; colorInfo = COLORES.D;
      } else if (t.codigo === 'V') {
        valor = 'V'; colorInfo = COLORES.V;
      } else if (t.codigo === 'F') {
        valor = 'F'; colorInfo = COLORES.F;
      } else if (t.codigo === 'C') {
        valor = 'C'; colorInfo = COLORES.C;
      } else if (t.codigo === 'INVENT' || t.codigo === 'INV') {
        valor = 'INV 6am'; colorInfo = COLORES.INV;
      } else {
        const entradaStr = t.entrada !== '-' ? t.entrada : t.codigo;
        const salidaStr = t.salida !== '-' ? t.salida : '';
        valor = salidaStr ? entradaStr + '-' + salidaStr + (t.almuerzo ? '\n+alm' : '') : entradaStr;
        colorInfo = COLORES.WORK;
      }

      celda.setValue(valor);
      celda.setBackground(colorInfo.bg).setFontColor(colorInfo.text);
      celda.setFontSize(9).setHorizontalAlignment('center').setWrap(true);

      // Tooltip con horas
      if (t.horas > 0) {
        celda.setNote(t.horas + 'h' + (t.almuerzo ? ' + 1h almuerzo' : ' S/A'));
      }

      // Sábado y domingo con fondo más suave
      if (dia === 'sabado' && t.codigo !== 'D') celda.setBackground('#F0FFF8');
      if (dia === 'domingo') celda.setBackground(t.codigo === 'D' ? COLORES.D.bg : '#FFF8E1');
    });

    // Total horas
    const celdaTotal = sheet.getRange(fila, 11);
    celdaTotal.setValue(totalHoras + ' h');
    if (totalHoras > 44) {
      celdaTotal.setBackground(COLORES.WARN.bg).setFontColor(COLORES.WARN.text).setFontWeight('bold');
    } else {
      celdaTotal.setBackground(COLORES.TOTAL.bg).setFontColor(COLORES.TOTAL.text).setFontWeight('bold');
    }
    celdaTotal.setFontSize(10).setHorizontalAlignment('center');

    sheet.setRowHeight(fila, 38);
    fila++;
    numFila++;
  });

  // ── Fila de totales ───────────────────────────────────────
  fila++;
  sheet.getRange(fila, 1, 1, 3).merge();
  sheet.getRange(fila, 1).setValue('CONVENCIONES').setFontWeight('bold').setFontSize(10)
    .setBackground('#F5F4F0').setFontColor('#1a1a1a');

  const convenciones = [
    ['D', 'Descanso', COLORES.D],
    ['V', 'Vacaciones', COLORES.V],
    ['F', 'Día de la familia', COLORES.F],
    ['C', 'Compensatorio', COLORES.C],
    ['INV', 'Inventario (6am especial)', COLORES.INV],
    ['Turno', 'Horario de trabajo normal', COLORES.WORK],
  ];

  fila++;
  convenciones.forEach(([codigo, desc, color]) => {
    const c1 = sheet.getRange(fila, 1);
    const c2 = sheet.getRange(fila, 2);
    c1.setValue(codigo).setBackground(color.bg).setFontColor(color.text)
      .setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
    c2.setValue(desc).setFontSize(10).setFontColor('#444444');
    sheet.getRange(fila, 2, 1, 4).merge();
    fila++;
  });

  // ── Nota legal ────────────────────────────────────────────
  fila++;
  sheet.getRange(fila, 1, 1, 11).merge();
  sheet.getRange(fila, 1).setValue(
    'Nota: Los códigos de turno no pueden alterarse sin autorización del área de Talento Humano. ' +
    'Máximo 44 horas laborales semanales (sin contar hora de almuerzo). Almuerzo de mar a vie.'
  );
  sheet.getRange(fila, 1).setFontSize(9).setFontColor('#888888').setFontStyle('italic').setWrap(true);
  sheet.setRowHeight(fila, 30);

  // ── Ajustar anchos de columna ─────────────────────────────
  sheet.setColumnWidth(1, 30);   // Nº
  sheet.setColumnWidth(2, 170);  // Nombre
  sheet.setColumnWidth(3, 130);  // Cargo
  sheet.setColumnWidth(4, 70);   // Lunes
  sheet.setColumnWidth(5, 70);   // Martes
  sheet.setColumnWidth(6, 70);   // Miércoles
  sheet.setColumnWidth(7, 70);   // Jueves
  sheet.setColumnWidth(8, 70);   // Viernes
  sheet.setColumnWidth(9, 70);   // Sábado
  sheet.setColumnWidth(10, 70);  // Domingo
  sheet.setColumnWidth(11, 70);  // Total

  // Bordes a la tabla de empleados
  const rangoTabla = sheet.getRange(5, 1, nombresEnMalla.length + 1, 11);
  rangoTabla.setBorder(true, true, true, true, true, true, '#DDDDDD', SpreadsheetApp.BorderStyle.SOLID);

  // Congelar solo filas del encabezado (no columnas — las celdas combinadas
  // del título impiden setFrozenColumns sin generar un error de Sheets)
  sheet.setFrozenRows(5);

  // Activar esta hoja
  ss.setActiveSheet(sheet);

  // Además de la hoja visible "Sem ...", deja la malla en bruto (JSON) en una
  // hoja oculta para que el historial no dependa solo del localStorage del
  // navegador — ver upsertHistorialJson(). Idempotente por fechaInicio: si ya
  // existe una entrada para esa semana, se sobreescribe (siempre queda la última).
  upsertHistorialJson(payload, nombreHoja);

  return respuesta({
    ok: true,
    mensaje: 'Malla escrita correctamente en la hoja "' + nombreHoja + '"',
    hoja: nombreHoja,
    empleados: nombresEnMalla.length
  });
}

// ============================================================
// HISTORIAL EN BRUTO (JSON) — hoja oculta "Historial_JSON"
// Es la "base de datos" real del historial: guarda la malla completa
// estructurada (no solo el texto formateado de la hoja "Sem ..."), para que
// getInfoRotacionDescanso() y el panel Historial puedan reconstruirla igual
// que si viniera de localStorage. Upsert por fechaInicio: cada semana tiene
// como máximo una fila — si se vuelve a generar/aprobar la misma semana, se
// sobreescribe esa fila en vez de duplicar.
// ============================================================
const HISTORIAL_JSON_SHEET = 'Historial_JSON';
const HISTORIAL_JSON_COLS = ['fechaInicio', 'fechaFin', 'semana', 'aprobada', 'notas', 'malla_json', 'hoja'];

// Los Sheets a veces auto-convierten un string "2026-08-03" en un objeto Date
// al escribirlo/leerlo. Normalizamos siempre a "YYYY-MM-DD" para comparar bien.
function normFechaISO(v) {
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(v || '');
}

function upsertHistorialJson(payload, nombreHoja) {
  const fechaInicio = normFechaISO(payload.fechaInicio);
  if (!fechaInicio) return; // sin fecha no podemos deduplicar por semana; el cliente siempre debe enviarla

  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(HISTORIAL_JSON_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(HISTORIAL_JSON_SHEET);
    sheet.getRange(1, 1, 1, HISTORIAL_JSON_COLS.length).setValues([HISTORIAL_JSON_COLS]);
    sheet.hideSheet();
  }

  const lastRow = sheet.getLastRow();
  let filaExistente = -1;
  if (lastRow >= 2) {
    const fechas = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < fechas.length; i++) {
      if (normFechaISO(fechas[i][0]) === fechaInicio) { filaExistente = i + 2; break; }
    }
  }

  const fila = [
    fechaInicio, normFechaISO(payload.fechaFin), payload.semana || '',
    payload.fechaAprobacion || '', payload.notas || '',
    JSON.stringify(payload.malla || {}), nombreHoja
  ];

  if (filaExistente > 0) {
    sheet.getRange(filaExistente, 1, 1, HISTORIAL_JSON_COLS.length).setValues([fila]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, HISTORIAL_JSON_COLS.length).setValues([fila]);
  }
}

function getHistorial() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(HISTORIAL_JSON_SHEET);
  if (!sheet) return respuesta({ ok: true, historial: [] });

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respuesta({ ok: true, historial: [] });

  const data = sheet.getRange(2, 1, lastRow - 1, HISTORIAL_JSON_COLS.length).getValues();
  const historial = data
    .filter(row => row[0])
    .map(row => {
      let malla = null;
      try { malla = JSON.parse(row[5] || 'null'); } catch (e) { malla = null; }
      const fechaInicio = normFechaISO(row[0]);
      return {
        id: fechaInicio, fechaInicio: fechaInicio, fechaFin: normFechaISO(row[1]),
        semana: row[2], aprobada: row[3], notas: row[4], data: malla, hoja: row[6]
      };
    })
    .filter(h => h.data); // descarta filas con JSON corrupto/vacío

  return respuesta({ ok: true, historial: historial });
}

// ============================================================
// CONFIGURACIÓN DE EMPLEADOS — reglas de descanso/horas por persona
// Se guarda en una hoja oculta "Config_Empleados" para que la
// configuración no dependa solo del localStorage del navegador
// del coordinador (que no se sincroniza entre dispositivos).
// ============================================================
const CONFIG_EMPLEADOS_SHEET = 'Config_Empleados';
const CONFIG_EMPLEADOS_COLS = ['id', 'nombre', 'cargo', 'estado', 'entrada', 'salida', 'color', 'regla', 'reglas_json'];

function guardarConfigEmpleados(payload) {
  const empleadosIn = payload.empleados || [];
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Idempotente: elimina y recrea la hoja, igual que escribirMalla()
  let sheet = ss.getSheetByName(CONFIG_EMPLEADOS_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(CONFIG_EMPLEADOS_SHEET);

  sheet.getRange(1, 1, 1, CONFIG_EMPLEADOS_COLS.length).setValues([CONFIG_EMPLEADOS_COLS]);

  const filas = empleadosIn.map(e => [
    e.id, e.nombre, e.cargo, e.estado, e.entrada, e.salida,
    e.color || '', e.regla || '', JSON.stringify(e.reglas || {})
  ]);
  if (filas.length) {
    sheet.getRange(2, 1, filas.length, CONFIG_EMPLEADOS_COLS.length).setValues(filas);
  }

  sheet.hideSheet(); // hoja de datos internos, no es para lectura manual

  return respuesta({ ok: true, mensaje: 'Configuración de empleados guardada', total: filas.length });
}

function getConfigEmpleados() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG_EMPLEADOS_SHEET);
  if (!sheet) return respuesta({ ok: true, empleados: null }); // aún no se ha guardado ninguna configuración

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respuesta({ ok: true, empleados: [] });

  const data = sheet.getRange(2, 1, lastRow - 1, CONFIG_EMPLEADOS_COLS.length).getValues();
  const empleados = data
    .filter(row => row[1]) // debe tener nombre
    .map(row => {
      let reglas = {};
      try { reglas = JSON.parse(row[8] || '{}'); } catch(e) { reglas = {}; }
      return {
        id: row[0], nombre: row[1], cargo: row[2], estado: row[3],
        entrada: row[4], salida: row[5], color: row[6], regla: row[7], reglas: reglas
      };
    });

  return respuesta({ ok: true, empleados: empleados });
}

// ============================================================
// CATÁLOGO DE TURNOS — códigos propios (no siguen ningún estándar externo)
// Se guarda en una hoja oculta "Config_Turnos" por el mismo motivo que
// Config_Empleados: que no dependa solo del localStorage del coordinador.
// ============================================================
const CONFIG_TURNOS_SHEET = 'Config_Turnos';
const CONFIG_TURNOS_COLS = ['codigo', 'entrada', 'salida', 'horas', 'almuerzo', 'desc'];

function guardarConfigTurnos(payload) {
  const turnosIn = payload.turnos || [];
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let sheet = ss.getSheetByName(CONFIG_TURNOS_SHEET);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(CONFIG_TURNOS_SHEET);

  sheet.getRange(1, 1, 1, CONFIG_TURNOS_COLS.length).setValues([CONFIG_TURNOS_COLS]);

  const filas = turnosIn.map(t => [
    String(t.codigo), t.entrada, t.salida, t.horas || 0, t.almuerzo ? 'SI' : 'NO', t.desc || ''
  ]);
  if (filas.length) {
    sheet.getRange(2, 1, filas.length, CONFIG_TURNOS_COLS.length).setValues(filas);
  }

  sheet.hideSheet();

  return respuesta({ ok: true, mensaje: 'Catálogo de turnos guardado', total: filas.length });
}

function getConfigTurnos() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG_TURNOS_SHEET);
  if (!sheet) return respuesta({ ok: true, turnos: null }); // aún no se ha guardado ningún catálogo

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respuesta({ ok: true, turnos: [] });

  const data = sheet.getRange(2, 1, lastRow - 1, CONFIG_TURNOS_COLS.length).getValues();
  const turnos = data
    .filter(row => row[0] !== '' && row[0] !== null)
    .map(row => ({
      codigo: String(row[0]), entrada: row[1], salida: row[2],
      horas: Number(row[3]) || 0, almuerzo: String(row[4]).toUpperCase() === 'SI', desc: row[5] || ''
    }));

  return respuesta({ ok: true, turnos: turnos });
}

// ============================================================
// PROXY ANTHROPIC — llama a Claude desde el servidor (sin CORS)
// La API key se guarda en: Proyecto → Configuración → Propiedades del script
// Nombre de la propiedad: ANTHROPIC_API_KEY
// Consíguela en: console.anthropic.com → API Keys
// ============================================================
// ── Schema forzado del JSON de la malla (tool use) ──────────────────────────
// En vez de confiar en la instrucción de texto "responde solo con JSON" (que
// a veces la IA rompe agregando prosa antes/después), usamos "tool use" de la
// API de Anthropic con tool_choice forzado: la API garantiza a nivel de
// esquema que el bloque tool_use.input tiene esta forma exacta — ya no hay
// que extraer JSON de un texto libre para el camino feliz.
const DIA_SCHEMA_MALLA = {
  type: 'object',
  required: ['codigo', 'entrada', 'salida', 'horas', 'almuerzo'],
  properties: {
    codigo: { type: 'string' },
    entrada: { type: 'string' },
    salida: { type: 'string' },
    horas: { type: 'number' },
    almuerzo: { type: 'boolean' }
  }
};

const MALLA_INPUT_SCHEMA = {
  type: 'object',
  required: ['semana', 'turnos', 'advertencias', 'resumen'],
  properties: {
    semana: { type: 'string', description: 'Ej: "27 Jul - 2 Ago 2026"' },
    turnos: {
      type: 'object',
      description: 'Una entrada por cada empleado activo (clave = nombre completo), con su horario de lunes a domingo',
      additionalProperties: {
        type: 'object',
        required: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', 'total_horas'],
        properties: {
          lunes: DIA_SCHEMA_MALLA, martes: DIA_SCHEMA_MALLA, miercoles: DIA_SCHEMA_MALLA, jueves: DIA_SCHEMA_MALLA,
          viernes: DIA_SCHEMA_MALLA, sabado: DIA_SCHEMA_MALLA, domingo: DIA_SCHEMA_MALLA,
          total_horas: { type: 'number' }
        }
      }
    },
    advertencias: {
      type: 'array', items: { type: 'string' },
      description: 'Cualquier conflicto, excepción o explicación va AQUÍ como texto — nunca fuera de la estructura'
    },
    resumen: { type: 'string' }
  }
};

function generarConIA(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return respuesta({ ok: false, error: 'API key no configurada. Ve a Proyecto → Configuración → Propiedades del script y agrega ANTHROPIC_API_KEY.' });
  }

  const body = {
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: payload.prompt }],
    tools: [{
      name: 'generar_malla',
      description: 'Registra la malla de turnos semanal generada, con sus advertencias y resumen.',
      input_schema: MALLA_INPUT_SCHEMA
    }],
    tool_choice: { type: 'tool', name: 'generar_malla' }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    const statusCode = response.getResponseCode();
    const rawText = response.getContentText();
    Logger.log('HTTP Status: ' + statusCode);
    Logger.log('Respuesta cruda: ' + rawText);
    const data = JSON.parse(rawText);
    if (data.error) return respuesta({ ok: false, error: '[' + statusCode + '] ' + JSON.stringify(data.error) });

    const toolUse = (data.content || []).find(c => c.type === 'tool_use');
    if (toolUse && toolUse.input) {
      return respuesta({ ok: true, malla: toolUse.input });
    }
    // Fallback defensivo — con tool_choice forzado esto no debería pasar, pero
    // si llegara a faltar el tool_use devolvemos el texto plano para que el
    // cliente intente su lógica de respaldo (extraerJSON) en vez de fallar en seco.
    const text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : '';
    return respuesta({ ok: true, text: text });
  } catch(err) {
    return respuesta({ ok: false, error: 'Error llamando a Claude: ' + err.toString() });
  }
}

// ============================================================
// HELPER: construir respuesta JSON
// ============================================================
function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// FUNCIONES DE PRUEBA — ejecuta manualmente desde el editor
// ============================================================
// Lista los modelos disponibles para tu Anthropic API key
function testListarModelosAnthropic() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) { Logger.log('Falta ANTHROPIC_API_KEY'); return; }

  const options = {
    method: 'get',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/models', options);
  Logger.log('HTTP Status: ' + response.getResponseCode());
  const data = JSON.parse(response.getContentText());

  if (data.error) { Logger.log('Error: ' + JSON.stringify(data.error)); return; }

  const modelos = (data.data || []).map(m => m.id);
  Logger.log('Modelos disponibles:\n' + modelos.join('\n'));
}

function testConexion() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log('Conectado a: ' + ss.getName());
  Logger.log('Hojas existentes: ' + ss.getSheets().map(s => s.getName()).join(', '));
}

// Simula la llamada que hace index.html — ejecuta esto y revisa el Log
function testGenerarMalla() {
  const payload = {
    action: 'generarMalla',
    prompt: 'Responde solo con la palabra: OK'
  };

  // 1. Verifica que el case existe
  Logger.log('Acción recibida: ' + payload.action);

  // 2. Verifica la API key
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  Logger.log('ANTHROPIC_API_KEY configurada: ' + (apiKey ? 'SÍ (' + apiKey.substring(0, 10) + '...)' : 'NO — falta configurarla'));

  if (!apiKey) return;

  // 3. Prueba la llamada a Claude
  const resultado = generarConIA(payload);
  Logger.log('Respuesta: ' + resultado.getContent());
}