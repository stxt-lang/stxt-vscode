"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSTXT = parseSTXT;
function parseSTXT(text) {
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
        const lineNumber = index;
        console.log(`${index}: ${line}`);
    });
}
//# sourceMappingURL=parserSTXT.js.map