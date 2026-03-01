"use strict";
// type/BASE64.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE64 = void 0;
const ParseException_1 = require("../../exceptions/ParseException");
const RuntimeException_1 = require("../../exceptions/RuntimeException");
const StringUtils_1 = require("../../core/StringUtils");
exports.BASE64 = {
    getName() {
        return "BASE64";
    },
    validate(ndef, n) {
        const raw = StringUtils_1.StringUtils.cleanSpaces(n.getText());
        try {
            // Intentamos decodificar
            const buf = Buffer.from(raw, "base64");
            // Re-encode para verificar consistencia
            // (evita aceptar cadenas parcialmente válidas)
            const reencoded = buf.toString("base64");
            // Normalizamos padding para comparar
            const normalizedInput = raw.replace(/=+$/, "");
            const normalizedReencoded = reencoded.replace(/=+$/, "");
            if (normalizedInput !== normalizedReencoded) {
                throw new RuntimeException_1.RuntimeException("INVALID_BASE64", "Invalid base64");
            }
        }
        catch {
            throw new ParseException_1.ParseException(n.getLine(), "INVALID_VALUE", `Node '${n.getName()}' Invalid Base64`);
        }
    },
};
//# sourceMappingURL=BASE64.js.map