# Pendientes de conformidad spec ↔ implementación

Lista viva de desajustes detectados en el repaso de 2026-07-26 contra las specs de
`../../stxt-web/es/` (STXT-SPEC, STXT-SCHEMA-SPEC, STXT-TEMPLATE-SPEC). Los puntos
resueltos se eliminan de aquí (histórico en CHANGELOG.md, versión 0.4.1).

En cada punto hay que decidir primero si manda la spec o se cambia la spec.

## Núcleo (`src/core`)

(sin pendientes; los puntos 1 y 2 se resolvieron en 0.4.3)

## Schemas (`src/schema`)

3. **`Children` en tipos hoja no es error de carga** — STXT-SCHEMA-SPEC error 13.5:
   declarar `Children` en un `Node` de tipo que no admite hijos (todo salvo `INLINE` y
   `GROUP`) debe invalidar el schema. Hoy carga sin quejas (`SchemaParser.createFrom`).
   Equivalente en templates: error 13.9 (nodo con hijos y tipo hoja), tampoco se valida.
4. **`HEXADECIMAL` no sigue la spec** — STXT-SCHEMA-SPEC 9.5 define `[0-9A-Fa-f]+`;
   la implementación (`type/HEXADECIMAL.ts`, portada de Java) exige longitud par y
   acepta prefijo `#`. Decidir: ¿spec o código? (la longitud par tiene sentido si el
   tipo representa bytes; el `#` parece herencia de colores CSS).
5. **Formas del valor lenientes** — los tipos inline-only (`NUMBER`, `DATE`, `BOOLEAN`,
   `EMAIL`… vía `regexType` con `getText()`) aceptan también la forma bloque `>>`;
   `BLOCK` acepta un nodo inline vacío (`Nodo:`) y no exige la forma `>>`.
   STXT-SCHEMA-SPEC 9.2–9.4 fija la "forma del valor" por tipo.
6. **Meta-schema embebido vs spec 15.2** — en `SchemaProviderMeta` el nodo `Values` no
   lleva `Type: GROUP` (en la spec sí), con lo que `Values: texto` pasaría la meta-validación.

## Templates (`src/template`)

7. **Cross-namespace y referencias ignoran cosas en silencio** — STXT-TEMPLATE-SPEC
   errores 13.13 y 13.15: en una línea cross-namespace se rechaza el tipo pero los
   valores `[a, b]` y los hijos se ignoran sin error; los hijos colgando de una
   referencia `@Nodo` también se ignoran sin error (`TemplateParser.addToSchema`).

## Documentación

8. **CLAUDE.md desfasado** — describe `freeze()` en `core/Node.ts` y ese método ya no
   existe (el nodo es mutable tras el parseo). Actualizar la sección de arquitectura.

## Fuera de este repositorio (requiere tocar `stxt-web`, solo lectura desde aquí)

9. **Template con referencia sin acento** — con la normalización nueva (STXT-SPEC 4.3,
   sensible a acentos, 0.4.3) el fichero
   `../../stxt-web/.stxt/templates/com.example.dokumentando.documento.stxt` línea 16
   (`Título: (1) @Titulo`) ya no carga: la referencia debe ser `@Título`. Corregirlo
   en `stxt-web`. El resto de schemas/templates y todos los documentos de `docs/` y
   `es/` siguen validando sin cambios.
