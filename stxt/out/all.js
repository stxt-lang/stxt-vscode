"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const parserSTXT_1 = require("./parserSTXT");
async function main() {
    const texto = await (0, promises_1.readFile)("demo.stxt", "utf-8");
    //console.log(texto);
    (0, parserSTXT_1.parseSTXT)(texto);
}
main();
console.log("Hola mundo!!");
//# sourceMappingURL=all.js.map