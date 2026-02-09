import { readFile } from "fs/promises";
import { text } from "stream/consumers";
import { parseSTXT } from "./parserSTXT";

async function main() {
    const texto: string = await readFile("demo.stxt", "utf-8");
    //console.log(texto);

    parseSTXT(texto);
}

main();

console.log("Hola mundo!!");