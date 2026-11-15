Eres el asistente de desarrollo del proyecto "Malla de Turnos — El Buen Gusto".

## Contexto del proyecto
Sistema web de gestión de turnos del Departamento de Abastecimiento de El Buen Gusto. Reemplaza un Excel manual desorganizado. Está publicado en GitHub Pages y conectado a Google Sheets via Apps Script.

## Estructura del repositorio
E:\Carpeta 2023\Documents\EBG-Develop\
├── index.html         → App de gestión (solo para el coordinador)
├── turnos.html        → Vista pública de empleados (solo lectura)
├── styles.css         → Estilos del coordinador (index.html) — tokens en :root, responsive ≤960px y ≤560px
├── turnos.css         → Estilos de la vista empleados (turnos.html) — incluye responsive ≤600px y ≤380px
└── (no hay build, no hay framework, todo es HTML/CSS/JS vanilla)

## URLs en producción
- App coordinador: https://dircompras-ebg.github.io/malla-de-turnos/
- Vista empleados: https://dircompras-ebg.github.io/malla-de-turnos/turnos.html
- Google Sheets: https://docs.google.com/spreadsheets/d/16LkvSU6xDM6yvaTgbmUaOcSsGrAppBAL0RHpSMcsj7w/edit
- Apps Script URL: https://script.google.com/macros/s/AKfycbxX9LaIAcbNFhMLWdxZDDY7dY80j8aAupf8DpRVqoK2E6OkIXo6-l2ujbC7uXpqUWg5/exec

## Stack técnico
- HTML/CSS/JS vanilla — sin frameworks, sin build tools, sin npm
- localStorage para caché rápida/offline en el navegador del coordinador — **no hay base de datos propia**, Google Sheets hace de "base de datos" para lo que necesita sincronizarse entre dispositivos (ver "Persistencia de la configuración de empleados" abajo). El catálogo de turnos y el historial preloaded SÍ siguen siendo solo localStorage + defaults hardcodeados (no se han migrado a Sheets).
- Anthropic API (`claude-sonnet-5-5`) como proxy en Apps Script para generar mallas con IA
- Google Apps Script como backend/API que escribe en Google Sheets
- GitHub Pages como hosting estático

## Empleados activos
La lista vigente vive en la hoja `Config_Empleados` del Sheets (se edita en el panel Empleados). Al 15 de noviembre de 2026:
1. Álvaro Ramos — Conductor
2. Iván Nieto — Almacenista
3. Fabián Cárdenas — Auxiliar logístico
4. Yesid Moreno — Auxiliar logístico
5. Cristian Medina — Líder Procesados
6. Oscar Sosa — Conductor
7. Lorena Lara — Analista de compras
8. Laura García — Operaria Procesados
9. Nohemy — Operaria Procesados
10. Joseph Torres — Auxiliar logístico (desde agosto 2026)
11. Lilia — Operaria Procesados (desde septiembre 2026)
12. Nicolas Ramirez — Practicante universitario (desde noviembre 2026)

Manuel Corro ya no trabaja en la empresa (último día: 24 de agosto de 2026). Las reglas de abajo que lo nombran se conservan como referencia histórica; el código solo las aplica si la persona sigue activa.

