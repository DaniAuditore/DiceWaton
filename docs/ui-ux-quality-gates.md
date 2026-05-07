# UI/UX Quality Gates — DiceWaton

## Objetivo
Definir criterios de aceptación finales para UI/UX sin romper comportamiento funcional existente.

## 1) Accesibilidad (WCAG 2.2 AA baseline)
- Formularios con `label` asociado por `htmlFor/id`.
- Errores con relación semántica (`aria-describedby`) y feedback visible.
- Estados críticos anunciados con `role="alert"` o `role="status"` según corresponda.
- Navegación por teclado operable en Auth, Host y Controller.
- Gate automatizado: pruebas `vitest-axe` sin violaciones críticas.

## 2) Consistencia de microcopy (ES)
- CTA y estados en español consistente:
  - Host: "Crear sala", "PIN de sala", "Jugadores", "Actividad de juego".
  - Controller: "Unirse a sala", "Unirse a la sala", "Conectado a la sala", "Cerrar sesión".
  - Macros: "Mis macros", "Agregar", "Editar", "Guardar", "Cancelar", "Eliminar macro".
  - Log: "Últimas tiradas", "No hay tiradas todavía".
- Errores accionables, sin mensajes silenciosos.

## 3) Estados de interacción
- `loading`, `success`, `error`, `empty`, `offline` visibles en UI cuando aplica.
- Toda operación fallida (auth/join/create/macro) muestra feedback visible y recuperable.
- El contexto del usuario se preserva cuando hay sesión válida.

## 4) Navegación y resiliencia
- Ruta inválida muestra 404 accesible con acción clara de retorno.
- Sin dead ends por deep-link/back en flujos principales.

## 5) Baseline PWA
- Manifest válido (`name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, íconos).
- Metadata en `index.html` para installability.
- Registro de SW con actualización no disruptiva y señalización offline.

## 6) Performance segura (sin cambios funcionales)
- Memoización en hotspots de render (`HostView`, `ControllerView`, `DiceLog`, `MacroManager`).
- Selectores/derivados memoizados donde reduce renders evitables.
- Sin alterar lógica de dominio realtime/supabase.

## Validación mínima requerida
- `npm test`
- `npx playwright test tests/game-flow.spec.ts`
