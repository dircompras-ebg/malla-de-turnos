Eres el asistente de desarrollo del proyecto "Malla de Turnos — El Buen Gusto".

## Contexto del proyecto
Sistema web de gestión de turnos del Departamento de Abastecimiento de El Buen Gusto. Reemplaza un Excel manual desorganizado. Está publicado en GitHub Pages y conectado a Google Sheets via Apps Script.

## Estructura del repositorio
E:\Carpeta 2023\Documents\EBG-Develop\
├── index.html         → App de gestión (solo para el coordinador)
├── turnos.html        → Vista pública de empleados (solo lectura)
├── styles.css         → Estilos del coordinador (index.html) — incluye responsive ≤768px y ≤480px
├── turnos.css         → Estilos de la vista empleados (turnos.html) — incluye responsive ≤600px y ≤380px
└── (no hay build, no hay framework, todo es HTML/CSS/JS vanilla)

## URLs en producción
- App coordinador: https://dircompras-ebg.github.io/malla-de-turnos/
- Vista empleados: https://dircompras-ebg.github.io/malla-de-turnos/turnos.html
- Google Sheets: https://docs.google.com/spreadsheets/d/16LkvSU6xDM6yvaTgbmUaOcSsGrAppBAL0RHpSMcsj7w/edit
- Apps Script URL: https://script.google.com/macros/s/AKfycbxX9LaIAcbNFhMLWdxZDDY7dY80j8aAupf8DpRVqoK2E6OkIXo6-l2ujbC7uXpqUWg5/exec

## Stack técnico
- HTML/CSS/JS vanilla — sin frameworks, sin build tools, sin npm
- localStorage para persistencia en el navegador del coordinador
- Anthropic API (claude-haiku-4-5-20251001) como proxy en Apps Script para generar mallas con IA
- Google Apps Script como backend/API que escribe en Google Sheets
- GitHub Pages como hosting estático

## Empleados activos
1. Álvaro Ramos — Coordinador/Supervisor
2. Iván Nieto — Auxiliar logístico
3. Fabián Cárdenas — Auxiliar logístico
4. Yesid Moreno — Auxiliar logístico
5. Cristian Medina — Lider Procesados
6. Manuel Corro — Auxiliar logístico
7. Oscar Sosa — Conductor
8. Lorena Lara - Analista de compras 
9. Laura Garcia - Operaria Procesados 
10. Nohemy - Operaria Procesados 

## Reglas de negocio
- Máximo 42 horas laborales semanales por empleado (almuerzo NO cuenta)
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
- EMPLEADOS_DEFAULT: lista base de empleados con cargo y regla especial
- HISTORIAL_PRELOADED: 23 semanas históricas del Excel original (nov 2025 - abr 2026)
- loadHistorial() fusiona HISTORIAL_PRELOADED con localStorage para no perder datos nuevos
- generarMalla(): llama a la Anthropic API con todas las reglas y devuelve JSON
- renderMallaReview(): tabla editable con clic en celda para cambiar turno inline
- aprobarMalla(): envía al Apps Script via POST y guarda en localStorage

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
- El modelo de IA usado (claude-haiku-4-5-20251001 en el Apps Script)

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
