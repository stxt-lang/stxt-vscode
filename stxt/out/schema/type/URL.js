"use strict";
// type/URL.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.URL = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
const RuntimeException_1 = require("../../exceptions/RuntimeException");
exports.URL = {
    getName() {
        return "URL";
    },
    validate(ndef, n) {
        const url = n.getValue();
        try {
            const parsed = new globalThis.URL(url);
            const ok = !!parsed.protocol && !!parsed.hostname;
            if (!ok) {
                throw new RuntimeException_1.RuntimeException("INVALID_URL_STRUCTURE", "Invalid URL structure");
            }
        }
        catch {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `Invalid URL: ${url}`);
        }
    },
};
//# sourceMappingURL=URL.js.map