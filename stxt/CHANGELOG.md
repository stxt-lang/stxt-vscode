# Change Log

All notable changes to the "stxt" extension are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Added Observers and validators in the parsing
- Unified parsing in process. Better performance and accuracy.

## [0.1.4]

- Schema description in hover
- Template validation
- Schema validation

## [0.1.3]

- Fix: node `Description` of `@stxt.template`.
- Code refactors
- Automatic reloading after schema/template change

## [0.1.2]

- Fixed formating of `INLINE` node with value with chars `()`
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
