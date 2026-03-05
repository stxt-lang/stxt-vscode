"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Line = void 0;
class Line {
    // Igual que en Java: campos públicos e inmutables
    level;
    content;
    isComment;
    isBlock;
    constructor(level, content, isComment, isBlock) {
        this.level = level;
        this.content = content;
        this.isComment = isComment;
        this.isBlock = isBlock;
    }
    isEmpty() {
        return this.content.trim() === "";
    }
}
exports.Line = Line;
//# sourceMappingURL=Line.js.map