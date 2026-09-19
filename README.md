# STXT Language

Support for the **STXT** language in Visual Studio Code.

STXT is a **Human-First** language, designed for documents and structured data: indentation is
the structure, free text is literal, and schemas are written in STXT itself.

```stxt
# This is a comment
Page: Home
    Author: Joan
    Description: Example page
    Content >>
        This is a text block.
        It supports multiple lines.
```

- More information: <https://stxt.dev>
- Ready-to-use examples: <https://github.com/stxt-lang/stxt-lang>

## Features

- **Validation while typing**: syntax errors, and schema errors against the definitions of the project
- **Semantic highlighting**, driven by the parser. Blocks of type `MARKDOWN` are highlighted as Markdown
- **Completion**: the child nodes a schema allows, and the values of an `ENUM`
- **Hover**: the description, the type and the allowed values of a node
- **Go to definition** (F12 / Ctrl+click): from a node to the line that declares it in its schema or template
- **Format Document**
- **Schemas and templates** (`@stxt.schema`, `@stxt.template`), resolved from the `.stxt` directories of the project, the user and the system
- **Indentation** configured for STXT (1 tab = 4 spaces)

The parser is [`@stxt-lang/core`](https://www.npmjs.com/package/@stxt-lang/core), the same one as the
[`stxt` command line](https://www.npmjs.com/package/@stxt-lang/cli) and the
[playground](https://play.stxt.dev). The editor, the CLI and the browser give the same result.

## Schemas and templates

Schemas and templates live in `.stxt/` directories, and are resolved following
**STXT-DISCOVERY-SPEC**. For each document, the chain is:

```
<document dir>/.stxt/        every ancestor directory, nearest first
~/.stxt/                     user level    (%USERPROFILE%\.stxt on Windows)
/etc/stxt/                   system level  (%ProgramData%\stxt on Windows)
```

- The nearest level that defines a namespace wins. The levels further out still provide the
  namespaces that nobody nearer defines.
- The `STXT_PATH` environment variable replaces the whole chain with its entries.
- Definitions are loaded automatically, and reloaded when they change.

When a document is not being validated, the **STXT** output channel (View → Output) shows
which directories were found and which definitions were loaded.

## Formatting

**Format Document** rewrites the document line by line:

| Line | What happens |
|---|---|
| A line that opens a node | Rewritten in canonical form: one space after the colon, no trailing whitespace |
| A line of a `>>` block | Re-indented to the level of its block. Any indentation beyond it is content, and stays |
| A comment | Its indentation units are converted to the editor's style. Its text is kept |
| A blank line | Kept |

It is the `Formatter` of `@stxt-lang/core`, the same one as `stxt format` and the playground.

The indentation follows the editor: tabs by default for `.stxt` files, or spaces when
`editor.insertSpaces` is on. With spaces a level is always four spaces, whatever
`editor.tabSize` says, because that is what the STXT specification allows.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `stxt.schemaValidation` | `true` | Validates every document against the definitions of its resolution chain. A namespace that no definition covers is a `SCHEMA_NOT_FOUND` warning. Off: only the syntax is checked, like `stxt validate --no-schema` |
| `stxt.developerMode` | `false` | Off: the hover shows what the schema or template declares for the node. On: the hover shows the technical card (form, level, canonical and qualified names, value, type), also over comments |

The editor defaults for `.stxt` files (tabs, tab size 4, no indentation detection, suggestions on)
come with the extension, and can be overridden per user or per workspace.

## Release Notes

See the full version history in [CHANGELOG.md](./CHANGELOG.md).

## License

MIT
