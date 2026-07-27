"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Parser_1 = require("../core/Parser");
const NodeWriter_1 = require("../runtime/NodeWriter");
const corpus_1 = require("./corpus");
/**
 * Regresión del writer (lo que comprobaba a mano el antiguo `src/test.ts`):
 * escribir un documento parseado y volver a parsearlo no debe perder ni
 * cambiar nada. Se prueba con los dos estilos de indentación, sobre todo el
 * corpus de stxt-web.
 */
(0, corpus_1.describeCorpus)("NodeWriter: ida y vuelta", root => {
    const files = [...(0, corpus_1.corpusFiles)(root, corpus_1.SCHEMA_DIRS), ...(0, corpus_1.corpusFiles)(root, corpus_1.DOC_DIRS)];
    for (const style of [NodeWriter_1.IndentStyle.TABS, NodeWriter_1.IndentStyle.SPACES_4]) {
        describe(style, () => {
            for (const file of files) {
                const name = path.relative(root, file);
                it(`estable en ${name}`, () => {
                    const original = new Parser_1.Parser().parseResult(fs.readFileSync(file, "utf-8"));
                    assert.strictEqual(original.getErrors().length, 0, `${name} no parsea:${(0, corpus_1.describeErrors)(original.getErrors())}`);
                    const written = NodeWriter_1.NodeWriter.toSTXTDocs(original.getNodes(), style);
                    const reparsed = new Parser_1.Parser().parseResult(written);
                    assert.strictEqual(reparsed.getErrors().length, 0, `${name}: la salida del writer no vuelve a parsear:${(0, corpus_1.describeErrors)(reparsed.getErrors())}`);
                    assert.strictEqual(NodeWriter_1.NodeWriter.toSTXTDocs(reparsed.getNodes(), style), written, `${name}: el árbol cambia al reparsear la salida del writer`);
                });
            }
        });
    }
});
//# sourceMappingURL=writer.test.js.map