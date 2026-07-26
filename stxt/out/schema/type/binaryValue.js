"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binaryValue = binaryValue;
// STXT-SCHEMA-SPEC 9.5: en la forma BLOCK la validación se aplica sobre la
// concatenación de las líneas del bloque, ignorando saltos de línea, líneas
// vacías y espacios o tabuladores iniciales y finales de cada línea.
function binaryValue(node) {
    if (!node.isTextNode()) {
        return node.getValue();
    }
    return node.getTextLines().map((line) => line.trim()).join("");
}
//# sourceMappingURL=binaryValue.js.map