## Reglas de negocio
- **PISO mínimo de 42 horas laborales semanales por empleado (almuerzo NO cuenta) — NO es un techo.** La ley colombiana fija 42h como máximo legal, pero en esta empresa esa cifra es el mínimo que cada empleado debe cumplir o superar cada semana. Los turnos son flexibles en horario de entrada/salida (un día puede entrar a las 4am y al siguiente a las 12pm, sin restricción de consistencia); el criterio no es "no pasarse de 42h" sino "asegurar que cada persona llegue a 42h o más", ajustando duración/horario de turnos según haga falta y buscando equidad entre empleados con roles similares. Las horas de recargo (nocturno, festivo, extra) las gestiona RRHH aparte para el pago — no es motivo para recortar turnos por debajo de 42h. Esto aplica también en semanas con festivo (ver regla de abajo). Excepción: Laura García y Nohemy trabajan 35h (no 42h) en las semanas donde descansan el martes por un lunes festivo.
- Iván Nieto ↔ Fabián Cárdenas: rotación martes/jueves entrando a 7am, semana por semana
- Cristian Medina: horario permanente fijo, no rota (8am a 5pm)
- Almuerzo de martes a viernes (1h, no se cuenta en las 42h)
- Último día de cada mes: inventario, todos entran 6am (horario especial)
- las semanas con dias lunes festivo no descuentan de las 42 horas semanales para Manuel Corro, Yesid Umbarila, Ivan Nieto, Fabian Cardenas, Oscar Sosa(siempre cumplir con las 42horas semanales)
- todos los colaboradores descansan el dia domingo a excepcion de Nohemy y Laura García que trabajan el domingo cuando la siguiente semana tiene lunes festivo
- Los colaboradores Manuel Corro, Yesid Umbarila, Ivan Nieto, Fabian Cardenas, Oscar Sosa tienen un dia de descanso adicional entre semana que los tomaran entre martes, miercoles, jueves, sabado y lunes cuando no es día festivo 
- los dias sabados de descanso se deben rotar entre Manuel Corro, Yesid Umbarila, Ivan Nieto, Fabian Cardenas, Oscar Sosa (tener en cuenta el historial de las semanas anteriores para que cada uno descanse un sabado cada 5 semanas) 
- solo puede descansar una persona por dia de los colaboradores Manuel Corro, Yesid Umbarila, Ivan Nieto, Fabian Cardenas, Oscar Sosa( a exccepcion de las semanas que tienen un día festivo, que tendra días que descansen dos persoans por día)
- Ivan Nieto no puede descansar los dias miercoles 
-Manuel corro no puede descansar los dias miercoles y jueves 
-Laura Garcia y Nohemy descansan los dias martes siempre que hay un dia lunes festivo (esa semana para ellas es de 35 horas laborales)
- Los dias Lunes festivo Oscar sosa ingresa a las 4:30am con hora de salida a la 1:30pm (turno 9)
- todos los lunes que no es día festivo los auxiliares logisticos manuel y yesid ingresan a las 6am -2pm sin hora de almuerzo
- todos los lunes que no sea dia festivo el conductor ingresa en horario de 7am-3pm sin hora de almuerzo
- los días festivos los auxiliares logisticos manuel corro, yesid moreno ingresan de 4am-1pm
- los dias siguientes a un festivo los auxiliares logisticos yesid moreno y manuel corro ingresan a las 7am 
- los días despues de un festivo el conductor oscar sosa ingresa a las 7am 
- el conductor alvaro ramos tiene turno los dias lunes y martes de 7am-4pm el día miercoles ingresa a las 2:30am, los dias jueves de cada semana ingresa a las 12am 
- cristian medina los días jueves ingresa a las 12am


## Arquitectura de index.html
Paneles: dashboard, empleados, turnos, generar, historial, publicar
- TURNOS_DEFAULT: catálogo de turnos con código, entrada, salida, horas, almuerzo
- EMPLEADOS_DEFAULT: lista base de empleados con cargo, regla especial (texto libre) y `reglas` (objeto estructurado, ver abajo)
- HISTORIAL_PRELOADED: 23 semanas históricas del Excel original (nov 2025 - abr 2026)
- loadHistorial() fusiona HISTORIAL_PRELOADED con localStorage para no perder datos nuevos
- generarMalla(): llama a la Anthropic API con todas las reglas (fijas + generadas dinámicamente desde `reglas` de cada empleado) y devuelve JSON
- renderMallaReview(): tabla editable con clic en celda para cambiar turno inline
- aprobarMalla(): envía al Apps Script via POST y guarda en localStorage

### Reglas de descanso/horas configurables por empleado (Fase 1 — implementado)
Cada empleado en `EMPLEADOS_DEFAULT` (y en localStorage, clave `malla_empleados_v2`) tiene un campo `reglas`:
```js
reglas: {
  descansaDomingo: true,
  minHorasSemanales: 42,        // PISO, no techo — no bajar de 42 sin excepción real
  minAplicaConFestivo: true,     // si true, el festivo no reduce la meta semanal
  tieneDescansoAdicional: false, // día de descanso extra entre semana, aparte del domingo
  diasDescansoPermitidos: [],    // días válidos para ese descanso adicional
  diasNoDescansa: [],            // días donde nunca puede descansar (ningún tipo)
  grupoRotacion: '',             // nombre de grupo — empleados con el mismo valor rotan sábados/día extra entre ellos
  excepcionFestivo: { activa: false, diaAlternativo: 'martes', horasSemanales: 35 } // caso Laura García/Nohemy
}
```
- Se edita desde el panel **Empleados → botón "Editar"** en cada fila (formulario `edit-emp-form`, funciones `toggleEditEmp()` / `guardarEdicionEmpleado()`).
- `reglasDefault()` genera los valores por defecto (42h, descansa domingo, sin grupo) para empleados nuevos o para los que vienen de una versión anterior de localStorage sin este campo (migración en `loadEmpleados()`).
- El grupo de rotación de descansos (hoy: Manuel Corro, Yesid Moreno, Iván Nieto, Fabián Cárdenas, Oscar Sosa, todos con `grupoRotacion: 'logistica-descanso'`) ya NO está hardcodeado — `getGruposRotacion()` lo calcula agrupando empleados activos por ese campo.
- El texto del prompt de IA para el piso de 42h, el descanso dominical y el bloque de rotación de descansos se genera dinámicamente con `textoPisoHoras()`, `textoDomingo()` y `textoGruposRotacion()` — leen `reglas` de cada empleado en vez de tener nombres fijos escritos en el prompt.
- **Fuera de esta fase (sigue hardcodeado en el prompt):** los horarios fijos raros por día de la semana (Álvaro Ramos, Cristian Medina) y las excepciones condicionales de festivo/lunes (Manuel Corro, Yesid Moreno, Oscar Sosa) — ver Fase 2 propuesta.

