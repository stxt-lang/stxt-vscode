# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

## Qué es este repositorio

Extensión de Visual Studio Code para el lenguaje **STXT (Semantic Text)** (`.stxt`), publicada en el Marketplace como `stxt-lang.stxt`. Contiene **solo la capa de integración con el editor**: diagnósticos, semantic tokens, hover, autocompletado y formateo. Todo `src/` son 11 ficheros: `extension.ts` y `extension/`.

La **implementación del lenguaje** (parser, schemas, templates, tipos, writer) **ya no vive aquí**. Es el paquete npm **`@stxt-lang/core`**, que se desarrolla en el repositorio hermano `../../stxt-js` y que esta extensión consume como dependencia normal (`"@stxt-lang/core": "^0.5.3"`). El split se hizo en 0.5.1: las carpetas `src/core`, `src/schema`, `src/template`, `src/runtime`, `src/processors`, `src/exceptions` y `src/test` se borraron de este repositorio.

**Regla que sustituye a la antigua separación de capas: si un cambio necesita tocar el parser, los schemas o la validación, se hace en `../../stxt-js`**, se publica una versión nueva de `@stxt-lang/core` y se sube el rango en `package.json` de aquí. No reintroducir copias de esas clases bajo `src/`.

La raíz del repositorio git es el directorio padre (`stxt-vscode/`); el proyecto de la extensión vive en `stxt/`, que es donde se trabaja siempre.

## Especificación del lenguaje: proyecto hermano `../../stxt-web`

**`../../stxt-web` es la fuente normativa del lenguaje y se consulta en solo lectura.** No modificar nada ahí desde este repositorio.

Las tres especificaciones están en `../../stxt-web/es/` (versión canónica; espejo en inglés en `en/`):

- **`es/stxt-core-ref.stxt`** (*STXT-SPEC*) — sintaxis base: nodos inline `Nombre: valor` y bloques `Nombre >>`, indentación, namespaces `(a.b.c)`, comentarios `#`, normalización de nombres/valores, códigos de error.
- **`es/stxt-schema-ref.stxt`** (*STXT-SCHEMA-SPEC*) — `@stxt.schema`: `Node`/`Children`/`Child`, tipos, `Min`/`Max`, y el meta-schema oficial.
- **`es/stxt-template-ref.stxt`** (*STXT-TEMPLATE-SPEC*) — `@stxt.template`: `Structure >>`, cardinalidades `(1)`, `(?)`, `(*)`, `(+)`, `(min,max)`, `ENUM [a, b, c]`, referencias `@Nombre`.

Ante cualquier duda sobre comportamiento correcto del parser, validador o formateador, **la spec manda sobre el código**. Antes de "arreglar" algo, comprobar qué dice la spec. `../../stxt-web/docs/` y `../../stxt-web/.stxt/` tienen documentos y schemas reales que sirven de banco de pruebas manual.

Existen otras implementaciones hermanas del mismo lenguaje (`../../stxt-java`, `../../stxt-js`, `../../stxt-python`). La de `../../stxt-js` es la que consume esta extensión, y su código es un port casi literal de la versión Java (quedan comentarios que lo mencionan). Si hay que resolver una ambigüedad de comportamiento, comparar con `../../stxt-java` es útil, pero la spec sigue mandando.

## Trabajo en curso

No hay desajustes conocidos entre las specs y la implementación: el repaso completo de 2026-07-26 se cerró en la versión 0.5.0. El histórico de correcciones de conformidad, con la referencia a la sección de spec de cada una, está en `CHANGELOG.md` — que sigue siendo el changelog **del lenguaje además del de la extensión**, aunque desde 0.5.1 los cambios de conformidad se implementen en `../../stxt-js`. Si aparece un desajuste nuevo y no se corrige en el momento, anotarlo aquí o en `CHANGELOG.md` bajo `[Unreleased]`.

## Comandos

```bash
npm run compile      # tsc -p ./  → out/
npm run watch        # compilación incremental (es el default build task de VS Code)
npm run lint         # eslint src (hoy: limpio, 0 errores y 0 warnings)
vsce package         # genera el .vsix
```

Para probar a mano: **F5** abre una ventana de VS Code con la extensión cargada (ver `help.txt`).

### Tests

**Aquí no hay tests ni script `npm test`.** Los tests de regresión del lenguaje (mocha contra el corpus real de `../../stxt-web`: cada schema y template de `.stxt/**` debe cargar, cada documento de `docs/`, `es/` y `en/` debe parsear y validar sin errores, y lo que escribe `NodeWriter` debe reparsear al mismo árbol) viven en `../../stxt-js/src/test/` — ahí `npm test` son 224 tests. Si se toca la conformidad, se ejecutan allí.

