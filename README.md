# STXT – Semantic Text

Support for the **STXT (Semantic Text)** language in Visual Studio Code.

STXT is a structured, indentation-based language designed for semantic configuration and content definition.

More information: [https://stxt.dev](https://stxt.dev)
Ready-to-use examples: [https://github.com/stxt-lang/stxt-web](https://github.com/stxt-lang/stxt-web)

---

## Features

* ✅ Real-time validation
* 🎨 Semantic syntax highlighting
* 🧠 Context-aware hover information
* ✍️ Document formatting
* 🔧 Custom schema (`@stxt.schema`) and template (`@stxt.template`) support, resolved from the
  `.stxt` directories of the project, the user and the system.
* 📐 Indentation configured for STXT (1 tab = 4 spaces)

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

Use **Format Document** to normalize spacing and structure.

STXT formatting preserves indentation and block semantics.

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

Schemas and templates are loaded automatically and refreshed when changes are detected.

---

## Release Notes

See the full version history in [CHANGELOG.md](./CHANGELOG.md).

---

## License

MIT

---