### Persistencia de la configuración de empleados (Fase 2A — implementado)
La configuración de empleados (`reglas` de cada uno) ya NO depende solo del navegador del coordinador. Se sincroniza con una hoja oculta **"Config_Empleados"** en el Google Sheets:
- `script-sheets.js` → `guardarConfigEmpleados(payload)` (acción POST `guardarConfigEmpleados`) escribe la lista completa de empleados (id, nombre, cargo, estado, entrada, salida, color, regla, y `reglas` serializado como JSON en la columna `reglas_json`). Es idempotente: borra y recrea la hoja en cada guardado, igual que `escribirMalla()`.
- `script-sheets.js` → `getConfigEmpleados()` (acción GET `getConfigEmpleados`) lee esa hoja y devuelve el array de empleados con `reglas` ya parseado. Si la hoja no existe todavía (primera vez), devuelve `empleados: null` y el cliente se queda con `EMPLEADOS_DEFAULT`/localStorage.
- En `index.html`: `cargarConfigEmpleadosDesdeSheets()` se llama una vez al iniciar la app (al final del script) y sobreescribe `empleados` con lo que haya en Sheets si la respuesta trae datos. `guardarConfigEmpleadosEnSheets()` se llama después de cada `saveEmpleados()` (en `addEmpleado()`, `removeEmpleado()`, `guardarEdicionEmpleado()`) para subir el array completo a Sheets.
- Si no hay conexión o el Apps Script no responde, ambas funciones fallan en silencio (solo un `console.warn` o una notificación) y la app sigue funcionando con la copia en localStorage — Sheets es la fuente de verdad cuando hay red, pero nunca bloquea el flujo si no la hay.
- **Importante:** tras pegar el `script-sheets.js` actualizado en Apps Script hay que volver a "Implementar → Administrar implementaciones → Nueva versión" para que `getConfigEmpleados`/`guardarConfigEmpleados` queden activos en la URL ya desplegada (la URL no cambia).

### Horarios fijos semanales por empleado (Fase 2B — implementado)
Además de `reglas` de descanso/horas (Fase 1), cada empleado tiene `reglas.horarioFijo`:
```js
horarioFijo: {
  activo: false, // true = este empleado NO rota nunca, usa siempre este horario
  dias: {
    lunes: {descansa:false, entrada:'7am', salida:'4pm', almuerzo:false},
    // ... martes..domingo, mismo shape
  }
}
```
- Hoy Álvaro Ramos y Cristian Medina tienen `activo:true` con su horario real (antes hardcodeado en el prompt como reglas 15/16 — ya se removieron).
- Se edita en el mismo modal "Editar" del panel Empleados, sección "Horario fijo semanal": un grid de 7 días con entrada/salida/almuerzo/descansa; las horas netas se calculan solas con `parsearHorasNetas()`.
- `textoHorariosFijos()` genera la sección `═══ HORARIOS FIJOS ESPECIALES ═══` del prompt dinámicamente a partir de este campo, para cualquier empleado con `horarioFijo.activo`.
- `loadEmpleados()` y `cargarConfigEmpleadosDesdeSheets()` hacen backfill de campos nuevos (como este) usando como base el default ESPECÍFICO de ese `id` en `EMPLEADOS_DEFAULT` (no un default genérico) — así alguien que ya tenía datos guardados de antes de esta fase no pierde el horario real de Álvaro/Cristian.
- **Sigue fuera de esta fase:** las excepciones condicionales de Manuel Corro/Yesid Moreno/Oscar Sosa en lunes normal y en festivo (reglas 13-14, 17-20 del prompt) — esas siguen hardcodeadas.

