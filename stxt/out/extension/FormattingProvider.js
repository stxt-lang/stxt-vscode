"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtFormattingProvider = void 0;
const vscode = __importStar(require("vscode"));
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
                edits.push(vscode.TextEdit.replace(new vscode.Range(index, 0, index, line.length), newLine));
            }
        });
        return edits;
    }
}
exports.StxtFormattingProvider = StxtFormattingProvider;
// Placeholder para que compile:
function createLine(line, node) {
    if (!node) {
        return (0, StringUtils_1.rightTrim)(line);
    }
    let result = "\t".repeat(node.getLevel());
    const indexNs = line.indexOf("(");
    if (node.isTextNode()) {
        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + ") >>";
        }
        else {
            result += node.getName() + " >>";
        }
    }
    else {
        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + "): ";
        }
        else {
            result += node.getName() + ": ";
        }
    }
    return result;
}
//# sourceMappingURL=FormattingProvider.js.map