# STXT – Semantic Text

Support for the **STXT (Semantic Text)** language in Visual Studio Code.

STXT is a structured, indentation-based language designed for semantic configuration and content definition.

More information: [https://stxt.dev](https://stxt.dev)
Ready-to-use examples: [https://github.com/stxt-lang/stxt-web](https://github.com/stxt-lang/stxt-web)

---

## Features

* ✅ Real-time validation: syntax errors as you type, and schema errors when a schema applies
* 🎨 Semantic syntax highlighting, driven by the parser (no hand-written grammar)
* 💡 Schema-aware completion: the child nodes a schema allows, and the values of an `ENUM`
* 🧠 Context-aware hover information: node, canonical name, type, allowed values, description
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
are re-indented to the level of their block (any indentation of their own beyond it is content and
stays), and everything else — comments, blank lines — is kept as it is, with only trailing
whitespace removed. It is the same formatting `stxt format` applies from the command line.

The indentation follows the editor: tabs by default for `.stxt` files, or spaces when
`editor.insertSpaces` is on for the document. With spaces a level is always four spaces, whatever
`editor.tabSize` says, because that is what the STXT specification allows.

---

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