### Historial como base de datos en Sheets (Fase 2C — implementado)
El historial de mallas aprobadas ya no depende solo de `HISTORIAL_PRELOADED` + localStorage. `escribirMalla()` en `script-sheets.js` ahora también hace un **upsert por `fechaInicio`** en una hoja oculta `Historial_JSON` (columnas: fechaInicio, fechaFin, semana, aprobada, notas, malla_json, hoja) — si ya existe una fila para esa semana, la sobreescribe; **siempre queda la última versión generada/aprobada de cada semana**, nunca duplicados.
- Nueva acción GET `getHistorial` devuelve ese historial completo con la malla ya parseada (mismo shape que usa `getInfoRotacionDescanso()` localmente).
- `index.html` → `cargarHistorialDesdeSheets()` se llama al iniciar la app y hace merge por `fechaInicio` (Sheets manda para las semanas que tenga; lo local/preloaded llena huecos de semanas viejas que Sheets aún no tiene).
- `aprobarMalla()` y `publicarDesdeHistorial()` ahora envían `fechaInicio`/`fechaFin` en el payload — necesario para que el upsert por semana funcione.

### Auto-guardado al cerrar la pestaña (Fase 2C — implementado)
Si el coordinador genera una malla y cierra la pestaña o navega fuera SIN darle a "Aprobar y publicar en Sheets", `autoGuardarMallaPendiente()` (enganchada a `beforeunload` y `pagehide`) publica esa malla en Sheets de todos modos vía `navigator.sendBeacon()` (fire-and-forget, no espera respuesta — es lo único confiable cuando la página se está cerrando). Usa el mismo endpoint `escribirMalla`, así que cae en el mismo upsert por semana: si luego se vuelve a generar/aprobar esa misma semana, se sobreescribe. Se controla con el flag global `mallaPublicadaEnSheets` (false tras generar una malla nueva, true tras aprobar con éxito) para no reenviar de más.
- **Importante:** esto también requiere el `script-sheets.js` actualizado desplegado en Apps Script (ver nota arriba) — sin eso, el auto-guardado y el historial-desde-Sheets fallan en silencio y todo sigue funcionando solo con localStorage.

### Catálogo de turnos ampliado + como base de datos en Sheets (Fase 2D — implementado)
Los códigos de turno son propios de la empresa, no siguen ningún estándar externo — así que en vez de mantener solo los ~17 turnos originales, `index.html` genera automáticamente un catálogo mucho más amplio:
- `ANCLAS_TURNO`: horas de entrada reales del negocio (12am, 2:30am, 4am, 4:30am, 5am, 6am, 7am, 8am, 9am, 10am, 12pm).
- `DURACIONES_TURNO`: 4 a 10 horas netas.
- `generarCatalogoAmplio(existentes)` combina cada ancla × duración × con/sin almuerzo, calcula la salida, y **deduplica** contra cualquier turno que ya exista (incluidos los especiales D/V/F/C/INVENT) para no generar dos códigos distintos con el mismo horario real.
- Códigos generados con esquema propio: `<entradaCompacta><S|A><horas>` — ej. `6A8` = entra 6am, con almuerzo (A), 8h netas; `230S7` = entra 2:30am, sin almuerzo (S), 7h. El total hoy es ~147 turnos (17 originales + ~130 generados, sin duplicados).
- `catalogoTurnos` se inicializa fusionando lo que ya hubiera guardado (localStorage o Sheets) con los turnos generados que aún no existan — nunca se pierde un turno personalizado que el coordinador haya creado a mano.
- Igual que empleados/historial, el catálogo se sincroniza con una hoja oculta **"Config_Turnos"** en Sheets (`guardarConfigTurnos`/`getConfigTurnos` en `script-sheets.js`, acciones POST/GET). `cargarConfigTurnosDesdeSheets()` se llama al iniciar; si Sheets no tiene catálogo todavía, lo siembra automáticamente con el catálogo local (ya ampliado). `guardarConfigTurnosEnSheets()` se llama después de `addTurno()`/`deleteTurno()` para que cualquier turno nuevo que el coordinador cree quede guardado ahí también.
- Con un catálogo tan grande, se agregaron buscadores de texto libre (`filtrarTurnos()`, búsqueda por palabras con AND — ej. "7am 8h" encuentra turnos que tengan ambas) en dos lugares: el panel Catálogo de turnos (`#turnos-search`) y el selector de la celda al editar la malla en Revisar y aprobar (`#editor-search` filtra `#editor-select` en vivo vía `filtrarEditorSelect()`).

