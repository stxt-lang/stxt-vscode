# Change Log

All notable changes to the "stxt" extension are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
