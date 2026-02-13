"use strict";
// type/NUMBER.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMBER = void 0;
const regexType_1 = require("./regexType");
exports.NUMBER = (0, regexType_1.regexType)("NUMBER", /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/, "Invalid number");
//# sourceMappingURL=NUMBER.js.map