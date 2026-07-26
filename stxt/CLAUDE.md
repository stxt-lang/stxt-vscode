# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

## Qué es este repositorio

Extensión de Visual Studio Code para el lenguaje **STXT (Semantic Text)** (`.stxt`), publicada en el Marketplace como `stxt-lang.stxt`. Contiene dos cosas mezcladas en `src/`:

1. Una **implementación completa del lenguaje en TypeScript** (parser, schemas, templates, tipos, writer) sin ninguna dependencia de `vscode`.
2. Una **capa de integración con VS Code** que consume esa implementación para dar diagnósticos, semantic tokens, hover, autocompletado y formateo.

La raíz del repositorio git es el directorio padre (`stxt-vscode/`); el proyecto de la extensión vive en `stxt/`, que es donde se trabaja siempre.

## Especificación del lenguaje: proyecto hermano `../../stxt-web`

**`../../stxt-web` es la fuente normativa del lenguaje y se consulta en solo lectura.** No modificar nada ahí desde este repositorio.

Las tres especificaciones están en `../../stxt-web/es/` (versión canónica; espejo en inglés en `en/`):

- **`es/stxt-core-ref.stxt`** (*STXT-SPEC*) — sintaxis base: nodos inline `Nombre: valor` y bloques `Nombre >>`, indentación, namespaces `(a.b.c)`, comentarios `#`, normalización de nombres/valores, códigos de error.
- **`es/stxt-schema-ref.stxt`** (*STXT-SCHEMA-SPEC*) — `@stxt.schema`: `Node`/`Children`/`Child`, tipos, `Min`/`Max`, y el meta-schema oficial.
- **`es/stxt-template-ref.stxt`** (*STXT-TEMPLATE-SPEC*) — `@stxt.template`: `Structure >>`, cardinalidades `(1)`, `(?)`, `(*)`, `(+)`, `(min,max)`, `ENUM [a, b, c]`, referencias `@Nombre`.

Ante cualquier duda sobre comportamiento correcto del parser, validador o formateador, **la spec manda sobre el código**. Antes de "arreglar" algo, comprobar qué dice la spec. `../../stxt-web/docs/` y `../../stxt-web/.stxt/` tienen documentos y schemas reales que sirven de banco de pruebas manual.

Existen otras implementaciones hermanas del mismo lenguaje (`../../stxt-java`, `../../stxt-js`, `../../stxt-python`). El código de `src/core`, `src/schema` y `src/template` es un port casi literal de la versión Java (quedan comentarios que lo mencionan). Si hay que resolver una ambigüedad de comportamiento, comparar con `../../stxt-java` es útil, pero la spec sigue mandando.

## Trabajo en curso

`PENDIENTES.md` (en esta carpeta) es la lista viva de desajustes conocidos entre las specs y la implementación, con su estado. Consultarla antes de emprender trabajo de conformidad y mantenerla al día (los puntos resueltos se eliminan y se anotan en `CHANGELOG.md`).

## Comandos

```bash
npm run compile      # tsc -p ./  → out/
npm run watch        # compilación incremental (es el default build task de VS Code)
npm run lint         # eslint src (hoy: 0 errores, 8 warnings de eqeqeq preexistentes)
npm test             # vscode-test
vsce package         # genera el .vsix
```

Para probar a mano: **F5** abre una ventana de VS Code con la extensión cargada (ver `help.txt`).

**No hay tests reales.** `.vscode-test.mjs` busca `out/test/**/*.test.js` y no existe ningún `*.test.ts` en `src/`, así que `npm test` no ejecuta nada. `test/` solo contiene ficheros `.stxt` de ejemplo. `src/test.ts` es un script manual (`node out/test.js` desde `stxt/`) que parsea `test/demo.stxt` y lo reimprime con `NodeWriter`; no es un test automatizado. Al cambiar el parser, verificar a mano contra ficheros de `../../stxt-web/docs/`.

## Arquitectura

Dos capas, con una regla estricta: **nada bajo `src/core`, `src/schema`, `src/template`, `src/runtime`, `src/processors` o `src/exceptions` puede importar `vscode`.** Solo `src/extension.ts` y `src/extension/` conocen la API del editor.

### Núcleo del lenguaje

- **`core/Parser.ts`** — motor único de parseo. Recorre líneas manteniendo una pila de nodos abiertos; al cerrar un nodo lo pasa por los `Validator` registrados y lo adjunta al padre (o a la lista de documentos si es raíz). Expone `parse()` (lanza la primera excepción) y `parseResult()` (devuelve `ParseResult` con nodos + lista de errores, que es lo que usa la extensión para no abortar en el primer error).
- **`core/LineParser.ts`** — calcula nivel de indentación (1 tab = 1 nivel, 4 espacios = 1 nivel) y decide si la línea es comentario, línea dentro de bloque `>>`, vacía o nodo.
- **`core/NodeCreator.ts` + `NameNamespaceParser.ts`** — separan `Nombre (ns): valor` / `Nombre (ns) >>`; el namespace se **hereda del padre** si no se declara.
- **`core/Node.ts`** — nodo del árbol (mutable: el parser le añade hijos y líneas de texto tras crearlo). Guarda `name`, `normalizedName` (ver `StringUtils.normalize`), `namespace`, `value` o `textLines`, línea y nivel. Valida en el constructor el formato del nombre (STXT-SPEC 4.2) y del namespace.
- **`processors/Observer.ts` y `processors/Validator.ts`** — puntos de extensión del parser. Los observers reciben eventos (`onCreate`, `onFinish`, `onComment`, `onTextLine`); los validators devuelven `ValidationException[]` por nodo cerrado.

