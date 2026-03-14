"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL = void 0;
const regexType_1 = require("./regexType");
exports.EMAIL = (0, regexType_1.regexType)("EMAIL", /^(?=.{1,256}$)(?=.{1,64}@.{1,255}$)(?=.{1,64}@.{1,63}\..{1,63}$)[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Invalid email");
//# sourceMappingURL=EMAIL.js.map