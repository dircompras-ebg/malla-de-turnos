# Plan de Migración — Malla de Turnos a Angular + Firebase
**Proyecto:** Malla de Turnos · Departamento de Abastecimiento · El Buen Gusto  
**Estado actual:** Vanilla HTML/CSS/JS en GitHub Pages  
**Destino:** Angular 17+ SPA + Firebase (Firestore + Hosting + Cloud Functions)  
**Fecha de redacción:** Mayo 2026

---

## Contexto del proyecto actual

Sistema web de gestión de turnos que reemplaza un Excel manual. El coordinador genera la malla semanal con IA (Claude Haiku via Apps Script) y los empleados la consultan en una vista pública. Actualmente desplegado en GitHub Pages.

**Archivos actuales a migrar:**
- `index.html` → Panel del coordinador (lógica principal)
- `turnos.html` → Vista pública de empleados
- `styles.css` / `turnos.css` → Estilos
- `script-sheets.js` → Google Apps Script (backend: proxy IA + escritura en Sheets)

**URLs actuales:**
- App coordinador: `https://dircompras-ebg.github.io/malla-de-turnos/`
- Vista empleados: `https://dircompras-ebg.github.io/malla-de-turnos/turnos.html`
- Google Sheets: `https://docs.google.com/spreadsheets/d/16LkvSU6xDM6yvaTgbmUaOcSsGrAppBAL0RHpSMcsj7w/edit`

---

## Decisiones arquitectónicas tomadas

### Base de datos: Firebase Firestore (no Supabase)
**Razón de peso:** Supabase free tier pausa proyectos tras 7 días de inactividad en la BD.  
Para una herramienta de uso semanal (no diario), el proyecto dormiría constantemente.  
Firebase Firestore **nunca se pausa**, tier gratuito incluye 50k lecturas/día y 20k escrituras/día.

### Hosting: Firebase Hosting (reemplaza GitHub Pages)
- CDN global, HTTPS automático, preview deployments por branch
- Dominio inicial: `malla-turnos.web.app` (configurable con dominio propio gratis)
- Deploy con un solo comando: `firebase deploy`

### Proxy de IA: Firebase Cloud Functions (reemplaza Apps Script)
- La `ANTHROPIC_API_KEY` vive en Firebase Secrets (más seguro)
- Sin cold start relevante para este volumen de uso
- Elimina la dependencia de Google Apps Script para la IA
- **Google Sheets se mantiene** como destino de publicación para que los empleados sin acceso digital consulten la malla impresa

### Frontend: Angular 17+ standalone + Angular Material
- Sin NgModules (standalone components)
- Angular Signals para estado reactivo
- Angular CDK Overlays para el editor de celda
- Angular Material Stepper para el flujo de generación

### Stack completo elegido
```
Angular 17+          → framework frontend
AngularFire          → SDK oficial Firebase para Angular
Angular Material     → UI components
Firebase Firestore   → base de datos (mallas, empleados, config)
Firebase Auth        → autenticación coordinador (Google Sign-In)
Firebase Hosting     → hosting estático + CDN
Firebase Cloud Fns   → proxy Anthropic API
SheetJS (xlsx)       → exportar mallas a Excel (client-side, gratis)
```

---

## Arquitectura final

```
┌─────────────────────────────────────────────────────────────────┐
│  Firebase Hosting                                               │
│  Angular 17+ SPA                                                │
│                                                                 │
│  /              → Panel coordinador (Auth guard)                │
│  /turnos        → Vista empleados (pública, sin auth)           │
└────────────┬──────────────────┬───────────────────────────────-┘
             │                  │
             ▼                  ▼
   ┌──────────────────┐  ┌──────────────────────────────────────┐
   │ Cloud Functions  │  │ Firebase Firestore                    │
   │                  │  │                                      │
   │ generarMalla()   │  │  /mallas/{id}                        │
   │  → Anthropic API │  │    semana_label    : string          │
   │  → devuelve JSON │  │    fecha_inicio    : string (ISO)    │
   │                  │  │    fecha_fin       : string (ISO)    │
   │ ANTHROPIC_API_KEY│  │    datos           : object (JSON)   │
   │ en Firebase      │  │    aprobada_en     : timestamp       │
   │ Secrets          │  │    notas           : string          │
   │                  │  │    created_at      : timestamp       │
   └──────────────────┘  │                                      │
                         │  /empleados/{id}                     │
                         │    nombre    : string                │
                         │    cargo     : string                │
                         │    estado    : 'Activo'|'Vacante'    │
                         │    entrada   : string                │
                         │    salida    : string                │
                         │    regla     : string                │
                         │    orden     : number                │
                         │                                      │
                         │  /config/general                     │
                         │    rot_manuel_yesid : 'A'|'B'        │
                         │    rot_ivan_fabian  : 'A'|'B'        │
                         └──────────────────────────────────────┘
```

