# Change Log

All notable changes to the "stxt" extension are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Cardinality max errors now show on both parent and each child node that exceeds the limit.

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