### Schemas y templates

- Un **schema** (`@stxt.schema`) y un **template** (`@stxt.template`) son ambos documentos STXT. `schema/SchemaParser.ts` y `template/TemplateParser.ts` los transforman al mismo modelo en memoria: `Schema` → `NodeDefinition` → `ChildDefinition`. **Un template siempre se compila a un `Schema`**; a partir de ahí el resto del sistema no distingue el origen.
- Los meta-schemas que validan los propios schemas/templates están **embebidos como texto STXT** en `schema/SchemaProviderMeta.ts` y `template/MetaTemplateSchemaProvider.ts`, y se parsean en el constructor. Si se añade un tipo nuevo, hay que tocar el `Values:` de `SchemaProviderMeta`, además de `TypeRegistry`.
- **`schema/TypeRegistry.ts`** — registro de tipos (`INLINE`, `BLOCK`, `TEXT`, `NUMBER`, `DATE`, `ENUM`, `GROUP`…). Cada tipo es un objeto `Type` en `schema/type/`; los tipos con formato regular se construyen con el helper `regexType()`.
- **`runtime/UnifiedSchemaProvider.ts`** — recibe el texto de cada fichero, detecta por el namespace del nodo raíz si es schema o template, lo valida contra su meta-schema y lo indexa por namespace en un `Map`.
- **`runtime/ConditionalValidator.ts`** — envoltorio que solo valida nodos **con namespace**; los documentos sin namespace no se validan contra ningún schema (es el comportamiento esperado, no un bug).

### Capa VS Code

- **`extension.ts`** — activación: registra listeners de documento, los cuatro providers y el cargador de schemas.
- **`extension/AnalysisDoc.ts`** — **punto central**. En cada cambio del documento hace *un solo* parseo que produce a la vez diagnósticos, tokens y mapas línea→nodo, y cachea el `AnalysisResult` por URI. Todos los providers leen de ese caché vía `getLastAnalysis()` y **nunca vuelven a parsear**. Si se añade información que necesite un provider, se calcula aquí (normalmente vía observer), no en el provider.
- **`extension/TokenGeneratorObserver.ts`** — observer que genera los semantic tokens y los mapas `nodeByLine` / `commentLines` / `textLineByLineNumber` durante el parseo. También reparsea recursivamente el contenido de `@stxt.template:structure` y `:description` para colorear el STXT que hay dentro de esos bloques de texto.
- **`extension/SchemaLoader.ts`** — carga **todos** los `.stxt` de `<workspace>/.stxt/**` (recursivo) en el `UnifiedSchemaProvider`, con un `FileSystemWatcher`. Cualquier cambio provoca `clear()` + recarga completa + reanálisis de todos los documentos abiertos.
- **`extension/HoverProvider.ts` / `CompletionProvider.ts` (+ `CompletionProviderSearch.ts`) / `FormattingProvider.ts` / `SemanticTokensProvider.ts`** — consumidores del `AnalysisResult` y del `SchemaLoader`.

### Flujo completo

```
edición → analysisDoc() → Parser(+TokenGeneratorObserver, +ConditionalValidator)
                            ↓                        ↓
                    tokens/nodeByLine          ValidationException[]
                            ↓                        ↓
                     AnalysisResult (caché)    Diagnostics
                            ↓
        Hover · Completion · Formatting · SemanticTokens
```

Los errores de parseo se muestran como `Error`; los de validación de schema (`ValidationException`), como `Warning`.

## Convenciones

- Comentarios y mensajes internos están **en castellano**; los códigos de error (`INVALID_NAMESPACE`, `NODE_NOT_EXIST_IN_SCHEMA`…) y los `getName()` de los tipos, en inglés y en MAYÚSCULAS. Mantener ese reparto.
- Errores: `ParseException` (sintaxis) y `ValidationException extends ParseException` (semántica), ambos con `line` y `code`. `RuntimeException` es para errores de programación (uso incorrecto de la API, tipo duplicado). Nunca lanzar `Error` pelado desde el núcleo.
- El código fuente usa **tabuladores**, igual que los ficheros `.stxt`. `tsconfig` está en `strict: true`.
- Al añadir un ítem al changelog, `CHANGELOG.md` va por versiones y la versión se sube en `package.json`.

## Trampas conocidas

- **`out/` y `node_modules/` están versionados en git.** `out/` arrastra artefactos obsoletos de una refactorización anterior (`STXTAnalysis.js`, `StxtCompletionProvider.js`, `core/LineIndentParser.js`, `core/IndentUtils.js`…) que ya no existen en `src/`: `tsc` no limpia el directorio. Son código muerto, pero ojo al buscar en el repo — **grepear siempre sobre `src/`, no sobre `out/`**.
- `language-configuration.json` está **vacío** (`{}`): no hay reglas de comentarios, brackets ni auto-indent declarativas. Todo el resaltado viene de semantic tokens, no de una gramática TextMate.
- El `parseLine()` de `CompletionProvider` se llama con `validate: false` a propósito, porque la línea que se está escribiendo suele estar incompleta.
- Hay `console.log` de depuración activos en `CompletionProvider`/`CompletionProviderSearch`/`SchemaLoader`.
