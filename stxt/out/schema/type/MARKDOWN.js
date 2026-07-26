"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKDOWN = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
// STXT-SCHEMA-SPEC 9.7: a efectos de validación equivale a TEXT
// (cualquier contenido es válido; solo se prohíben hijos)
exports.MARKDOWN = {
    getName() {
        return "MARKDOWN";
    },
    validate(nodeDef, node) {
        if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_CHILDREN_TEXT", `Not allowed children nodes in node ${node.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=MARKDOWN.js.map