### Piso de 42h estricto con checklist numérico + horas extra puntuales (Fase 2E — implementado)
La IA (Claude Haiku) no siempre respetaba el piso de 42h cuando la regla era abstracta ("debe alcanzar o superar 42h") — generaba gente en 39h. Se corrigió así:
- `textoPisoHoras(empActivos, horasExtraList, lunesFestivo)` ya NO describe la regla en abstracto: calcula con `calcularMinimoVigente()` la meta EXACTA de cada empleado (ej. "Iván Nieto: 42h netas EXACTAS esta semana") y se la da a la IA como checklist numerado, con instrucción explícita de sumar día por día por persona ANTES de responder. Un número concreto por persona es mucho más confiable para el modelo que una regla general con excepciones.
- **Horas extra puntuales de una sola semana:** en el tab "Configurar" de Generar malla hay un botón "+ Agregar horas extra para alguien" (`agregarHorasExtra()` / `leerHorasExtra()`) — selecciona empleado + cuántas horas extra, y esa semana su meta sube exactamente esa cantidad (`calcularMinimoVigente()` lo suma al piso normal, o al de la excepción de festivo si aplica). No se persiste entre semanas — es una autorización puntual, distinta de `reglas.minHorasSemanales` (que es el piso permanente del empleado).
- `renderMallaReview()` usa la misma `calcularMinimoVigente()` para marcar en rojo (⚠, con tooltip) a cualquier empleado que quede POR DEBAJO de su meta o POR ENCIMA sin horas extra autorizadas — antes solo se marcaba si superaba 44h, nunca si quedaba corto.
- Si la IA sigue sin cumplir la meta exacta para alguien, el coordinador ve la advertencia inmediatamente en la tabla y puede corregir esa celda a mano con el editor inline (ya con buscador, ver arriba).

### Garantía determinística del piso de horas (Fase 2F — implementado)
Se descubrió con una malla real que Claude Haiku detecta correctamente que alguien queda corto de horas (lo reporta en "advertencias") pero no siempre logra corregirlo solo en la misma respuesta — sigue usando turnos estándar de 8h en vez de alargarlos. Además, a veces agrega texto explicativo antes/después del JSON pese a la instrucción de "solo JSON", rompiendo el parseo. Se corrigió con tres capas:
1. **Parseo robusto:** `extraerJSON(raw)` ya no asume que toda la respuesta es JSON puro — busca el primer `{` y su `}` de cierre balanceado, ignorando cualquier prosa alrededor. El prompt también deja explícito que cualquier conflicto debe explicarse DENTRO de `advertencias`, nunca fuera del JSON.
2. **Prompt más táctico:** `textoPisoHoras()` ahora excluye del checklist a los empleados con `horarioFijo.activo` (su horario ya define sus horas, no deben forzarse a "42h exactas") y agrega una instrucción concreta: si un turno de 8h no alcanza, usar uno de 9-10h en vez de dejar a alguien corto.
3. **Corrección determinística (la garantía real):** `aplicarPisoHorasEstricto(data, lunesFestivo, horasExtraList)` corre automáticamente después de cada generación (en `generarMalla()`, después de `normalizarInventario`). Para cada empleado sin horario fijo, ajusta ±1h por día (rotando entre sus días trabajables, nunca toca D/V/F/C/INVENT) hasta que `total_horas` coincida EXACTO con `calcularMinimoVigente()`. Cada cambio queda listado en `advertencias` para que el coordinador vea qué se ajustó. Si no logra cerrar la brecha con los días disponibles (caso extremo), lo deja marcado con ⚠ para revisión manual — pero en la práctica con turnos de hasta 10h en el catálogo esto casi no debería pasar.
- `renderMallaReview()` también deja de marcar como "exceso no autorizado" a quienes tienen horario fijo (antes marcaba en rojo a Álvaro/Cristian por estar en 44-45h, que es su comportamiento normal y esperado).
- Verificado con una malla real que había fallado (JSON con texto extra + 4 personas en 39h + 2 en exceso): tras el fix, las 10 personas quedan en su meta exacta (o su horario fijo normal), parseo sin errores, sin falsos positivos de advertencia.

