"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMESTAMP = void 0;
const regexType_1 = require("./regexType");
exports.TIMESTAMP = (0, regexType_1.regexType)("TIMESTAMP", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})?$/, "Invalid timestamp");
//# sourceMappingURL=TIMESTAMP.js.map