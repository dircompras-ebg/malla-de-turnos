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
  const parseH = horaDecimalIA; // acepta horas con minutos ("2:30am"), no solo en punto
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
// Modelo y nivel de razonamiento de la generación de mallas.
// - MODELO_IA: Claude Sonnet 5.5. Cambiarlo impacta costo y calidad — ver CLAUDE.md.
// - ESFUERZO_IA: cuánto "piensa" el modelo antes de responder ('low' | 'medium' | 'high').
//   'medium' es el punto de equilibrio para cuadrar descansos + horas. Si la
//   generación llegara a fallar por tiempo de espera (UrlFetchApp corta las
//   peticiones muy largas), bájalo a 'low'; si quieres que razone más, 'high'.
const MODELO_IA = 'claude-sonnet-5-5';
const ESFUERZO_IA = 'medium';
// El razonamiento del modelo también gasta de este tope, por eso es amplio
// aunque la malla en sí ocupe poco.
const MAX_TOKENS_IA = 16000;

// ── Formato de salida garantizado (structured outputs) ──────────────────────
// Sonnet 5.5 ya no acepta "tool_choice" forzado (devuelve error 400), que era
// como antes se garantizaba el JSON. Ahora se usa output_config.format con un
// JSON Schema: la API garantiza que la respuesta cumple este esquema exacto.
//
// El esquema es COMPACTO a propósito: cada día es un texto corto
// ("8am-5pm+alm", "6am-2pm", "D"…) en vez de un objeto con 5 campos. Así el
// modelo escribe ~3 veces menos, responde más rápido y no puede equivocarse
// calculando el campo "horas" — las horas las calcula este script.
// expandirMallaCompacta() lo convierte al formato de siempre que usa index.html.
const DIAS_IA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const FILA_MALLA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['empleado'].concat(DIAS_IA).concat(['fijados']),
  properties: {
    empleado: { type: 'string', description: 'Nombre completo, escrito igual que en la lista del equipo' },
    lunes: { type: 'string' }, martes: { type: 'string' }, miercoles: { type: 'string' },
    jueves: { type: 'string' }, viernes: { type: 'string' }, sabado: { type: 'string' }, domingo: { type: 'string' },
    fijados: {
      type: 'array',
      items: { type: 'string', enum: DIAS_IA },
      description: 'Días de esta persona cuyo turno quedó definido de forma explícita por las novedades de la semana (o por su horario fijo) y que por eso no deben ajustarse después. Vacío si ninguno.'
    }
  }
};

const MALLA_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['turnos', 'advertencias', 'resumen'],
  properties: {
    turnos: { type: 'array', items: FILA_MALLA_SCHEMA, description: 'Una fila por cada persona del equipo, en el mismo orden de la lista' },
    advertencias: {
      type: 'array', items: { type: 'string' },
      description: 'Solo conflictos reales que el coordinador deba revisar (una novedad que no se pudo cumplir, alguien que no llega a su meta). Vacío si no hay.'
    },
    resumen: { type: 'string', description: 'Dos o tres frases: quién descansa qué día y qué novedades se aplicaron' }
  }
};

const SISTEMA_IA = [
  'Eres el planificador de turnos del Departamento de Abastecimiento de El Buen Gusto.',
  '',
  'Escribe el turno de cada día como un texto corto, con uno de estos formatos exactos:',
  '- Turno de trabajo sin almuerzo: "6am-2pm"',
  '- Turno de trabajo con 1 hora de almuerzo (no cuenta como hora laboral): "8am-5pm+alm"',
  '- Descanso: "D" · Vacaciones: "V" · Día de la familia: "F" · Compensatorio: "C"',
  '- Inventario de fin de mes: "INV 6am-1pm"',
  'Las horas se escriben en formato 12 horas, en punto o con minutos: "7am", "2:30am", "12am" (medianoche), "12pm" (mediodía). Usa "12am", nunca "12:01am".',
  'Las horas laborales de un turno son salida menos entrada, menos 1 si lleva "+alm". Ejemplos: "8am-5pm+alm" = 8 h · "8am-4pm+alm" = 7 h · "6am-2pm" = 8 h · "8am-12pm" = 4 h · "12am-8am" = 8 h.',
  'Antes de responder, suma las horas de cada persona y comprueba que coinciden con su meta.'
].join('\n');

// "8am" / "2:30am" / "12pm" → horas en decimal (0–24). null si no es una hora válida.
function horaDecimalIA(s) {
  const m = String(s || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) / 60 : 0;
  if (h < 1 || h > 12) return null;
  if (m[3] === 'pm' && h !== 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h + min;
}

function limpiarHoraIA(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '').replace(/:00(?=am|pm)/, '');
}

// Texto compacto de un día → objeto {codigo, entrada, salida, horas, almuerzo}
// (el formato que index.html y escribirMalla() han usado siempre).
function celdaDesdeTextoIA(txt) {
  const s = String(txt || '').trim();
  const up = s.toUpperCase();
  if (up === 'D' || up === 'V' || up === 'F' || up === 'C') {
    return { codigo: up, entrada: '-', salida: '-', horas: 0, almuerzo: false };
  }
  const m = s.match(/([\d:]+\s*[ap]m)\s*[-–]\s*([\d:]+\s*[ap]m)/i);
  const entrada = m ? limpiarHoraIA(m[1]) : null;
  const salida = m ? limpiarHoraIA(m[2]) : null;
  const hi = horaDecimalIA(entrada), hs = horaDecimalIA(salida);
  const bruto = (hi !== null && hs !== null && hs > hi) ? hs - hi : null;

  if (up.indexOf('INV') === 0) {
    return { codigo: 'INVENT', entrada: entrada || '6am', salida: salida || '1pm', horas: bruto !== null ? bruto : 7, almuerzo: false };
  }
  if (bruto === null) return null; // texto que no se pudo interpretar
  const almuerzo = /\+\s*a/i.test(s);
  // 'T' = turno de trabajo sin código de catálogo asignado todavía; index.html
  // le pone el código del catálogo que tenga ese mismo horario.
  return { codigo: 'T', entrada: entrada, salida: salida, horas: almuerzo ? bruto - 1 : bruto, almuerzo: almuerzo };
}

