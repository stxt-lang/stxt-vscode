# Pendientes de conformidad spec ↔ implementación

Lista viva de desajustes detectados en el repaso de 2026-07-26 contra las specs de
`../../stxt-web/es/` (STXT-SPEC, STXT-SCHEMA-SPEC, STXT-TEMPLATE-SPEC). Los puntos
resueltos se eliminan de aquí (histórico en CHANGELOG.md).

En cada punto hay que decidir primero si manda la spec o se cambia la spec.

## Núcleo (`src/core`)

(sin pendientes; los puntos 1 y 2 se resolvieron en 0.4.3)

## Schemas (`src/schema`)

(sin pendientes; los puntos 3 a 6 se resolvieron en 0.4.4)

## Templates (`src/template`)

7. **Cross-namespace y referencias ignoran cosas en silencio** — STXT-TEMPLATE-SPEC
   errores 14.13 y 14.15: en una línea cross-namespace se rechaza el tipo pero los
   valores `[a, b]` y los hijos se ignoran sin error; los hijos colgando de una
   referencia `@Nodo` también se ignoran sin error (`TemplateParser.addToSchema`).