### Modelo Sonnet 5 + JSON forzado con tool use (Fase 2G — implementado)
Con el checklist numérico (Fase 2F) el modelo (Claude Haiku 4.5) ya diagnosticaba bien las brechas de horas en `advertencias`, pero seguía sin resolverlas — usaba turnos de 8h estándar en vez de alargarlos, y su explicación del conflicto a veces se filtraba fuera del JSON. Dos cambios en `generarConIA()` (`script-sheets.js`):
- **Modelo:** `claude-haiku-4-5-20251001` → `claude-sonnet-5`. Sonnet resuelve mucho mejor la combinación de restricciones simultáneas (rotación + descansos + piso de horas) que Haiku — más caro por generación, pero es una sola llamada por semana.
- **JSON garantizado por schema, no por instrucción de texto:** se define `MALLA_INPUT_SCHEMA` (turnos/día/advertencias/resumen) y se llama a la API con `tools: [{name:'generar_malla', input_schema: MALLA_INPUT_SCHEMA}]` + `tool_choice: {type:'tool', name:'generar_malla'}`. La API de Anthropic fuerza la respuesta a ese esquema a nivel de API — ya no depende de que el modelo "se acuerde" de no agregar prosa. `generarConIA()` devuelve `{ok:true, malla: toolUse.input}` (objeto ya estructurado) en vez de `{ok:true, text: rawText}`.
- `index.html` → `generarMalla()` usa `data.malla` directamente si viene (ya es un objeto, no hace falta `JSON.parse`); si el Apps Script desplegado todavía no tiene esta versión, cae a `data.text` + `extraerJSON()` como antes (compatibilidad hacia atrás durante la transición de despliegue).
- Esto NO reemplaza `aplicarPisoHorasEstricto()` (Fase 2F) — el schema forzado garantiza la FORMA del JSON, no que la aritmética de horas esté bien. La corrección determinística sigue siendo la garantía real del piso de horas.
- **Importante:** este cambio también vive en `script-sheets.js`, así que requiere el mismo paso manual de siempre — pegar el archivo actualizado en Apps Script y reimplementar nueva versión — para quedar activo en producción.

### Rediseño de UI + imagen para WhatsApp (Fase 3 — implementado)
El coordinador NO usa `turnos.html`: cada semana envía la malla por WhatsApp como imagen. Por eso:
- **Diseño:** riel lateral verde pino (`--pine`) con navegación (Inicio, Generar malla, Historial / Empleados, Catálogo de turnos, Google Sheets), tipografías Barlow Condensed + Barlow Semi Condensed (Google Fonts), ámbar `--tape` solo para la acción principal. Los colores de turno (D/V/F/C/INV/WORK) son los mismos de `COLORES` en `script-sheets.js`. `showPanel()` usa `data-panel` en los botones del nav (ya no índices).
- **Imagen para WhatsApp:** `dibujarMallaCanvas()` dibuja la malla en un `<canvas>` (sin librerías) con la semana en el encabezado ("16 al 22 de noviembre" + año), fechas por columna, festivo/inventario marcados, cargos y total de horas opcionales, y convenciones al pie. El diálogo `#share-dialog` permite Compartir (Web Share API con archivo, en celular), Copiar imagen (portapapeles, para pegar en WhatsApp Web) o Descargar PNG. Se abre desde Revisar (`abrirShareActual()`), desde cada semana del Historial y desde Inicio (`abrirShareHistorial(idx)`).
- **Festivos de Colombia:** `festivosColombia(año)` calcula los festivos (fijos, Ley Emiliani y los basados en Pascua). Al cambiar el lunes en Configurar, `onFechaInicioCambiada()` pone el domingo solo y `aplicarDeteccionSemana()` marca festivos, "lunes festivo la semana siguiente" e inventario de fin de mes, con un aviso que el coordinador puede corregir.
- **Revisión:** `mallaCtx` guarda fechas/festivos/inventario de la malla que se está revisando (puede venir del Historial, no del formulario). El editor de celda es un `<dialog id="turno-editor">` con botones rápidos (Descanso, Vacaciones…) y buscador (Enter aplica). Las advertencias de la IA van en un `<details>` plegable.
- **Fixes incluidos:** `diaKeyInventario()` — `#dia-inventario` entrega el nombre del día, no una fecha, así que `normalizarInventario()` antes nunca hacía nada (ahora convierte a INVENT los turnos de ese día, sin tocar D/V/F/C). `upsertHistorialLocal()` evita duplicar una semana al aprobarla dos veces. `autoGuardarMallaPendiente()` usa las fechas de `mallaCtx` (antes podía guardar una malla del historial con las fechas del formulario). La fecha inicial usa hora local (`isoLocal`) en vez de UTC.

### Base de conocimiento aprendida del historial + Sonnet 5.5 (Fase 4 — implementado)
Análisis del 15 de noviembre de 2026 sobre las mallas finales publicadas (hojas "Sem …"): el coordinador tardaba más de una hora corrigiendo cada malla. Causas encontradas y lo que se hizo:

