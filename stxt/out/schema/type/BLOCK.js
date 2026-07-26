"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.BLOCK = {
    getName() {
        return "BLOCK";
    },
    validate(nodeDef, node) {
        // Forma del valor BLOCK (STXT-SCHEMA-SPEC 9.2): sólo bloque '>>', no forma inline
        if (!node.isTextNode()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "BLOCK_FORM_REQUIRED", `Node ${node.getQualifiedName()} requires block form '>>'`);
        }
    },
};
//# sourceMappingURL=BLOCK.js.map