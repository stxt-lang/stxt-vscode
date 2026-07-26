"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID = void 0;
const regexType_1 = require("./regexType");
exports.UUID = (0, regexType_1.regexType)("UUID", /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Invalid UUID");
//# sourceMappingURL=UUID.js.map