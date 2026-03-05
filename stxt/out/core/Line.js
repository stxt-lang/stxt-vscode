"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Line = void 0;
class Line {
    // Igual que en Java: campos públicos e inmutables
    indentLevel;
    lineWithoutIndent;
    constructor(level, line) {
        this.indentLevel = level;
        this.lineWithoutIndent = line;
    }
}
exports.Line = Line;
//# sourceMappingURL=Line.js.map