**Causas**
1. `aplicarPisoHorasEstricto()` tenía un error: con totales fraccionarios (un turno hasta las 4:30pm, o "12:01am") nunca llegaba a la meta exacta y, en el intento, alternaba +1h/−1h por los días hasta desfigurar la fila completa (150–220 "ajustes" por semana). Afectaba cada semana a Lorena Lara, Cristian Medina y Álvaro Ramos.
2. Conocimiento desactualizado: notas de empleados viejas en `Config_Empleados` (Oscar "10am-7pm", rotación Manuel/Yesid), reglas con nombres fijos en el prompt (Manuel Corro), horarios fijos de Álvaro/Cristian perdidos al recrear los empleados con otros `id`, y la regla "lunes y sábado nunca tienen almuerzo", que las mallas reales contradicen.
3. `Historial_JSON` con semanas mal fechadas: mallas reabiertas desde Historial se guardaban con la fecha de la semana siguiente, y las generadas de noche con inicio en martes (ambos errores ya corregidos en la Fase 3).

**Qué se hizo en `index.html`**
- `HISTORIAL_FINAL_2026`: las 20 mallas finales reales (25 may – 9 nov 2026) en formato compacto, con las novedades de cada semana. `sanearHistorial()` deja una sola entrada por semana real (toma la semana de la etiqueta de la malla, corrige al lunes, y entre versiones gana la aprobada más tarde). Se aplica en `loadHistorial()` y en `cargarHistorialDesdeSheets()`.
- El prompt (`construirPromptMalla()`) ya no depende solo de reglas escritas a mano: le entrega a la IA las últimas `SEMANAS_EJEMPLO` (6) mallas aprobadas, fila por fila y por persona (`textoHistorialPorPersona()`), más las novedades que el coordinador dio en esas semanas (`textoNovedadesRecientes()`), y si la semana tiene lunes festivo agrega semanas anteriores con lunes festivo. Cada malla que se aprueba alimenta la siguiente generación.
- Orden de prioridad explícito en el prompt: novedades de la semana > reglas estructuradas (horario fijo, días prohibidos, festivo, inventario) > historial reciente > nota de texto del empleado.
- Las reglas que nombran personas (lunes 6am, festivos, rotaciones) solo se incluyen si esa persona sigue activa (`activoLlamado()`); el selector de rotación Manuel/Yesid se oculta si alguno no está.
- `aplicarPisoHorasEstricto()` reescrito: no oscila, completa fracciones de hora, elige el día a ajustar según el historial de la persona (`patronEmpleado()`), no toca los días que la IA marcó como definidos por las novedades (`data.fijados`), máximo 2 h por día y el sábado nunca pasa de 8 h. Deja un renglón de advertencia por persona. `textoPisoHoras()` se eliminó (su contenido está en `construirPromptMalla()`).
- `metaSemana()`: la meta de una persona baja 7 h por cada día V/F/C, y por cada festivo que descansa si tiene desmarcado "El festivo no reduce su mínimo de horas". La usan el ajuste automático y las advertencias de la revisión.
- `prepararMallaGenerada()`: normaliza nombres, recalcula horas desde entrada/salida, asigna códigos del catálogo (los turnos sin código quedan como `T`) y convierte "12:01am" en "12am".
- Paso 2 de Generar: panel "Lo que la IA aprendió de tus mallas aprobadas", y si ya hay una malla con la misma configuración ofrece abrirla o generar una nueva (`generarMalla(true)`). Caché `malla_gen_cache_v2`.

**Qué se hizo en `script-sheets.js`** (requiere pegarlo en Apps Script y reimplementar)
- `MODELO_IA = 'claude-sonnet-5-5'`, `ESFUERZO_IA = 'medium'`, `MAX_TOKENS_IA = 16000`.
- Sonnet 5.5 rechaza `tool_choice` forzado (error 400), así que el JSON garantizado ahora se pide con `output_config.format` (JSON Schema, `MALLA_OUTPUT_SCHEMA`). El esquema es compacto: cada día es un texto ("8am-5pm+alm", "D", "INV 6am-1pm") y `expandirMallaCompacta()` lo convierte al formato de siempre; las horas las calcula el script, no el modelo. El razonamiento del modelo va activado por defecto.
- Maneja `stop_reason` `refusal` y `max_tokens` con mensajes claros. `testGenerarMalla()` prueba la llamada completa desde el editor y registra cuánto tarda — ejecutarla antes de implementar una versión nueva.
- `calcHorasNetas()` ahora entiende horas con minutos.