function expandirMallaCompacta(obj) {
  const turnos = {}, fijados = {};
  const advertencias = (obj.advertencias || []).slice();
  (obj.turnos || []).forEach(function(fila) {
    const nombre = String(fila.empleado || '').trim();
    if (!nombre) return;
    const row = {};
    let total = 0;
    DIAS_IA.forEach(function(dia) {
      let c = celdaDesdeTextoIA(fila[dia]);
      if (!c) {
        advertencias.push(nombre + ' · ' + dia + ': la IA escribió "' + fila[dia] + '" y no se pudo interpretar; quedó como descanso, revísalo.');
        c = { codigo: 'D', entrada: '-', salida: '-', horas: 0, almuerzo: false };
      }
      row[dia] = c;
      total += c.horas;
    });
    row.total_horas = total;
    turnos[nombre] = row;
    fijados[nombre] = (fila.fijados || []).filter(function(d) { return DIAS_IA.indexOf(d) >= 0; });
  });
  return { semana: obj.semana || '', turnos: turnos, fijados: fijados, advertencias: advertencias, resumen: obj.resumen || '' };
}

function generarConIA(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return respuesta({ ok: false, error: 'API key no configurada. Ve a Proyecto → Configuración → Propiedades del script y agrega ANTHROPIC_API_KEY.' });
  }

  const body = {
    model: MODELO_IA,
    max_tokens: MAX_TOKENS_IA,
    system: SISTEMA_IA,
    messages: [{ role: 'user', content: payload.prompt }],
    // El razonamiento ("thinking") va activado por defecto en este modelo; no se
    // envía el parámetro. La profundidad se controla con effort.
    output_config: {
      effort: ESFUERZO_IA,
      format: { type: 'json_schema', schema: MALLA_OUTPUT_SCHEMA }
    }
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
    const data = JSON.parse(rawText);
    if (data.error) return respuesta({ ok: false, error: '[' + statusCode + '] ' + JSON.stringify(data.error) });

    Logger.log('stop_reason: ' + data.stop_reason + ' · uso: ' + JSON.stringify(data.usage || {}));

    // El modelo puede negarse (muy raro en este uso) o quedarse sin espacio:
    // en ambos casos el contenido no es una malla válida, así que se informa claro.
    if (data.stop_reason === 'refusal') {
      return respuesta({ ok: false, error: 'El modelo no generó la malla (respuesta rechazada por sus filtros de seguridad). Revisa el texto de las novedades de la semana y vuelve a intentar.' });
    }
    if (data.stop_reason === 'max_tokens') {
      return respuesta({ ok: false, error: 'La respuesta de la IA quedó incompleta (se acabó el espacio de respuesta). Vuelve a intentar; si se repite, sube MAX_TOKENS_IA o baja ESFUERZO_IA en el Apps Script.' });
    }

    // La respuesta puede empezar con bloques de razonamiento; la malla viene en el bloque de texto.
    const bloque = (data.content || []).filter(function(c) { return c.type === 'text'; }).pop();
    const texto = bloque ? bloque.text : '';
    try {
      const malla = expandirMallaCompacta(JSON.parse(texto));
      return respuesta({ ok: true, malla: malla, modelo: data.model });
    } catch (e) {
      // No debería pasar con el esquema garantizado; se devuelve el texto para
      // que index.html intente su extracción de respaldo en vez de fallar en seco.
      return respuesta({ ok: true, text: texto });
    }
  } catch(err) {
    const msg = err.toString();
    if (/timed? ?out|tiempo/i.test(msg)) {
      return respuesta({ ok: false, error: 'La IA tardó demasiado en responder. Vuelve a intentar; si se repite, cambia ESFUERZO_IA a \'low\' en el Apps Script.' });
    }
    return respuesta({ ok: false, error: 'Error llamando a Claude: ' + msg });
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

// Prueba la generación con IA de punta a punta — ejecútala desde el editor
// (menú de funciones → testGenerarMalla → Ejecutar) y revisa el registro.
// Hazlo cada vez que cambies MODELO_IA o ESFUERZO_IA, ANTES de implementar la
// nueva versión: confirma que la API acepta la petición y cuánto tarda.
function testGenerarMalla() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  Logger.log('ANTHROPIC_API_KEY configurada: ' + (apiKey ? 'SÍ' : 'NO — falta configurarla'));
  if (!apiKey) return;

  const payload = {
    action: 'generarMalla',
    prompt: 'Malla de prueba para la semana del lunes 5 al domingo 11 de enero.\n' +
      'Equipo: Ana Pérez (Auxiliar), meta 42 h; Luis Gómez (Conductor), meta 42 h.\n' +
      'Todos descansan el domingo. Lunes 6am-2pm sin almuerzo; martes a viernes 8am-5pm con almuerzo; ' +
      'el sábado completa las horas que falten para la meta. Novedad: Luis Gómez descansa el miércoles.'
  };

  const inicio = Date.now();
  const resultado = generarConIA(payload);
  Logger.log('Modelo: ' + MODELO_IA + ' · esfuerzo: ' + ESFUERZO_IA + ' · tardó ' + Math.round((Date.now() - inicio) / 1000) + ' s');
  Logger.log('Respuesta: ' + resultado.getContent());
}
