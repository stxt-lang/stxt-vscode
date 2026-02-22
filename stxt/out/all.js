"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const Parser_1 = require("./core/Parser");
const NodeWriter_1 = require("./runtime/NodeWriter");
async function main() {
    console.log("Main process INIT...");
    const texto = await (0, promises_1.readFile)("test/demo.stxt", "utf-8");
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
    const str = NodeWriter_1.NodeWriter.toSTXTDocs(nodes, NodeWriter_1.IndentStyle.SPACES_4);
    console.log(str);
    console.log("Main process END.");
}
main();
//# sourceMappingURL=all.js.map