**Prueba retrospectiva** (3 semanas pasadas, generando con solo lo que se sabía antes de cada una y comparando con la malla final aprobada): celdas idénticas a la final 20% con el flujo anterior → 40–44% con el nuevo; misma hora de entrada 48% → 70–72%. Hecha con un modelo Sonnet sustituto, no contra el Apps Script real.

## Arquitectura de turnos.html
- Página pública sin login, solo lectura
- Llama al Apps Script con ?action=getMallas para obtener todas las hojas publicadas
- Muestra última semana por defecto con navegación por flechas e historial en tarjetas
- Buscador de empleado por nombre
- turnoCell(): convierte valores del Sheets a visualización entrada→salida+almuerzo

## Flujo semanal
Viernes/sábado → coordinador abre index.html → genera malla con IA → revisa y edita celdas si necesita → aprueba → Apps Script escribe hoja nueva en Sheets → empleados ven en turnos.html

## Convención de commits
Usar mensajes descriptivos en español: "fix: corrige bug X", "feat: agrega funcionalidad Y", "style: mejora visual Z"

## Lo que NO debes cambiar sin preguntar
- La URL del Apps Script (es un endpoint desplegado)
- El ID del Google Sheets
- La estructura de HISTORIAL_PRELOADED (son datos históricos reales)
- El modelo de IA usado en `generarConIA()` (Apps Script, constante `MODELO_IA`) — actualmente `claude-sonnet-5-5` (cambiado desde `claude-sonnet-5` por pedido explícito del usuario el 15 de noviembre de 2026, ver Fase 4). Cambiar el modelo otra vez sí requiere preguntar primero — impacta costo por generación, y cada modelo tiene requisitos distintos en la petición.
- `HISTORIAL_FINAL_2026` (son las mallas finales reales de 2026).

## Archivo script-sheets.js
Ubicación: /malla-de-turnos/script-sheets.js
Este archivo NO se ejecuta localmente. Es el código fuente del Google Apps Script
desplegado en el Sheets de El Buen Gusto, versionado aquí para trazabilidad.

### Cómo aplicar cambios
1. Editar script-sheets.js en VS Code
2. Hacer commit y push (para dejar registro)
3. Copiar el contenido manualmente en:
   Google Sheets → Extensiones → Apps Script
4. Guardar y re-implementar:
   Implementar → Administrar implementaciones → ícono lápiz → Nueva versión → Implementar
5. La URL del endpoint NO cambia entre versiones

### Qué hace este script
- doGet(): responde peticiones GET — acciones getMallas y getMalla (para turnos.html)
- doPost(): responde peticiones POST — acciones escribirMalla y ping (para index.html)
- escribirMalla(): recibe JSON con la malla aprobada y crea una hoja nueva en el Sheets
  con formato, colores por tipo de turno, anchos de columna y sección de convenciones
- getMallas(): lee todas las hojas con prefijo "Sem " y devuelve lista para turnos.html
- getMallaDetalle(): devuelve el detalle completo de una hoja específica
- respuesta(): helper que serializa cualquier objeto a JSON para el cliente

### Constantes críticas en el script
- SHEET_ID: '16LkvSU6xDM6yvaTgbmUaOcSsGrAppBAL0RHpSMcsj7w'
- Endpoint desplegado: https://script.google.com/macros/s/AKfycbxX9LaIAcbNFhMLWdxZDDY7dY80j8aAupf8DpRVqoK2E6OkIXo6-l2ujbC7uXpqUWg5/exec
- Esta URL NO cambia aunque se re-implemente con nueva versión

### Colores de convención (definidos en COLORES)
- D (Descanso): fondo #F1EFE8, texto #5F5E5A
- V (Vacaciones): fondo #E6F1FB, texto #185FA5
- F (Día familia): fondo #FAEEDA, texto #854F0B
- C (Compensatorio): fondo #EEEDFE, texto #3C3489
- INV (Inventario): fondo #FCEBEB, texto #A32D2D
- WORK (turno laboral): fondo #E1F5EE, texto #085041

### Importante
- El script corre en el contexto de Google Apps Script (no Node, no browser)
- No uses fetch(), require() ni APIs de browser — solo SpreadsheetApp, Logger, ContentService
- Cada vez que escribirMalla() se llama, elimina y recrea la hoja si ya existe (idempotente)
- Las hojas de empleados empiezan en la fila 6 (filas 1-5 son título, semana, notas, vacía, encabezado)
