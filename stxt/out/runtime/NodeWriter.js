"use strict";
// NodeWriter.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeWriter = exports.IndentStyle = void 0;
var IndentStyle;
(function (IndentStyle) {
    IndentStyle["TABS"] = "TABS";
    IndentStyle["SPACES_4"] = "SPACES_4";
})(IndentStyle || (exports.IndentStyle = IndentStyle = {}));
class NodeWriter {
    constructor() { }
    static toSTXT(node, style = IndentStyle.TABS) {
        const out = [];
        NodeWriter.writeNode(out, node, 0, style, "");
        return out.join("");
    }
    static toSTXTDocs(docs, style = IndentStyle.TABS) {
        const out = [];
        for (let i = 0; i < docs.length; i++) {
            if (i > 0)
                out.push("\n");
            NodeWriter.writeNode(out, docs[i], 0, style, "");
        }
        return out.join("");
    }
    static writeNode(out, n, depth, style, parentNs) {
        NodeWriter.indent(out, depth, style);
        const ns = n.getNamespace();
        out.push(n.getName());
        if (ns.length > 0 && ns !== parentNs)
            out.push(" (", ns, ")");
        if (n.isTextNode()) {
            out.push(" >>\n");
            for (const line of n.getTextLines()) {
                NodeWriter.indent(out, depth + 1, style);
                out.push(line, "\n");
            }
        }
        else {
            out.push(":");
            const value = n.getValue();
            if (value.length > 0)
                out.push(" ", value);
            out.push("\n");
        }
        for (const child of n.getChildren()) {
            NodeWriter.writeNode(out, child, depth + 1, style, ns);
        }
    }
    static indent(out, depth, style) {
        if (depth <= 0)
            return;
        out.push(style === IndentStyle.SPACES_4 ? "    ".repeat(depth) : "\t".repeat(depth));
    }
}
exports.NodeWriter = NodeWriter;
//# sourceMappingURL=NodeWriter.js.map