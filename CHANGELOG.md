# Change Log

All notable changes to the "stxt" extension are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Strict UTF-8 decodes (STXT-SPEC §3): a definition or document whose bytes are not valid
  UTF-8 is a read error instead of being silently decoded with U+FFFD replacement
  characters (`SchemaLoader.readFile`, `DefinitionProvider`).

## [0.16.0]

Moves to `@stxt-lang/core` `^0.16.0` — no language changes: the core release carries the
hardening fixes of the ports security audit (bounded discovery descent, a linear `BASE64`
check, strict blanks in template parsing) and error parity between the ports.

### Security

- The schema loader no longer follows symbolic links inside a resolution directory
  (STXT-DISCOVERY-SPEC §3/§10): any entry with the symlink bit is omitted from the listing,
  closing both symlink loops and the reading of unrelated files through a planted link. Same
  behaviour as the real adapters of the ports and the CLI.

### Changed

- Internal maintenance, no behaviour change: the diagnostic collection lives with the analysis
  cache (no circular import with the activation module), the analysis of a closed document is
  dropped instead of cached forever, and the analysis internals were renamed for consistency
  (`analyzeDocument`, `textNodeByLineIndex`).

## [0.15.0]

Moves to `@stxt-lang/core` `^0.15.0`, a language change (STXT-SPEC §10.3): the **final empty
lines of a `>>` block are no longer content**. The sequence of empty lines after the last
non-empty line of a block is discarded when the block closes, whether a shallower line closes
it or the document ends — they were visual separation (or an editor's final line breaks), not
content, and two visually identical documents now produce the same tree. Leading and
intermediate empty lines are kept, an empty line still never closes a block, and a block whose
lines are all blank is now as empty as a block with no lines.

In the editor: diagnostics, hover, completion and the canonical tree reflect the trimmed
content, and *Format Document* leaves the final blank lines of a block plain and unindented
(they used to get the block's indentation). No extension code changes beyond the tests.

## [0.14.1]

Moves to `@stxt-lang/core` `^0.14.1`: the parser limits of STXT-SPEC §11.2 (there is no 0.14.0
of the extension: the whole cycle ships at the core's number). Documents nesting
more than 100 levels, lines longer than 10 000 characters and inputs over 10 000 000 characters
are now rejected (`LIMIT_NESTING_EXCEEDED`, `LIMIT_LINE_LENGTH_EXCEEDED`,
`LIMIT_INPUT_SIZE_EXCEEDED`), and a limit error aborts the parse, so it is always the last
diagnostic of the document. The core also gains a streaming API (`StreamObserver`,
`parseStream`) that the extension does not need.

Three new settings — **`stxt.maxNesting`**, **`stxt.maxLineLength`** and
**`stxt.maxInputSize`** — configure the limits per user or per workspace, next to
`stxt.schemaValidation` and `stxt.developerMode`; `-1` disables one, and the defaults are the
recommended ones of the specification. Changing any STXT setting re-analyzes the open
documents. **Format Document** parses with the same limits (via `Formatter` of the core
`^0.14.1`), so a document the settings allow is formatted whole.

This release also ships the 0.13.1 icon, which was never published on its own.

## [0.13.1] (not published)

New extension icon: the Russo One "S" over "TXT", white on the brand gradient, matching the
portal's favicon. No functional change.

## [0.13.0]

Moves to `@stxt-lang/core` `^0.13.0`: the writing operations of STXT-TREE-SPEC §11–12 are now
normative. **Format Document** drops an initial BOM, as §12.1 says; otherwise the formatter
behaves as before. Nothing else changes.

## [0.12.0]

Moves to `@stxt-lang/core` `^0.12.0`, the language change of STXT-SPEC §8.3 (clarified on
2026-08-22): an indented first line is now a parse error, `INDENTATION_LEVEL_NOT_VALID`. The
extension reports it like any other syntax error; nothing else changes.

## [0.11.1]

Moves to `@stxt-lang/core` `^0.11.1`. No visible change.

- **Format Document** delegates to the new `Formatter` of the core, the same one `stxt format`
  and the playground use; the extension's own line rewriter is gone. Same result as before, with
  one difference on documents with syntax errors: a line the parse tree does not describe now has
  its whole indentation units converted to the editor's style, like a comment, instead of being
  left in the old style.

## [0.11.0]

Moves to `@stxt-lang/core` `^0.11.0`, the preview of the 1.0 core. No visible change.

- `ConditionalValidator` is gone from the core; the extension registers `SchemaValidator`
  directly (it already skipped the nodes without a namespace, STXT-SCHEMA-SPEC 5).
- `Line.indentLength` became `Line.contentStart` in the core, which fixes an off-by-one in the
  text lines of a block; the `+ 1` the token generator added to compensate is gone with it.

## [0.10.1]

Editor-only release, same `@stxt-lang/core` `^0.10.0`.

- **New setting `stxt.schemaValidation`** (default `true`): validate documents against the
  schemas and templates of their resolution chain. Off, only the syntax is checked — definition
  documents are not checked against their meta-schema either — like `stxt validate --no-schema`.
  Changing it re-analyzes every open document.
- **`SCHEMA_NOT_FOUND` is no longer silenced when the chain has no definition at all.** With
  validation on, a namespace that no definition covers is a warning on each node, whatever else
  is installed: the setting decides whether a document is validated, not the presence of
  unrelated schemas beside it (which until now changed a document's verdict without touching
  it). Same rule as the playground 0.4.3 and the CLI 0.10.1.

## [0.10.0]

Language release: `@stxt-lang/core` `^0.10.0`, the last one before 1.0. No editor-only changes.

- **Blanks inside binary values** (STXT-SCHEMA-SPEC 9.5): `HEXADECIMAL`, `BINARY` and `BASE64`
  drop every space and tab before validating, inline and in `>>` blocks, so `DE AD BE EF`,
  `1010 1010` and Base64 wrapped at 76 columns are valid. An empty `BASE64` value is now an error,
  as the specification always said.
- **`VALUE_EMPTY`** (STXT-SCHEMA-SPEC 13, condition 14; STXT-TEMPLATE-SPEC 14.14): an empty
  `Value:` in an `ENUM`, or an empty item in a template list (`ENUM [a, , b]`, `[a, b,]`), is a
  definition error shown on that line.
- **Error messages** carry only the description; the code and line are separate fields, as the
  diagnostics already showed them. No visible change in the editor.
- The core now exposes `SPEC_VERSION` (`1.0`), the version of the STXT specifications it
  implements.

## [0.9.1]

Language release: `@stxt-lang/core` `^0.9.1`. No editor-only changes.

- **Error codes renamed** (STXT-SPEC 11.1, STXT-SCHEMA-SPEC 13.1, STXT-TEMPLATE-SPEC 14.1, the new
  normative annexes; frozen from 1.0). Diagnostics show the new codes: `INDENTATION_MIXED` (was
  `MIXED_INDENTATION`), `INDENTATION_SPACES_NOT_VALID` (was `INVALID_NUMBER_SPACES`),
  `BLOCK_VALUE_NOT_ALLOWED` (was `INLINE_VALUE_NOT_VALID`), `TOO_FEW_CHILDREN` / `TOO_MANY_CHILDREN`
  (was `INVALID_NUMBER`), `BLOCK_FORM_NOT_ALLOWED` (was `NOT_ALLOWED_TEXT`), `CHILDREN_NOT_ALLOWED`
  (was `NOT_ALLOWED_CHILDREN_TEXT`), `VALUE_NOT_ALLOWED` (a value on a `GROUP`, was `INVALID_VALUE`),
  `NODE_NOT_DEFINED_IN_SCHEMA` (was `NODE_NOT_EXIST_IN_SCHEMA`), `UNEXPECTED_ERROR` (was
  `VALIDATION_ERROR`), and the schema- and template-loading families (`SCHEMA_*`, `TEMPLATE_*`,
  `*_DUPLICATED`, `DESCRIPTION_*`, `REFERENCE_*`). The `SCHEMA_NOT_FOUND` filter is unchanged.
- **Value types by grammar** (STXT-SCHEMA-SPEC 9.3–9.5): `URL` is an absolute URL with scheme and
  host by the specification's own grammar; `DATE`, `TIME` and `TIMESTAMP` check calendar and clock
  ranges (`2026-02-30` and `24:00:00` are errors now); the `TIMESTAMP` fraction takes one or more
  digits; `NUMBER` is documented as not the JSON number.

## [0.9.0]

Language release: `@stxt-lang/core` `^0.9.0`, which carries the one change of STXT-SPEC dated
2026-08-21. No editor-only changes.

- **The indentation of a comment is validated like a node's** (STXT-SPEC 9, 11): only tabs or
  only groups of four spaces, never mixed on the same line, and at most one level deeper than
  the last node. A comment still produces no node and never moves the hierarchy. The errors are
  the node ones — `MIXED_INDENTATION`, `INVALID_NUMBER_SPACES`, `INDENTATION_LEVEL_NOT_VALID` —
  and show up as diagnostics on the comment line. Before, a comment could sit at any
  indentation. Formatting is unchanged in substance: the indentation units of a comment are
  still converted one for one to the editor's style; a comment with leftover spaces is now a
  syntax error, so the document is reported instead of reformatted.

## [0.8.0]

Language release: `@stxt-lang/core` `^0.8.0`, which carries the three changes of the
specifications dated 2026-08-20. No editor-only changes.

- **A comment closes a `>>` block** (STXT-SPEC 6.1, 9.1). Any non-empty line with indentation
  less than or equal to the block node ends the block, comments included; before, a comment was
  transparent and the block stayed open across it. A block is a literal and cannot be commented
  from inside: a `#` line deeper than the node is text, as always, and one at the node's level
  or shallower ends it. Blank lines after such a comment are no longer block content, and a
  text line after it is reported as an error instead of being silently lost. Diagnostics,
  tokens, hover and formatting follow the tree, so they all reflect the new rule.
- **The empty namespace is never validated** (STXT-SCHEMA-SPEC 5). The core's `SchemaValidator`
  no longer reports `SCHEMA_NOT_FOUND` for a node without a namespace, which is what the
  extension already did through `ConditionalValidator`; nothing changes on screen.
- **Combining marks in node names** (STXT-SPEC 4.2). Names accept the Unicode categories `Mn`
  and `Mc` besides letters and digits — Devanagari, Bengali, Tamil or Thai vowel signs, and
  combining accents with no precomposed form — so `हिंदी: x` is no longer `INVALID_NODE_NAME`.
  Enclosing marks (`Me`) are not allowed, and a name still needs at least one letter or digit.

## [0.7.4]

Editor-only release; the language and `@stxt-lang/core` `^0.7.1` are unchanged.

- **Formatting converts the indentation of comments too.** A comment has no level of its own
  (STXT-SPEC does not validate its indentation), so *Format Document* used to leave it as
  written, and a document converted between tabs and spaces kept its comments in the old style.
  Now the whole indentation units of a comment — tabs or groups of four spaces — are converted
  to the editor's style, one for one, and whatever follows them (the comment's own extra
  spacing and its text) is kept exactly as it is. Same rule as `stxt format` 0.7.3 of the CLI
  and the playground's re-indentation.
- **The blank lines of a `>>` block are indented like the block.** They used to be written
  empty; now they get the indentation of the block's lines (a blank line of a block is `""` in
  the content whatever it looks like, STXT-SPEC §10.3, so the document means the same), which
  keeps the block in one piece when editing, and a whitespace-only last line of the file is
  normalised the same way instead of being left as written. Blank lines outside a block still
  stay empty. Same as `stxt format` 0.7.3.

## [0.7.3]

Editor-only release; the language and `@stxt-lang/core` `^0.7.1` are unchanged.

- **Markdown highlighting inside `MARKDOWN` blocks.** When the schema or template of a
  document declares a node as `MARKDOWN` (STXT-SCHEMA-SPEC 9.7), the lines of its `>>` block
  are coloured as Markdown: ATX headings, fenced code, list and block-quote markers, inline
  code, bold, italic, links and images. `TEXT` blocks, and blocks of namespaces with no
  grammar, stay as they were. The tokens are semantic, mapped to the standard `markup.*`
  TextMate scopes, so every theme paints them the way it paints a `.md` file, and no
  hand-written grammar is involved: the type comes from the grammar the document resolves
  to, not from the text.

## [0.7.2]

- **Formatting follows the editor's indentation setting.** *Format Document* now indents with
  tabs or with spaces according to `editor.insertSpaces` for the document (the extension's
  default for `.stxt` is still tabs); it used to write tabs regardless. With spaces a level is
  always **four** spaces, whatever `editor.tabSize` says, because that is what STXT-SPEC allows.
- **The lines of a `>>` block are re-indented too**, to the level of their block, keeping any
  indentation of their own beyond it — the same thing `stxt format` of the CLI does. Blank lines
  inside a block stay empty (STXT-SPEC §10.3), comments and blank lines outside blocks are kept
  as written, and lines the parse tree does not describe are left untouched.
- **New setting `stxt.developerMode`** (default off). Hovering a node now shows what its
  schema or template declares for it — the description, the type and, for an `ENUM`, the
  allowed values — the documentation of the grammar, meant for whoever writes the document;
  nothing when no grammar declares the node. Turning the setting on
  brings back the technical card (form and level, names, value, schema type and allowed
  values, text content) and the card over comments.
- `@stxt-lang/core` `^0.7.1`: the `EMAIL` type accepts a display name before the address
  (`Joan Costa <joan@example.com>`), as STXT-SCHEMA-SPEC 9.4 defines since 2026-08-17.

## [0.7.1]

Editor-only release; the language, the diagnostics and `@stxt-lang/core` `^0.7.0` are unchanged.

- **Go to definition** (F12 / Ctrl+click) on a node: opens the schema or template that defines
  its namespace, on the `Node: Name` line of a schema or on the node's own line inside the
  `Structure >>` block of a template; on the namespace itself it opens the root of the
  definition document. Which file defines the namespace follows the document's discovery chain,
  like validation. Nothing is offered over a value, over a comment, without a namespace, or when
  no loaded level defines the namespace.

- Internal: every comment, JSDoc, test title and assertion message under `src/` is now in
  English, in line with the rest of the ecosystem. No change in behaviour or in the messages
  shown in the editor.

## [0.7.0]

Release aligned with `@stxt-lang/core` **0.7.0**, whose version this extension now follows. Nothing
changes in the language, in the diagnostics or in the error codes; the update is the parser's
in-memory model and a round of housekeeping before publishing.

- `@stxt-lang/core` `^0.7.0` (was `^0.6.2`), which brings the **new node model** of `stxt-core`
  0.7.0 (Java): `Node` is abstract with two forms, `InlineNode` (`Name: value`) and `TextNode`
  (`Name >>`), parent links, declared vs effective namespace and a derived level. The extension's
  formatting, hover, completion and token observer ask for the node's form with
  `instanceof InlineNode` / `TextNode`; `findSuggestionsByParent()` takes an `InlineNode` (a text
  block cannot have children, so nothing is suggested under one); `AnalysisResult.
  textLineByLineNumber` maps to `TextNode`; `getNormalizedName()` (deprecated in the core) replaced
  by `getCanonicalName()`, and the hover now labels it *Canonical name*. The full description of
  the model is in the changelog of `@stxt-lang/core`.

- The messages of the **STXT** output channel are now in English (they were in Spanish).

- Packaging: the Eclipse project files (`.project`, `.settings/`) no longer ship in the `.vsix`;
  `package.json` gains `homepage`, `bugs` and a fuller description; README documents completion,
  the output channel and the shared parser.

- `@stxt-lang/core`: `SchemaProvider` contract — providers never throw "not found".
  `SchemaProviderMeta` and `MetaTemplateSchemaProvider` return `null` for any namespace but their
  own (they used to throw `RESOURCE_NOT_FOUND`), so a `SchemaValidator` over the default
  `SchemaProviderMemory` (whose parent is the meta provider) now reports `SCHEMA_NOT_FOUND` as a
  finding for an unknown namespace instead of throwing. Aligned with `stxt-impl` and `stxt-java`.

- Tests: the `stxt-web` corpus is now mandatory, here and in `@stxt-lang/core`. `findStxtWeb()`
  throws when the sibling project (or `STXT_WEB`) cannot be found, so the corpus suites fail with
  an explicit message instead of being marked pending. Fixes the locator, which had been climbing
  one directory too many since the intermediate `stxt/` folder was removed from this repository
  (2026-08-10) and had left the whole corpus suite silently skipped.

## [0.6.1]

Maintenance release updating `@stxt-lang/core` to **0.6.2**. The editor layer remains unchanged;
it now consumes the core conformance corrections from the 2026-08-09 pseudocode audit:

- Node-name validation accepts equivalent decomposed and precomposed Unicode spellings.
- Schema `Node` and `Child` values enforce the STXT node-name grammar.
- Template `Structure` lines reject the core BLOCK (`>>`) form and require `:`.
- A same-level discovery conflict blocks fallback to a more distant definition.

## [0.6.0]

A release about **where schemas come from**. Until now that answer was written here, in the editor,
and it was the editor's own answer: the first `.stxt/` found on the way up. STXT now has a fourth
normative specification, **STXT-DISCOVERY-SPEC** (`stxt-web/es/stxt-discovery-ref.stxt`), that
defines resolution for every tool at once, and this version implements it. `@stxt-lang/core` moves
to **0.6.0**, which is where the resolution logic now lives — so the extension and the `stxt`
command line resolve identically by construction, not by two implementations happening to agree.
A project whose schemas sit in `<workspace>/.stxt/` behaves exactly as it did in 0.5.5.

- **The upward search no longer stops at the first `.stxt/`.** Every ancestor `.stxt/` takes part
  in the chain, nearest first (STXT-DISCOVERY-SPEC §4.1). In a monorepo the subproject's schemas
  and the repository root's are now both available, which was the case that made the old
  first-match rule visibly wrong.
- **Two new levels after the project ones**: `~/.stxt` for the user and `/etc/stxt` for the system
  (`%USERPROFILE%\.stxt` and `%ProgramData%\stxt` on Windows), per §4.2. Schemas shared across
  every project no longer have to be copied into each one.
- **`STXT_PATH` replaces the whole chain when it is defined** (§6), project levels included. It is
  what CI and the tests use to resolve against a controlled set of directories and nothing else.
- **Precedence is per namespace, not per directory** (§5): the nearest level that defines a
  namespace wins, and levels further out still contribute the namespaces nobody nearer defines.
  Two definitions of the same namespace at the same level are a resolution error (§8): it is
  reported in the **STXT** output channel and leaves that namespace with no active definition,
  instead of one of the two silently winning.
- **Validation is per document** (§7). Each document is validated against the chain of its own
  directory, so two files in different projects of the same window no longer see each other's
  schemas: `SchemaLoaderExtension` now carries the document's Uri, and hover resolves the same way.
  Completion still reads the union of everything resolved, because a completion request has no
  document context to narrow it down.
- **`SchemaLoader.ts` is now just the editor's side of the spec**: two adapters —
  `vscode.workspace.fs` and the process environment — over `DiscoveryResolver`, plus per-directory
  caching of the results and a `FileSystemWatcher` per resolution level. Any change on disk still
  clears the cache, re-resolves and re-analyses the open documents. `ensureSchemasForDocument()`
  keeps resolving a document's chain before analysing it, which is what covers opening a subfolder
  of a project whose `.stxt/` sits above the workspace root.
- `npm test` is **410 passing**. `schemaLoader.test.ts` grew a suite for the chain itself — the
  user level loading alongside the project one, `STXT_PATH` replacing everything, and a nested
  `.stxt/` validating against the nearest definition — and every registration in it now injects an
  isolated `DiscoveryEnvironment`, so the tests no longer depend on whatever `~/.stxt` the machine
  running them happens to have.

## [0.5.5]

An editor-layer release about **where the schemas come from and when the document gets analysed**.
Nothing here is a new capability: it is three things that were wrong, and a document with `.stxt/`
at the root of its workspace behaves exactly as it did in 0.5.4. `@stxt-lang/core` stays at 0.5.3 —
no parser, schema or template behaviour changed.

- **A document is coloured as soon as it is shown, without having to touch it first.** The providers
  read the analysis from the cache of `AnalysisDoc`, and nothing guaranteed the cache was warm when
  VS Code asked for the semantic tokens — which it does the moment it paints the document, and does
  not ask again until an edit or a reopen invalidates it. So the file stayed black and white until
  it was touched. Two paths were losing that race: documents already open when the extension
  activates never get `onDidOpenTextDocument`, and were only analysed at the end of the initial
  schema load, which is asynchronous; and, since the upwards search was added, the open handler
  awaited it before analysing. Now `activate()` analyses the open documents **before** registering
  the providers, the open handler analyses **before** awaiting the schema search, and `getAnalysis()`
  analyses on the spot if it is ever asked for a document the cache has not seen.
- **A document with no schema anywhere is no longer reported as a problem.** `SCHEMA_NOT_FOUND` is
  emitted by the validator for **every node** —the namespace is inherited from the parent— so
  opening a `.stxt` file where no schema had been loaded filled the whole file with warnings, one
  per line. It is now suppressed while no schema at all is loaded: STXT-SPEC §15 and §17.2 make
  schemas a separate and **optional** layer («@STXT@ **NO DEBE** imponer reglas semánticas
  provenientes de schemas»), so such a document is not invalid, it just cannot be validated. As
  soon as any schema is loaded the warning comes back, because then an unresolved namespace is
  usually a typo. Syntax errors are unaffected. The filter lives in `AnalysisDoc`, not in the core.
- **The `.stxt` directory is now searched upwards**, from each workspace folder and from the folder
  of every document that is opened, up to the first one that exists or to the filesystem root — the
  same rule `tsconfig.json` and `.editorconfig` follow. Until now only `<workspace root>/.stxt` was
  read, so opening a subfolder of a project in VS Code, or a single file outside any folder, meant
  no schemas at all: no validation, no completion and no hover descriptions. Directories found
  outside the workspace get their own `FileSystemWatcher`, so editing a schema still reloads
  everything.
- **`@vscode/test-cli` and `@vscode/test-electron` are out of `devDependencies`.** They were never
  used: the test suite runs on plain Node against `src/test/stub/vscode.ts`, so nothing here ever
  launched Electron. 0.5.4 kept them around for a possible smoke test of `activate()` and the
  `FileSystemWatcher` — the one thing the stub cannot reach — but an unused dependency parked for a
  test that does not exist yet is just install weight, and reinstalling them the day that test is
  written costs one command.
- `npm test` is **391 passing**, with two new suites that do not use the stxt-web corpus, because
  what they check is not documents: `schemaLoader.test.ts` builds a throwaway tree with the schema
  one level above the workspace root, and `activation.test.ts` runs `activate()` itself and asks the
  provider for tokens at the exact instant it is registered. Each of its three tests fails if its
  own fix is undone. That took the stub a bit further — it now serves the document events and the
  `registerXProvider` calls — which is most of what the deferred smoke test of `activate()` needed.

## [0.5.4]

An editor-layer release: the extension no longer writes to the shared developer console, it
gets its own test suite, and that suite immediately found two bugs in the formatter.
`@stxt-lang/core` stays at 0.5.3 — no parser, schema or template behaviour changed.

- **`npm test` exists again in this repository**: mocha over the compiled output, like
  `../../stxt-js`, but **without Electron**. Only four files of `src/` touch `vscode` at runtime,
  so `src/test/stub/vscode.ts` reimplements the twenty-odd classes that are actually used and
  `src/test/register.ts` intercepts `require('vscode')` to hand it over. The providers therefore
  run in plain Node in under a second, and `@vscode/test-cli` / `@vscode/test-electron` stay
  unused, reserved for a future smoke test of `activate()`.
- **380 tests, most of them invariants over the real corpus of `../../stxt-web`** — the same idea
  as the sibling repository, so there are no fixtures to keep in sync. For each of its 44
  documents: every token falls inside its line, tokens are ordered and do not overlap, the
  relative encoding of the semantic tokens round-trips, formatting is idempotent and preserves
  the tree, and neither completion nor hover throws at any cursor position. The schemas are
  loaded through the real `SchemaLoader`, which walks `.stxt/**` over a simulated file system,
  so that layer is covered too.
- **The formatter no longer deletes the last line of a text block.** When the last line of the
  file held nothing but indentation it still belonged to the block, and right-trimming it left
  `""`, which at the end of a file is indistinguishable from the final line break: the block lost
  that line. STXT-SPEC §10.3 requires empty lines inside a block —including trailing ones— to be
  preserved. Six of the corpus documents were affected.
- **The formatter no longer adds a trailing space to nodes with no value.** `Metadata:` came back
  as `Metadata: ` because the value was concatenated after `": "` without checking whether there
  was one. It changed no content, which is why only a targeted test caught it.
- **The 22 `console.log` calls are gone** — 15 of them active, the other 7 left commented out. The
  five in `CompletionProvider` and `CompletionProviderSearch` fired on every keystroke inside a
  `.stxt` file, and all of them wrote into the Extension Host console shared by every extension.
  They now go through a new `extension/Log.ts`, which owns a **`STXT` channel in the Output panel**
  created with `{ log: true }`: VS Code timestamps each line, tags it with its level, and honours
  the level chosen in *Developer: Set Log Level…*. Per-keystroke messages (analysis, completion) log at `trace`, so
  they are off by default; schema loading logs at `info`; a schema under `.stxt/**` that cannot be
  read or fails to load logs at `error`, which used to be indistinguishable from the rest. The
  commented-out `console.log` lines in `extension.ts` and `AnalysisDoc.ts` became `trace` calls
  instead of dead code.
- `language-configuration.json` stays **empty** (`{}`), and that is now a documented decision rather
  than an oversight. Comment, bracket and indentation rules were written into it during this release
  and then dropped again: every editor behaviour in this extension is derived from parsing the
  document with `@stxt-lang/core`, so the language is defined in exactly one place — the core, which
  follows the spec — instead of being restated as a second set of hand-written regular expressions
  that drifts out of sync without anyone noticing.

## [0.5.3]

A documentation release, matching `dev.stxt:stxt-core` 0.5.3: the API the editor shows is now
documented and in one language. No parser, schema or template behaviour changed.

- All source comments of `@stxt-lang/core` are now written in **English**, so the whole project is
  in one language (the README, the licence and the error messages already were). This covers `src/`
  and `src/test`: class descriptions, inline comments, the references to the normative specs and
  the mocha `describe`/`it` titles.
- **Every exported member now carries a JSDoc comment**, which `tsc` copies into the published
  `out/**/*.d.ts`: that is what a consumer of the package reads on hover in the editor, the
  TypeScript equivalent of the javadoc Java publishes to javadoc.io. The package went from **11
  doc comments in 6 files** (4 of them tests) to **203 across all 59 source files** — the only one
  left without any is `all.ts`, which is just re-exports.
- The one exception message that was still in Spanish is now English: `NOT_STXT_SCHEMA` reads
  `Expected schema(...) but got ...`, the same text `stxt-java` emits. The error code is unchanged.
- The public surface of `all.ts` is untouched; `npm test` is still 224 passing.
- `CLAUDE.md` is now listed in `.vscodeignore`. That file is internal guidance for working on this
  repository, and up to 0.5.2 it was packaged into the `.vsix` and published to the Marketplace.

## [0.5.2]

- `@stxt-lang/core` now exports `ValidationException`, so the extension distinguishes schema warnings from syntax errors with `error instanceof ValidationException` instead of comparing `error.name` against the `'ValidationException'` string. Same behaviour, but the compiler checks it now.
- The npm package got its public face: a `README.md` (the npm page was blank), a `LICENSE`, and `author`/`keywords`/`homepage`/`bugs` filled in. The licence is MIT across the whole `stxt-lang` org — `@stxt-lang/core` declared `ISC` until now, while this extension already said MIT.
- The published tarball no longer ships `.js.map` files. `src/` is not published, so every source map dangled; dropping them takes it from 169 files / 38 kB to 115 / 27 kB.
- No parser, schema or template behaviour changed in this release.

## [0.5.1]

- Duplicate `ENUM` values now report `VALUE_DUPLICATED` from a schema too, the code `ChildLineParser` already used for the same condition in templates; `NodeDefinition.addValue` had its own `DUPLICATE_ENUM_VALUE`. It also trims the value before comparing, so `Value: alta` and `Value:   alta` are caught as duplicates (STXT-SCHEMA-SPEC 13.9 and STXT-TEMPLATE-SPEC 14.14 both say "tras la normalización por trim"); the schema path used to compare raw values and let that pair through.
- Declaring `[values]` on a non-`ENUM` type now reports `VALUES_ONLY_SUPPORTED_BY_ENUM` from a template too, not just from a schema. `TemplateParser` used its own `VALUES_NOT_IN_ENUM` for the identical condition, so the same authoring mistake changed code depending on whether it came in through `@stxt.schema` or `@stxt.template`. A template is sugar equivalent to a schema (STXT-TEMPLATE-SPEC 13), so the code should not depend on the entry point; the message is now the schema one, which also names the offending type. Raised from stxt-java, where both paths already shared the code.
- `npm run lint` is clean (0 errors, 0 warnings). The 8 `eqeqeq` warnings were all the `x == null` idiom on `string | null` parameters, rewritten with `??` or an explicit check so `undefined` keeps being covered; behavior is unchanged and the test suite confirms it.
- Real test suite (`npm test` now runs mocha over `src/test/`, 224 tests): every schema and template of `../../stxt-web/.stxt` must load, every document of its `docs/`, `es/` and `en/` must parse and validate without errors against them, a schema and its template for the same namespace must validate identically, and `NodeWriter` output must reparse to the same tree in both indent styles. This replaces the manual check that was done after each conformance change. The `test/` folder of sample documents and the `src/test.ts` script that printed `test/demo.stxt` are gone, as is the unused `.vscode-test.mjs` (no test needs the VS Code API).
- `ChildLineParser` now distinguishes an explicit empty `[]` value list from the total absence of a `[...]` clause: `getValues()` returns a non-null (possibly empty) array whenever brackets are present, and `null` only when there are no brackets at all (previously both collapsed to `null`). `TemplateParser`'s `VALUES_NOT_ALLOWED_IN_EXTERNAL_NAMESPACE` and `VALUES_NOT_ALLOWED_IN_REFERENCE` checks are updated to match: they now trigger on any explicit `[...]` (even empty), instead of requiring `values.length > 0`. So `@Nombre []` on a template reference, or `[]` on a cross-namespace child, is now correctly reported as an (attempted) values redefinition instead of being silently accepted. Ported from stxt-java.

## [0.5.0]

- A cross-namespace line in a template `Structure` may now only declare cardinality (STXT-TEMPLATE-SPEC 6.4, 10 and 14.15). Declaring `ENUM` values fails with `VALUES_NOT_ALLOWED_IN_EXTERNAL_NAMESPACE` and hanging children below it with `CHILDREN_NOT_ALLOWED_IN_EXTERNAL_NAMESPACE`; both used to be dropped silently, so part of the template was ignored without any warning. The explicit type was already rejected.
- A `@Node` reference may override the cardinality but no longer redefine the node (STXT-TEMPLATE-SPEC 6.4): values are rejected with `VALUES_NOT_ALLOWED_IN_REFERENCE` and children with `CHILDREN_NOT_ALLOWED_IN_REFERENCE`, instead of being silently ignored.
- Declaring a reference and an explicit type on the same line (`Título: (1) @Título TEXT`) now reports `REFERENCE_WITH_TYPE_NOT_ALLOWED` (STXT-TEMPLATE-SPEC 14.13). It used to be reported as `NODE_REFERENCE_NOT_VALID`, whose message claimed the reference name was wrong. Node names may contain spaces, so the type is only recognised when the remaining text is exactly the name of the node itself: `Max Threads: (?) @Max Threads` is still a plain reference.
- A reference that resolves to neither a previous definition nor an open ancestor now reports `REFERENCE_NOT_FOUND` (STXT-TEMPLATE-SPEC 14.11) instead of `TYPE_NOT_VALID: @Nombre`. Recursion through an open ancestor (`Sección: (*) @Sección`) keeps working.

## [0.4.4]

- Declaring `Children` in a schema `Node` whose type does not admit children (everything except `INLINE` and `GROUP`) now fails to load with `CHILDREN_NOT_ALLOWED_FOR_TYPE` (STXT-SCHEMA-SPEC 13.5). Same for template nodes that have children under a leaf type (STXT-TEMPLATE-SPEC 14.9).
- `HEXADECIMAL` now follows STXT-SCHEMA-SPEC 9.5 exactly: any `[0-9A-Fa-f]+` string. The even-length requirement and the `#` prefix (inherited from the Java port) are gone; spec wins over code. The two `stxt-web` documents that used the CSS notation (`intro_programacion.stxt`, `receta_2.stxt`) were fixed there by dropping the `#`.
- The binary types (`HEXADECIMAL`, `BINARY`, `BASE64`) validate the block form on the concatenation of lines, trimming each line (STXT-SCHEMA-SPEC 9.5). Whitespace *inside* a line is no longer silently removed before validating.
- Value forms are now enforced per type (STXT-SCHEMA-SPEC 9.2–9.4): inline-only types (`NUMBER`, `DATE`, `BOOLEAN`, `ENUM`, `URL`, `EMAIL`, …) reject the `>>` block form with `NOT_ALLOWED_TEXT`; `BLOCK` requires the `>>` form and rejects inline nodes (even empty ones) with `BLOCK_FORM_REQUIRED`; `GROUP` rejects the `>>` form as well as inline values.
- The embedded meta-schema now declares `Values` with `Type: GROUP` (STXT-SCHEMA-SPEC 15.2), so `Values: texto` no longer passes meta-validation.
- CLAUDE.md architecture notes updated: `Node` is mutable during parsing; `freeze()` no longer exists.

## [0.4.3]

- **Breaking**: canonical node names now follow the updated STXT-SPEC 4.3 (IDN model): NFC + Unicode lowercase, separator sequences (`-`, `_`, space) collapse to a single `-`, and **diacritics and non-Latin letters are preserved** (`Título` → `título`, `Пример 1` → `пример-1`). Name equality is now accent- and script-sensitive: `Año` and `Ano` are different nodes.
- Node names are validated against STXT-SPEC 4.2 (error rule 8): only Unicode letters and digits (categories L and Nd) plus `-`, `_` and space. `Nombre$: x` or `Nombre?: x` are now rejected with `INVALID_NODE_NAME`.
- Namespaces no longer tolerate spaces inside `( )` (STXT-SPEC 7/16, error rule 9): `Nodo ( a.b ): x` is now rejected with `INVALID_NAMESPACE`.

## [0.4.2]

- Duplicate entries for the same node in a template `Description` block are now rejected with `DESCRIPTION_ALREADY_DEFINED` (STXT-TEMPLATE-SPEC 12); previously the last entry silently overwrote the earlier one.
- Cardinalities with `Min` greater than `Max` are now rejected with `MIN_GREATER_THAN_MAX`, both in schemas (`Min:`/`Max:`, STXT-SCHEMA-SPEC 10) and in template `(min,max)` tokens (STXT-TEMPLATE-SPEC 7.1).
- Malformed template cardinalities are now rejected with `INVALID_CHILD_COUNT`: numbers must be non-negative integers with no trailing garbage (STXT-TEMPLATE-SPEC 7.1). Previously `(2x)` was accepted as 2 and `(-2)` as min=max=-2; `(1,2,3)` silently dropped the third value.
- Validation errors inside a template `Structure` block now keep their `ValidationException` type (shown as Warning) instead of being degraded to `ParseException` (shown as Error), matching the existing `Description` behavior.

## [0.4.1]

- Fixed: a file ending with a newline no longer adds a spurious empty line to a `>>` block that reaches EOF (the final newline is a line terminator, not an extra empty line; STXT-SPEC 10.3).
- New types `TIME`, `UUID` and `BINARY` (STXT-SCHEMA-SPEC 9.4/9.5), registered in `TypeRegistry` and in the embedded meta-schema. `BINARY` validates the concatenation of block lines ignoring whitespace, like the other binary types.
- Meta-schema validation errors are no longer discarded when loading schemas/templates: an invalid schema or template (unknown `Type`, negative `Min`, undeclared children, etc.) now fails to load instead of loading silently.
- A template `ENUM` without a value list (or with an empty `[]` list) is now rejected with `VALUES_EMPTY_FOR_ENUM` (STXT-TEMPLATE-SPEC 9, 13.7), matching the existing schema behavior.

## [0.4.0]

- **Breaking**: mixing tabs and spaces in the indentation of a single line is now a parse error, `MIXED_INDENTATION` (STXT-SPEC 8.1/8.3). Applies to node lines and to the block-level prefix of `>>` text lines; comments, empty lines and the free-text remainder of block lines are exempt.
- **Breaking**: closed content model enforced (STXT-SCHEMA-SPEC 6). A node may only contain children declared in its parent's `Children`; a node whose definition declares no `Children` admits none. Undeclared children are reported as `CHILD_NOT_DECLARED` on the child's line. Children of a node with no definition are not re-checked (avoids error cascades).

## [0.3.4]

- New `MARKDOWN` type (STXT-SCHEMA-SPEC 9.7): accepted in schemas and templates; validates like `TEXT` (any content, no children allowed).

## [0.3.3]

- Evaluated a less invasive hover for lines inside `TEXT BLOCK` nodes. The hover was reduced to minimal parent-block context, but remains disabled for now pending UX validation.

## [0.3.2]

- ENUM values are now matched exactly as defined; normalized values are no longer accepted.

## [0.3.1]

- Improved hover for comments: now displays the actual comment content with visual icon.
- Improved hover for text lines: now shows information when hovering over lines inside TEXT BLOCK nodes.
- Enhanced hover with visual icons for better readability (name, value, schema, etc.).
- Syntax highlighting for template content: `@stxt.template:structure` and `@stxt.template:description` nodes now display colorized STXT syntax within their text blocks.
- Improved hover information layout: better organization of node properties, schema information, and text content.
- Internal refactor: improved code clarity and maintainability with consistent naming conventions (renamed Spanish function names to English, improved variable names, added constants for separators).
- Internal refactor: unified line parsing logic with `Line` class improvements and removed `LineUtils.ts`.
- Cardinality max errors now show on both parent and each child node that exceeds the limit.
- Node methods `getChild` and `getChildrenByName` now filter by namespace (defaults to parent's namespace).

## [0.3.0]

- Template values are only allowed when the type is `ENUM`.
- Parse template node `description`.
- Display the correct line number when parsing templates.
- ENUM with normalized values.
- ENUM with no repeated values.
- ENUM types in metaschema.
- Validate types in templates.
- Filter completions when the max limit is reached.
- Validator change: now returns an array of `ValidationException`.

## [0.2.0]

- Read all schemas and templates from the `.stxt` directory (and all subdirectories).
- Added observers and validators to parsing.
- Unified the parsing process for better performance and accuracy.
- Display schema type in hover.
- Display `ENUM` values in hover.
- Autocompletion with `ENUM` values.

## [0.1.4]

- Schema description in hover
- Template validation
- Schema validation

## [0.1.3]

- Fix: node `Description` of `@stxt.template`.
- Code refactoring.
- Automatic reloading after schema/template change

## [0.1.2]

- Fixed formatting of `INLINE` nodes with values containing `()`.
- Improved completion suggestions for nested levels when text is already typed on the current line (prefix filtering).
- Added completion suggestions for top-level/root nodes, including prefix filtering.
- Reduced non-STXT completion noise by disabling word-based suggestions in comments/strings for `stxt` defaults.

## [0.1.1]

- Added template support.
- Added template loading from `.stxt/@stxt.template`.
- Schemas now have higher priority than templates.

## [0.1.0]

- Initial public release.
- Core language support for STXT files.
- Real-time validation.
- Semantic syntax highlighting (semantic tokens).
- Context-aware hover information.
- Document formatter support.
- Custom schema loading from `.stxt/@stxt.schema`.