Tampoco hay tests de la capa de VS Code: haría falta `vscode-test` (que arranca un Electron) y el `.vscode-test.mjs` se eliminó. `@vscode/test-cli` y `@vscode/test-electron` siguen en `devDependencies` **sin usarse**, aparcados por si algún día se prueba la capa del editor; hay que recrear la configuración con un script aparte.

## Arquitectura

Siguen siendo dos capas, pero la frontera es ahora el límite del paquete npm: **`@stxt-lang/core` no conoce `vscode`**, y todo lo que hay en `src/` conoce el editor.

### Lo que se consume de `@stxt-lang/core`

El paquete exporta todo por un único barrel (`out/all.js`). Lo que la extensión usa hoy:

- **`Parser`** — motor de parseo. `parseResult()` devuelve un `ParseResult` con nodos + lista de errores acumulada, que es lo que usa la extensión para no abortar en el primer error (`parse()`, que lanza la primera excepción, solo lo usa el propio paquete). Acepta `registerObserver()` y `registerValidator()`.
- **`Node`** — nodo del árbol: `name`, `normalizedName`, `namespace` (heredado del padre si no se declara), `value` o `textLines`, línea y nivel. `getQualifiedName()` = `namespace:name`.
- **`Observer`** — punto de extensión del parser (`onCreate`, `onFinish`, `onComment`, `onTextLine`); lo implementa `TokenGeneratorObserver`.
- **`UnifiedSchemaProvider`** — `addFile(text)` detecta por el namespace del nodo raíz si es `@stxt.schema` o `@stxt.template`, lo valida contra su meta-schema, lo transforma a `Schema` y lo indexa por namespace. Un template **siempre** se compila a un `Schema`: a partir de ahí nada distingue el origen.
- **`SchemaValidator` + `ConditionalValidator`** — el segundo envuelve al primero y solo valida nodos **con namespace**; los documentos sin namespace no se validan contra ningún schema (comportamiento esperado, no un bug).
- **`transformNodeToSchema` / `transformTemplateNodeToSchema`** — usados directamente por `AnalysisDoc` para dar errores al editar un schema o un template.
- **`StringUtils`, `parseLine`, `Constants`, `Line`, `Schema`, `NodeDefinition`, `ChildDefinition`, `SchemaProvider`, `ParseException`, `NodeWriter`/`IndentStyle`.**

Si hace falta algo del núcleo que no esté exportado (`TypeRegistry`, `RuntimeException`, `SchemaProviderMemory`… hoy no lo están), **se añade a `src/all.ts` de `../../stxt-js` y se republica el paquete**; no vale llegar a los subpaths internos de `node_modules`.

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

- Comentarios y mensajes internos están **en castellano**; los códigos de error (`INVALID_NAMESPACE`, `NODE_NOT_EXIST_IN_SCHEMA`…), que vienen del núcleo, en inglés y en MAYÚSCULAS.
- Errores del núcleo: `ParseException` (sintaxis) y `ValidationException extends ParseException` (semántica), ambos con `line` y `code`.
- El código fuente usa **tabuladores**, igual que los ficheros `.stxt`. `tsconfig` está en `strict: true`.
- Al añadir un ítem al changelog, `CHANGELOG.md` va por versiones y la versión se sube en `package.json`. Si el cambio es del lenguaje, sube también la versión de `@stxt-lang/core` en `dependencies`.

## Trampas conocidas

- **`out/` puede arrastrar artefactos obsoletos**: `tsc` no limpia el directorio. Tras el split de 0.5.1 pueden quedar ahí `out/core/`, `out/schema/`, `out/template/`, `out/runtime/`, `out/processors/` y `out/exceptions/`, que ya no existen en `src/`. Si aparecen, son código muerto — **grepear siempre sobre `src/`, no sobre `out/`**. `out/`, `node_modules/` y los `.vsix` están en `.gitignore` y no se versionan.
- `language-configuration.json` está **vacío** (`{}`): no hay reglas de comentarios, brackets ni auto-indent declarativas. Todo el resaltado viene de semantic tokens, no de una gramática TextMate.
- El `parseLine()` de `CompletionProvider` se llama con `validate: false` a propósito, porque la línea que se está escribiendo suele estar incompleta.
- Hay tres `console.log` de depuración activos en `CompletionProvider` (líneas 13, 41 y 50); el resto del código los tiene comentados.
- `CLAUDE.md` está en `.vscodeignore` desde 0.5.3, así que ya no viaja dentro del `.vsix` (hasta 0.5.2 sí se publicó al Marketplace). Al añadir documentación interna nueva en la raíz, acordarse de excluirla también.
