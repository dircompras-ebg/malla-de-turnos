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
    DIAS.forEach(d => { totalHoras += (turnos[d] ? (turnos[d].horas || 0) : 0); });

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

  // Congelar las primeras 3 columnas para scroll horizontal
  sheet.setFrozenColumns(3);
  sheet.setFrozenRows(5);

  // Activar esta hoja
  ss.setActiveSheet(sheet);

  return respuesta({
    ok: true,
    mensaje: 'Malla escrita correctamente en la hoja "' + nombreHoja + '"',
    hoja: nombreHoja,
    empleados: nombresEnMalla.length
  });
}

// ============================================================
// PROXY ANTHROPIC — llama a la IA desde el servidor (sin CORS)
// La API key se guarda en: Proyecto → Configuración → Propiedades del script
// Nombre de la propiedad: ANTHROPIC_API_KEY
// ============================================================
function generarConIA(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return respuesta({ ok: false, error: 'API key no configurada. Ve a Proyecto → Configuración → Propiedades del script y agrega ANTHROPIC_API_KEY.' });
  }

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: payload.prompt }]
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
    const data = JSON.parse(response.getContentText());
    if (data.error) return respuesta({ ok: false, error: data.error.message });
    const text = (data.content && data.content[0]) ? data.content[0].text : '';
    return respuesta({ ok: true, text: text });
  } catch(err) {
    return respuesta({ ok: false, error: 'Error llamando a la IA: ' + err.toString() });
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
// FUNCIÓN DE PRUEBA — ejecuta esto manualmente para verificar
// ============================================================
function testConexion() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log('Conectado a: ' + ss.getName());
  Logger.log('Hojas existentes: ' + ss.getSheets().map(s => s.getName()).join(', '));
}