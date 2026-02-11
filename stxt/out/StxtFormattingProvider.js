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
class StxtFormattingProvider {
    provideDocumentFormattingEdits(document) {
        const lines = document.getText().split(/\r?\n/);
        const edits = [];
        let blockStart = -1;
        let maxKeyLength = 0;
        function flushBlock(endLine) {
            if (blockStart === -1) {
                return;
            }
            for (let i = blockStart; i < endLine; i++) {
                const line = lines[i];
                const match = line.match(/^(\s*)(\w+)\s*:\s*(.*)$/);
                if (!match)
                    continue;
                const [, indent, key, value] = match;
                const paddedKey = key.padEnd(maxKeyLength, ' ');
                const newLine = `${indent}${paddedKey} : ${value}`;
                if (newLine !== line) {
                    edits.push(vscode.TextEdit.replace(new vscode.Range(i, 0, i, line.length), newLine));
                }
            }
            blockStart = -1;
            maxKeyLength = 0;
        }
        lines.forEach((line, index) => {
            const match = line.match(/^(\s*)(\w+)\s*:\s*(.*)$/);
            if (match && !line.trim().startsWith('#')) {
                if (blockStart === -1) {
                    blockStart = index;
                }
                maxKeyLength = Math.max(maxKeyLength, match[2].length);
            }
            else {
                flushBlock(index);
            }
        });
        flushBlock(lines.length);
        return edits;
    }
}
exports.StxtFormattingProvider = StxtFormattingProvider;
//# sourceMappingURL=StxtFormattingProvider.js.map