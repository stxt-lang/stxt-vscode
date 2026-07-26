"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INLINE = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.INLINE = {
    getName() {
        return "INLINE";
    },
    validate(nodeDef, node) {
        // Forma del valor INLINE (STXT-SCHEMA-SPEC 9.2): no admite bloque '>>'
        if (node.isTextNode()) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${node.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=INLINE.js.map