---

## Estructura del proyecto Angular

```
malla-turnos/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── malla.service.ts       ← CRUD Firestore mallas
│   │   │   │   ├── empleados.service.ts   ← CRUD Firestore empleados
│   │   │   │   └── ia.service.ts          ← llama a Cloud Function
│   │   │   └── guards/
│   │   │       └── auth.guard.ts
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   │   └── dashboard.component.ts
│   │   │   ├── generar/
│   │   │   │   ├── generar.component.ts   ← stepper principal
│   │   │   │   ├── step-config/           ← paso 1: fechas, rotaciones, festivos
│   │   │   │   ├── step-generar/          ← paso 2: botón IA + spinner
│   │   │   │   └── step-revisar/          ← paso 3: grid editable + aprobar
│   │   │   ├── historial/
│   │   │   │   └── historial.component.ts
│   │   │   ├── empleados/
│   │   │   │   └── empleados.component.ts
│   │   │   └── turnos-public/
│   │   │       └── turnos-public.component.ts  ← vista empleados (sin auth)
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── shift-grid/            ← tabla de turnos reutilizable
│   │   │   │   │   └── shift-grid.component.ts
│   │   │   │   └── shift-cell-editor/     ← overlay editor de celda
│   │   │   │       └── shift-cell-editor.component.ts
│   │   │   ├── models/
│   │   │   │   ├── malla.model.ts
│   │   │   │   └── empleado.model.ts
│   │   │   └── pipes/
│   │   │       └── horas-netas.pipe.ts
│   │   └── app.routes.ts
│   ├── environments/
│   │   ├── environment.ts               ← Firebase config dev
│   │   └── environment.prod.ts          ← Firebase config prod
│   └── main.ts
├── functions/
│   ├── src/
│   │   └── index.ts                     ← Cloud Function proxy Anthropic
│   ├── package.json
│   └── tsconfig.json
├── firebase.json
├── .firebaserc
├── angular.json
└── CLAUDE.md                            ← actualizar con nueva arquitectura
```

---

## Fase 0 — Setup e infraestructura (ejecutar primero)

### 0.1 Crear proyecto Firebase
1. Ir a `console.firebase.google.com`
2. Crear nuevo proyecto: `malla-turnos-ebg` (o el nombre que prefieras)
3. Habilitar los siguientes servicios:
   - **Firestore Database** → modo producción → región `us-central1`
   - **Authentication** → habilitar proveedor Google
   - **Hosting** → configuración por defecto
   - **Functions** → requiere plan Blaze (pay-as-you-go), pero tiene free tier generoso (2M invocaciones/mes gratis). Agregar tarjeta de crédito es obligatorio pero el costo real es $0 para este volumen.

### 0.2 Inicializar el proyecto Angular
```bash
# Crear proyecto Angular
ng new malla-turnos --standalone --routing --style=scss

cd malla-turnos

# Agregar Firebase
ng add @angular/fire
# Seleccionar: Firestore, Authentication, Hosting, Functions

# Agregar Angular Material
ng add @angular/material
# Tema: Custom — usar los colores del diseño actual (#1a1a1a, #E1F5EE, etc.)

# Dependencias adicionales
npm install xlsx                   # exportar Excel
npm install date-fns               # manejo de fechas en español

# Herramientas Firebase CLI
npm install -g firebase-tools
firebase login
firebase init                      # seleccionar Hosting + Functions + Firestore
```

