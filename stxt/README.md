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
* 🔧 Custom schema (`@stxt.template`) and template (`@stxt.schema`) support from directory `.stxt`.
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

STXT supports project-level schemas located at:

```
<workspace>/.stxt/@stxt.schema/
```

STXT also supports project-level templates located at:

```
<workspace>/.stxt/@stxt.template/
```

Schemas and templates are loaded automatically and refreshed when changes are detected.
Schemas have higher priority than templates.

---

## Release Notes

See the full version history in [CHANGELOG.md](./CHANGELOG.md).

---

## License

MIT

---
