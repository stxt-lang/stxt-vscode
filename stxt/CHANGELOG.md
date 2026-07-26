# Change Log

All notable changes to the "stxt" extension are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
