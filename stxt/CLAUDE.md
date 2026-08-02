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
npm test             # compila y pasa mocha (hoy: 391 tests, todos en verde)
vsce package         # genera el .vsix
```

Para probar a mano: **F5** abre una ventana de VS Code con la extensión cargada (ver `help.txt`). Lo que se puede automatizar ya está en `npm test`; el F5 queda para lo que de verdad hay que mirar a ojo, que es el color.

### Tests

```bash
npm test            # pretest compila + mocha sobre out/test/**/*.test.js
STXT_WEB=/ruta npm test   # si stxt-web no está donde se espera
```

**Los tests de la capa de editor viven aquí** (`src/test/`, unos 390) y **corren en Node puro, sin Electron**. La clave es que solo cuatro ficheros de `src/` usan `vscode` en tiempo de ejecución: `src/test/stub/vscode.ts` reimplementa las clases que se usan de verdad y `src/test/register.ts` intercepta `require('vscode')` con un enganche a `Module._load` que mocha carga con `--require` (ver `.mocharc.json`). Por eso **no hace falta `vscode-test`**: `@vscode/test-cli` y `@vscode/test-electron` se quitaron de `devDependencies` porque llevaban desde el principio sin usarse. El stub ya sirve los eventos de documento y los `registerXProvider`, así que `activation.test.ts` **sí llama a `activate()`**; lo único que sigue fuera de su alcance es el `FileSystemWatcher` de verdad. Si algún día hace falta, se vuelven a instalar entonces.

El grueso son **invariantes sobre el corpus real de `../../stxt-web`** (`corpus.test.ts`), sin fixtures propios: para cada documento de `docs/`, `es/` y `en/` se comprueba que los tokens caen dentro de su línea, que van en orden y no se solapan, que la codificación relativa de los semantic tokens no los mueve, que el formateo es idempotente y **conserva el árbol**, y que autocompletado y hover no lanzan en ninguna posición del cursor. Los schemas se cargan pasando por el `SchemaLoader` real. `providers.test.ts` añade casos dirigidos del observer, el formateador y la búsqueda de sugerencias. Si `../../stxt-web` no está, esos bloques se marcan como pendientes en vez de fallar. Las excepciones son `schemaLoader.test.ts` y `activation.test.ts`, que **no** usan el corpus porque lo que prueban no son documentos: el primero, dónde se buscan los schemas (se monta su propio árbol de directorios temporal); el segundo, que el documento llega analizado al provider (llama a `activate()` de verdad).

**Aquí no se prueba la conformidad del lenguaje**: eso son los 224 tests de `../../stxt-js/src/test/` (mocha contra el mismo corpus: cada schema y template de `.stxt/**` debe cargar, cada documento debe parsear y validar sin errores, y lo que escribe `NodeWriter` debe reparsear al mismo árbol). Si se toca la conformidad, se ejecutan allí; duplicarlo aquí solo crearía dos verdades.

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
- **`extension/AnalysisDoc.ts`** — **punto central**. En cada cambio del documento hace *un solo* parseo que produce a la vez diagnósticos, tokens y mapas línea→nodo, y cachea el `AnalysisResult` por URI. Todos los providers leen de ese caché vía `getAnalysis()` y **nunca parsean por su cuenta**. Si se añade información que necesite un provider, se calcula aquí (normalmente vía observer), no en el provider. `getAnalysis()` sí analiza en el momento cuando el caché está frío, que es la red de seguridad contra la trampa de abajo: nunca devolver vacío porque el análisis aún no ha llegado.
- **`extension/TokenGeneratorObserver.ts`** — observer que genera los semantic tokens y los mapas `nodeByLine` / `commentLines` / `textLineByLineNumber` durante el parseo. También reparsea recursivamente el contenido de `@stxt.template:structure` y `:description` para colorear el STXT que hay dentro de esos bloques de texto.
- **`extension/SchemaLoader.ts`** — carga **todos** los `.stxt` de los directorios `.stxt/**` que descubre (recursivo) en el `UnifiedSchemaProvider`, con un `FileSystemWatcher` por directorio. Cualquier cambio provoca `clear()` + recarga completa + reanálisis de todos los documentos abiertos. **El directorio `.stxt` se busca subiendo**, desde cada carpeta del workspace y desde la carpeta de cada documento que se abre, hasta el primero que exista o hasta la raíz del sistema de ficheros —igual que `tsconfig.json` o `.editorconfig`, y **puede quedar por encima de la raíz del workspace**, que es el caso de abrir en VS Code una subcarpeta de un proyecto. `ensureSchemasForDocument()` es lo que dispara esa búsqueda al abrir un documento, antes de analizarlo.
- **`extension/HoverProvider.ts` / `CompletionProvider.ts` (+ `CompletionProviderSearch.ts`) / `FormattingProvider.ts` / `SemanticTokensProvider.ts`** — consumidores del `AnalysisResult` y del `SchemaLoader`.
- **`extension/Log.ts`** — canal `STXT` del panel Output (`createOutputChannel(..., { log: true })`), creado de forma perezosa y registrado en `context.subscriptions` al activar. **No usar `console.log`**: `log.trace()` para lo que ocurre en cada pulsación (análisis, autocompletado), que VS Code descarta salvo que el usuario suba el nivel con *Developer: Set Log Level…*; `log.info()` para hitos (carga de schemas); `log.error()` para fallos que no se ven de otra forma, como un schema de `.stxt/**` que no carga.

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

**Si no se ha cargado ningún schema, `SCHEMA_NOT_FOUND` no se muestra.** Los schemas son una capa separada y **opcional** (STXT-SPEC §15 y §17.2: «@STXT@ **NO DEBE** imponer reglas semánticas provenientes de schemas»), así que un documento con namespace para el que no hay schema en ninguna parte no está mal: simplemente no se puede validar. Además el aviso lo emite el validador **en cada nodo** —el namespace se hereda del padre—, así que sin el filtro el fichero entero se llenaba de subrayados. En cuanto hay algún schema cargado el aviso vuelve, porque entonces sí suele ser una errata en el namespace. El filtro está en `AnalysisDoc`, no en el núcleo.

## Convenciones

- **Todo el comportamiento del editor sale del parseo, no de configuración declarativa.** El resaltado, la estructura y cualquier regla que dependa de la sintaxis se derivan del `Parser` y de las clases de `@stxt-lang/core` (vía `TokenGeneratorObserver` y `AnalysisDoc`), nunca de una gramática TextMate ni de reglas escritas a mano en `language-configuration.json`, que se mantiene vacío a propósito. El motivo es que hay una sola definición del lenguaje —la del núcleo, que sigue la spec— y no una segunda copia en forma de expresiones regulares que se desincroniza en silencio. Si en algún momento hace falta declararle algo a VS Code (comentario de línea, indentación), la vía es `vscode.languages.setLanguageConfiguration()` en la activación, construido desde `Constants` (`COMMENT_CHAR`, `SEP_TEXT_NODE`…), no un literal en el JSON.
- Comentarios y mensajes internos están **en castellano**; los códigos de error (`INVALID_NAMESPACE`, `NODE_NOT_EXIST_IN_SCHEMA`…), que vienen del núcleo, en inglés y en MAYÚSCULAS.
- Errores del núcleo: `ParseException` (sintaxis) y `ValidationException extends ParseException` (semántica), ambos con `line` y `code`.
- El código fuente usa **tabuladores**, igual que los ficheros `.stxt`. `tsconfig` está en `strict: true`.
- Al añadir un ítem al changelog, `CHANGELOG.md` va por versiones y la versión se sube en `package.json`. Si el cambio es del lenguaje, sube también la versión de `@stxt-lang/core` en `dependencies`.
- **La versión de la extensión y la de `@stxt-lang/core` no se sincronizan, y no hay que intentarlo.** Hasta la 0.5.3 coincidieron por casualidad (mismo número en los dos repositorios), y eso invita a pensar que van emparejadas: no lo van. La 0.5.4 es la primera divergencia —extensión 0.5.4 sobre núcleo 0.5.3— y es lo normal, porque cada repositorio publica por sus propios motivos: aquí se publica por cosas del editor (resaltado, autocompletado, formateo, logs) y en `../../stxt-js` por cosas del lenguaje. Forzar que los números cuadren solo produce releases vacías en uno de los dos lados. **Lo que sí hay que mantener al día es la dependencia**: cuando `../../stxt-js` publique una versión nueva de `@stxt-lang/core`, subir cuanto antes el rango de `dependencies` aquí, comprobar que `npm test` sigue en verde y publicar; quedarse atrás significa dar por buenos en el editor comportamientos que la spec ya ha corregido.

## Trampas conocidas

- **Un documento sin analizar se queda sin color, y no se recupera solo.** VS Code pide los semantic tokens en cuanto pinta el documento y **no vuelve a preguntar** hasta que algo lo invalida (una edición, o cerrar y reabrir el editor); si el provider devuelve una lista vacía porque el análisis todavía no estaba en el caché, el fichero se ve en blanco y negro hasta que se toca. Los dos caminos que lo provocaban están cerrados —`activate()` analiza los documentos ya abiertos **antes** de registrar los providers, y el `onDidOpenTextDocument` analiza **antes** de esperar a los schemas, que es asíncrono— y `getAnalysis()` cubre el resto analizando en frío. **Al tocar el orden de `activate()` o de ese listener, comprobar que los tres tests de `activation.test.ts` siguen en verde**: están escritos para fallar justo con esas tres regresiones, y son la única forma de ver el problema sin abrir el editor.
- **`out/` puede arrastrar artefactos obsoletos**: `tsc` no limpia el directorio. Tras el split de 0.5.1 pueden quedar ahí `out/core/`, `out/schema/`, `out/template/`, `out/runtime/`, `out/processors/` y `out/exceptions/`, que ya no existen en `src/`. Si aparecen, son código muerto — **grepear siempre sobre `src/`, no sobre `out/`**. `out/`, `node_modules/` y los `.vsix` están en `.gitignore` y no se versionan.
- `language-configuration.json` está **vacío** (`{}`) y **es deliberado, no un olvido** (ver la regla de "todo sale del parseo" en Convenciones). No hay gramática TextMate ni reglas declarativas de comentarios, brackets o auto-indent.
- El `parseLine()` de `CompletionProvider` se llama con `validate: false` a propósito, porque la línea que se está escribiendo suele estar incompleta.
- `CLAUDE.md` está en `.vscodeignore` desde 0.5.3, así que ya no viaja dentro del `.vsix` (hasta 0.5.2 sí se publicó al Marketplace). Al añadir documentación interna nueva en la raíz, acordarse de excluirla también.
- Los tests se compilan a `out/test/`, que es parte de la salida normal de `tsc`: van excluidos del `.vsix` por `.vscodeignore` (`out/test/**` y `.mocharc.json`). Si se añade otro directorio de apoyo bajo `src/`, excluir también su salida.
- El stub de `vscode` **imita también los errores del API real** (por ejemplo, `lineAt()` lanza si la línea no existe). Si un test falla por ahí, el fallo es del código de la extensión, no del stub.
