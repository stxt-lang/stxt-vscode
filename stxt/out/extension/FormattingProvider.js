"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtFormattingProvider = void 0;
const AnalysisDoc_1 = require("./AnalysisDoc");
const StringUtils_1 = require("../core/StringUtils");
const vscode_1 = require("vscode");
class StxtFormattingProvider {
    provideDocumentFormattingEdits(document) {
        const analysis = (0, AnalysisDoc_1.getLastAnalysis)(document);
        const edits = [];
        const lines = document.getText().split(/\r?\n/);
        lines.forEach((line, index) => {
            const node = analysis?.nodeByLine.get(index);
            const newLine = createLine(line, node);
            if (newLine !== line) {
                edits.push(vscode_1.TextEdit.replace(new vscode_1.Range(index, 0, index, line.length), newLine));
            }
        });
        return edits;
    }
}
exports.StxtFormattingProvider = StxtFormattingProvider;
// Placeholder para que compile:
function createLine(line, node) {
    if (!node) {
        return StringUtils_1.StringUtils.rightTrim(line);
    }
    let result = "\t".repeat(node.getLevel());
    if (node.isTextNode()) {
        const namespaceIndex = line.indexOf("(");
        if (namespaceIndex !== -1) {
            result += node.getName() + " (" + node.getNamespace() + ") >>";
        }
        else {
            result += node.getName() + " >>";
        }
    }
    else {
        const colonIndex = line.indexOf(":");
        const lineKey = line.substring(0, colonIndex);
        const namespaceIndex = lineKey.indexOf("(");
        if (namespaceIndex !== -1) {
            result += node.getName() + " (" + node.getNamespace() + "): " + node.getValue();
        }
        else {
            result += node.getName() + ": " + node.getValue();
        }
    }
    return result;
}
//# sourceMappingURL=FormattingProvider.js.map