"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const Parser_1 = require("./core/Parser");
async function main() {
    const texto = await (0, promises_1.readFile)("demo.stxt", "utf-8");
    //console.log(texto);
    const parser = new Parser_1.Parser();
    const nodes = parser.parse(texto);
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`Node ${i + 1}: ${node}`);
        const children = node.getChildren();
        for (let c = 0; c < children.length; c++) {
            const child = children[c];
            console.log(`\tChild ${i + 1}: ${child}`);
        }
    }
}
main();
console.log("Hola mundo!!");
//# sourceMappingURL=all.js.map