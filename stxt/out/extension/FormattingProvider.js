"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtFormattingProvider = void 0;
const vscode_1 = __importDefault(require("vscode"));
const AnalysisDoc_1 = require("./AnalysisDoc");
const StringUtils_1 = require("../core/StringUtils");
class StxtFormattingProvider {
    provideDocumentFormattingEdits(document) {
        const analysis = (0, AnalysisDoc_1.getLastAnalysis)(document);
        const edits = [];
        const lines = document.getText().split(/\r?\n/);
        lines.forEach((line, index) => {
            const node = analysis?.nodeByLine.get(index);
            const newLine = createLine(line, node);
            if (newLine !== line) {
                edits.push(vscode_1.default.TextEdit.replace(new vscode_1.default.Range(index, 0, index, line.length), newLine));
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
        const indexNs = line.indexOf("(");
        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + ") >>";
        }
        else {
            result += node.getName() + " >>";
        }
    }
    else {
        const indexPuntos = line.indexOf(":");
        const lineKey = line.substring(0, indexPuntos);
        const indexNs = lineKey.indexOf("(");
        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + "): " + node.getValue();
        }
        else {
            result += node.getName() + ": " + node.getValue();
        }
    }
    return result;
}
//# sourceMappingURL=FormattingProvider.js.map