import { readFile } from "fs/promises";
import { Parser } from "./core/Parser";
import { Node } from "./core/Node";
import { IndentStyle, NodeWriter } from "./runtime/NodeWriter";

async function main() {
    const texto: string = await readFile("demo.stxt", "utf-8");
    //console.log(texto);

    const parser:Parser = new Parser();
    const nodes: Node[] = parser.parse(texto);

    for(let i = 0; i<nodes.length; i++)
    {
        const node = nodes[i];
        console.log(`Node ${i+1}: ${node}`);

        const children = node.getChildren();
        for (let c = 0; c<children.length; c++)
        {
            const child = children[c];
            console.log(`\tChild ${i+1}: ${child}`);
        }
    }
    const str = NodeWriter.toSTXTDocs(nodes, IndentStyle.SPACES_4);
    console.log(str);
}

main();

console.log("Hola mundo!!");