### 0.3 Configurar environments
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  firebase: {
    apiKey: "...",            // desde Firebase Console → Project Settings
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  },
  functionsUrl: "http://localhost:5001/malla-turnos-ebg/us-central1"
};
```

### 0.4 Firestore Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Mallas: lectura pública, escritura solo coordinador autenticado
    match /mallas/{mallaId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Empleados: lectura pública, escritura solo autenticado
    match /empleados/{empleadoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Config: lectura pública, escritura solo autenticado
    match /config/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Fase 1 — Cloud Function: proxy Anthropic (reemplaza Apps Script)

```typescript
// functions/src/index.ts
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as https from 'https';

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

export const generarMalla = onRequest(
  { secrets: [anthropicKey], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    const { prompt } = req.body;
    if (!prompt) { res.status(400).json({ ok: false, error: 'prompt requerido' }); return; }

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    // Llamada a Anthropic
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey.value(),
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const data = await new Promise<string>((resolve, reject) => {
      const apiReq = https.request(options, (apiRes) => {
        let raw = '';
        apiRes.on('data', chunk => raw += chunk);
        apiRes.on('end', () => resolve(raw));
      });
      apiReq.on('error', reject);
      apiReq.write(body);
      apiReq.end();
    });

    const parsed = JSON.parse(data);
    if (parsed.error) {
      res.json({ ok: false, error: JSON.stringify(parsed.error) });
      return;
    }
    const text = parsed.content?.[0]?.text ?? '';
    res.json({ ok: true, text });
  }
);
```

**Configurar la API key en Firebase Secrets:**
```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
# pegar la clave cuando lo pida
```

**Deploy:**
```bash
firebase deploy --only functions
```

---

## Fase 2 — Migración de datos (seed a Firestore)

Crear un script de migración de una sola vez que tome el `HISTORIAL_PRELOADED` del `index.html` actual y lo suba a Firestore como documentos en la colección `mallas`.

**Estructura de cada documento en `/mallas/{id}`:**
```typescript
interface Malla {
  id?: string;
  semana_label: string;      // "26 May – 1 Jun 2026"
  fecha_inicio: string;      // "2026-05-26"
  fecha_fin: string;         // "2026-06-01"
  datos: {                   // el JSON completo tal como lo genera la IA
    semana: string;
    turnos: Record<string, Record<string, TurnoDia>>;
    advertencias: string[];
    resumen: string;
  };
  aprobada_en: Timestamp;
  notas: string;
  created_at: Timestamp;
}
```

**Empleados iniciales a cargar en `/empleados`:**
```
1. Álvaro Ramos      — Coordinador/Supervisor — Activo
2. Iván Nieto        — Auxiliar logístico     — Activo
3. Fabián Cárdenas   — Auxiliar logístico     — Activo
4. Yesid Moreno      — Auxiliar logístico     — Activo
5. Segundo Briceño   — Auxiliar logístico     — Activo
6. Cristian Medina   — Auxiliar logístico     — Activo
7. Manuel Corro      — Auxiliar logístico     — Activo
8. Oscar Sosa        — Conductor              — Activo
9. Vacante           — Analista de compras    — Vacante
```

---

## Fase 3 — UX del generador (el cambio más importante)

### Eliminar completamente el "Catálogo de turnos"
No más panel de creación de turnos. El coordinador edita hora de entrada y salida directamente en la celda.

### Flujo con Angular Material Stepper
```
[Paso 1: Configurar]  →  [Paso 2: Generar]  →  [Paso 3: Revisar]  →  [Aprobar]
```

**Paso 1 — Configurar:**
- Fecha inicio / fin (datepicker de Angular Material)
- Chips clickeables para días festivos (Lun · Mar · Mié · Jue · Vie · Sáb)
- Select de rotación Manuel/Yesid
- Select de rotación Iván/Fabián
- Toggle de semana de inventario + selector de día
- Campo de notas libres

**Paso 2 — Generar:**
- Botón "Generar con IA" → spinner → resultado directo en el grid
- Caché en Firestore por semana (no solo localStorage): si la malla ya existe para esa semana y configuración, se carga sin gastar tokens
- Si hay error de JSON: muestra respuesta raw para diagnóstico

**Paso 3 — Revisar y aprobar:**
- Grid de turnos editable
- Al hacer clic en cualquier celda → CDK Overlay con:
  ```
  ┌──────────────────────────────────────────┐
  │  Yesid Moreno — Lunes                    │
  │  ─────────────────────────────────────── │
  │  Entrada  [06:00]    Salida  [14:00]      │
  │  [ ] Incluye almuerzo                    │
  │                                          │
  │  O código especial:                      │
  │  [D] [V] [F] [C] [INVENT] [+ Nuevo]     │
  │                                          │
  │  [Aplicar]  [Cancelar]                   │
  └──────────────────────────────────────────┘
  ```
- Total de horas se recalcula automáticamente al editar (sin depender del campo `horas` de la IA)
- Indicador visual de columna de inventario (encabezado oscuro + viñeta roja "INVENTARIO")
- Al aprobar: guarda en Firestore + escribe en Google Sheets (mantener compatibilidad) + opción exportar Excel

---

## Fase 4 — Vista pública `/turnos`

- Ruta Angular sin auth guard
- Lee de Firestore en **tiempo real** (AngularFire `collectionData`)
- Cuando el coordinador aprueba, los empleados ven la malla **instantáneamente sin recargar**
- Buscador reactivo de empleado (Angular Signals)
- Navegación entre semanas históricas
- Historial de semanas en cards clickeables
- Responsive mobile-first (misma experiencia que `turnos.html` actual)

---

## Fase 5 — Autenticación coordinador

```typescript
// core/guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return authState(auth).pipe(
    map(user => user ? true : router.createUrlTree(['/login']))
  );
};
```

- Pantalla de login minimalista: un botón "Continuar con Google"
- El email del coordinador es el único autorizado (validar en Firestore rules por `request.auth.token.email`)
- Los empleados acceden a `/turnos` sin login

---

## Reglas de negocio del generador (incorporar en el prompt de IA)

Todas las siguientes reglas deben estar en el `IAService` que construye el prompt:

### Reglas base
- Máximo 44 horas laborales semanales (almuerzo NO cuenta)
- Almuerzo de martes a viernes (1h, no contabilizada)
- Lunes y sábado sin almuerzo
- Domingo: descanso para todos

### Rotaciones semanales
- Manuel Corro ↔ Yesid Moreno: semana A (Manuel 8am-5pm / Yesid 9am-6pm) o semana B (invertido)
- Iván Nieto ↔ Fabián Cárdenas: martes y jueves 7am, alternando semanas

### Horarios fijos especiales
- **Cristian Medina**: lun-vie 8am-5pm, sábado 8am-12pm. **EXCEPTO jueves: 12am-8am S/A**
- **Álvaro Ramos**: lun 7am-4pm S/A · mar 7am-4pm +alm · mié 2:30am-10:30am S/A · jue 12am-8am S/A · vie 7am-4pm +alm · sáb 8am-12pm S/A

### Reglas de lunes (día normal sin festivo)
- Manuel Corro y Yesid Moreno: 6am-2pm SIN almuerzo (8h netas)
- Oscar Sosa: 7am-3pm SIN almuerzo (8h netas)

### Reglas de días festivos
- Manuel Corro y Yesid Moreno: 4am-12pm S/A (8h netas)
- Oscar Sosa: 5am-1pm S/A (8h netas)
- Fabián Cárdenas o Iván Nieto (según rotación): 6am-1pm S/A (7h netas)

### Reglas del día siguiente a un festivo
- Manuel Corro y Yesid Moreno: entran 7am (horario normal de ese día)
- Oscar Sosa: entra 8am (horario normal de ese día)

### Día de inventario (último día del mes)
- Todos los empleados: código `INVENT`, entrada 6am, salida 1pm, 7h S/A
- Puede ser cualquier día de la semana (no solo sábado)
- Se muestra visualmente con columna especial en el grid

---

## Roadmap de automatizaciones futuras (post-migración)

Una vez estabilizada la migración, estas extensiones son naturales sobre la misma base:

| Prioridad | Módulo | Descripción | Tecnología |
|-----------|--------|-------------|------------|
| Alta | **Notificación de malla publicada** | Push notification a empleados cuando se aprueba | Firebase Cloud Messaging |
| Alta | **Recordatorio semanal** | Aviso al coordinador cada viernes 3pm para generar la malla | Firebase Scheduled Functions |
| Media | **Alerta horas extra** | Notificación si alguien supera 44h al aprobar | Firestore trigger function |
| Media | **Gestión de vacaciones** | Módulo de solicitudes + aprobación | Angular + Firestore |
| Media | **Resumen mensual** | IA genera PDF/Excel con estadísticas del mes | Cloud Function + SheetJS |
| Baja | **Dashboard ejecutivo** | Gráficas de cumplimiento, rotación, asistencia | Angular + Chart.js o D3 |
| Baja | **Integración nómina** | Exportar horas al formato del sistema de nómina | Cloud Function |

---

## Comandos clave de referencia

```bash
# Desarrollo local
ng serve                          # Angular en localhost:4200
firebase emulators:start          # Emuladores Firestore + Functions + Auth locales

