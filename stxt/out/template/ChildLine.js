"use strict";
// ChildLine.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildLine = void 0;
class ChildLine {
    min;
    max;
    values;
    type;
    constructor(type, min, max, values) {
        this.type = type;
        this.min = min;
        this.max = max;
        this.values = values;
    }
    getType() {
        return this.type;
    }
    getMin() {
        return this.min;
    }
    getMax() {
        return this.max;
    }
    getValues() {
        return this.values;
    }
    toString() {
        return `ChildLine [type=${this.type}, min=${this.min}, max=${this.max}, values=${this.values ? `[${this.values.join(", ")}]` : "null"}]`;
    }
}
exports.ChildLine = ChildLine;
//# sourceMappingURL=ChildLine.js.map