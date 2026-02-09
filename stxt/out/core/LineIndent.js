"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineIndent = void 0;
// LineIndent.ts
class LineIndent {
    // Igual que en Java: campos públicos e inmutables
    indentLevel;
    lineWithoutIndent;
    constructor(level, line) {
        this.indentLevel = level;
        this.lineWithoutIndent = line;
    }
}
exports.LineIndent = LineIndent;
//# sourceMappingURL=LineIndent.js.map