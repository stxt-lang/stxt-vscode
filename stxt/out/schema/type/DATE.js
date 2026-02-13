"use strict";
// type/DATE.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATE = void 0;
const regexType_1 = require("./regexType");
exports.DATE = (0, regexType_1.regexType)("DATE", /^\d{4}-\d{2}-\d{2}$/, "Invalid date");
//# sourceMappingURL=DATE.js.map