# Deploy
ng build --configuration=production
firebase deploy                   # despliega Hosting + Functions + Firestore rules

# Solo frontend
firebase deploy --only hosting

# Solo functions
firebase deploy --only functions

# Ver logs de Cloud Functions
firebase functions:log

# Gestionar secrets
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:access ANTHROPIC_API_KEY
```

---

## Checklist de ejecución

### Setup (Fase 0)
- [ ] Crear proyecto Firebase con plan Blaze (gratuito en práctica)
- [ ] Habilitar Firestore, Auth, Hosting, Functions
- [ ] `ng new malla-turnos --standalone --routing --style=scss`
- [ ] `ng add @angular/fire` + `ng add @angular/material`
- [ ] Configurar `environments/` con Firebase config
- [ ] `firebase init` + configurar `firebase.json`
- [ ] Primer deploy vacío a Firebase Hosting (verificar URL)
- [ ] Configurar Firestore rules

### Cloud Function (Fase 1)
- [ ] Crear `functions/src/index.ts` con proxy Anthropic
- [ ] `firebase functions:secrets:set ANTHROPIC_API_KEY`
- [ ] `firebase deploy --only functions`
- [ ] Probar endpoint con Postman o Thunder Client
- [ ] Actualizar URL en `IAService` del Angular app

### Datos (Fase 2)
- [ ] Crear script de migración de `HISTORIAL_PRELOADED` → Firestore
- [ ] Ejecutar migración y verificar en consola Firebase
- [ ] Cargar empleados iniciales en colección `/empleados`
- [ ] Cargar config inicial en `/config/general`

### Features (Fases 3-5)
- [ ] `MallaService` + `EmpleadosService` + `IAService`
- [ ] Componente `ShiftGridComponent` (reutilizable)
- [ ] Componente `ShiftCellEditorComponent` (CDK Overlay)
- [ ] Panel coordinador: Dashboard + Generar + Historial + Empleados
- [ ] Vista pública `/turnos`
- [ ] Auth guard + pantalla de login

### Cierre
- [ ] Actualizar `CLAUDE.md` con nueva arquitectura
- [ ] Verificar que Google Sheets sigue recibiendo mallas aprobadas
- [ ] Probar flujo completo: Configurar → Generar → Revisar → Aprobar → Sheets + Firestore
- [ ] Probar vista `/turnos` en móvil
- [ ] Comunicar nueva URL a los empleados

---

## Notas para Claude Code al ejecutar este plan

- Leer el `CLAUDE.md` del proyecto para contexto de negocio antes de empezar
- Los empleados y reglas de negocio están documentados en `CLAUDE.md`
- El `script-sheets.js` contiene la lógica actual del Apps Script — usar como referencia para la Cloud Function
- El `index.html` actual contiene toda la lógica JS a migrar — leer completo antes de diseñar los servicios Angular
- La función `parsearHorasNetas()` del `index.html` debe replicarse en Angular como pipe y en la Cloud Function
- La función `normalizarInventario()` del `index.html` debe estar en el `IAService`
- El caché de mallas generadas debe persistir en Firestore (no solo localStorage) para que funcione en cualquier dispositivo del coordinador
- Mantener compatibilidad con Google Sheets: `aprobarMalla()` debe seguir llamando al Apps Script para escribir la hoja, además de guardar en Firestore
