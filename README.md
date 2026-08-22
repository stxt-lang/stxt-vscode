# STXT – Semantic Text

Support for the **STXT (Semantic Text)** language in Visual Studio Code.

STXT is a structured, indentation-based language designed for semantic configuration and content definition.

More information: [https://stxt.dev](https://stxt.dev)
Ready-to-use examples: [https://github.com/stxt-lang/stxt-web](https://github.com/stxt-lang/stxt-web)

---

## Features

* ✅ Real-time validation: syntax errors as you type, and schema errors against the resolution chain (switchable with `stxt.schemaValidation`)
* 🎨 Semantic syntax highlighting, driven by the parser (no hand-written grammar); the content
  of blocks whose schema type is `MARKDOWN` is highlighted as Markdown (headings, emphasis,
  code, lists, quotes, links) with the colours of your theme
* 💡 Schema-aware completion: the child nodes a schema allows, and the values of an `ENUM`
* 🧠 Hover: what the schema or template says about the node — description, type, allowed values;
  with `stxt.developerMode`, the full technical card
* 🔎 Go to definition (F12 / Ctrl+click): from a node to the `Node:` that declares it in its
  schema, or to its line inside the `Structure` of its template; from a namespace to the
  definition document itself
* ✍️ Document formatting
* 🔧 Custom schema (`@stxt.schema`) and template (`@stxt.template`) support, resolved from the
  `.stxt` directories of the project, the user and the system.
* 📐 Indentation configured for STXT (1 tab = 4 spaces)

The parser is [`@stxt-lang/core`](https://www.npmjs.com/package/@stxt-lang/core), the same one
the [`stxt` command line](https://www.npmjs.com/package/@stxt-lang/cli) and the
[playground](https://play.stxt.dev) run on, so the editor, the CLI and the browser agree.

---

## Example

```stxt
Title: Home
    Author: Joan
    Description: Example page

    Content >>
        This is a text block.
        It supports multiple lines.

# This is a comment
```

---

## Formatting

Use **Format Document** to normalize the document: every line that opens a node is re-rendered in
its canonical form (one space after the colon, no trailing whitespace), the lines of a `>>` block
— blank ones included — are re-indented to the level of their block (any indentation of their own
beyond it is content and stays), the whole indentation units of a comment (tabs or groups of four spaces) are converted to
the editor's style, one for one, and everything else — the text of the comments, blank lines — is
kept as it is, with only trailing whitespace removed. It is the `Formatter` of `@stxt-lang/core`,
the same one `stxt format` applies from the command line and the playground uses.

The indentation follows the editor: tabs by default for `.stxt` files, or spaces when
`editor.insertSpaces` is on for the document. With spaces a level is always four spaces, whatever
`editor.tabSize` says, because that is what the STXT specification allows.

---

## Settings

| Setting | Default | What it does |
|---|---|---|
| `stxt.schemaValidation` | `true` | Validate every document against the schemas and templates found through its resolution chain. A namespace that no definition covers is a `SCHEMA_NOT_FOUND` warning — also when the chain has no definition at all: the setting decides whether a document is validated, not whether unrelated definitions happen to be installed. Off: only the syntax is checked (definition documents are not checked against their meta-schema either), like `stxt validate --no-schema`. |
| `stxt.developerMode` | `false` | Off: hovering a node shows what its schema or template declares for it — the description, the type and, for an `ENUM`, the allowed values (nothing if no grammar declares the node). On: the technical card — inline/block form and level, name, canonical and qualified names, value, the schema type and allowed values, the content of a text block — and a card over comments too. |

The editor defaults for `.stxt` files (tabs, tab size 4, no indentation detection, suggestions on)
come with the extension and can be overridden per user or workspace as usual.

## Schemas and Templates

Schemas (`@stxt.schema`) and templates (`@stxt.template`) live in `.stxt/` directories and are
resolved following the **STXT Discovery** specification. For each document, the chain is:

```
<document dir>/.stxt/        every ancestor directory, nearest first
~/.stxt/                     user level    (%USERPROFILE%\.stxt on Windows)
/etc/stxt/                   system level  (%ProgramData%\stxt on Windows)
```

The nearest level that defines a namespace wins; levels further out still provide the namespaces
nobody nearer defines. Setting the `STXT_PATH` environment variable replaces the whole chain with
its entries.

Schemas and templates are loaded automatically and refreshed when changes are detected. **Go to
definition** on a node name opens the schema or template that defines it, so the resolution chain
can be inspected from any document. The
**STXT** output channel (View → Output) shows which resolution directories were found and which
schemas were loaded — the first place to look when a document is not being validated.

---

## Release Notes

See the full version history in [CHANGELOG.md](./CHANGELOG.md).

---

## License

MIT

---
