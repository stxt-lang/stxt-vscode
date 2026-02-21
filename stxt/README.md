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
* 🔧 Custom schema support (`.stxt/@stxt.schema`)
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

## Schemas

STXT supports project-level schemas located at:

```
<workspace>/.stxt/@stxt.schema/
```

Schemas are loaded automatically and refreshed when changes are detected.

---

## Version 0.1.0

Initial public release:

* Core language support
* Semantic tokens
* Validation
* Hover information
* Formatter
* Schema loading

---

## License

MIT

---
