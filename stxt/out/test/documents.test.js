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
const corpus_1 = require("./corpus");
/**
 * Regresión de validación: los documentos reales de stxt-web deben parsear sin
 * errores y validar sin avisos contra los schemas/templates del propio stxt-web.
 *
 * Es la comprobación que antes se hacía a mano tras cada cambio de conformidad.
 */
(0, corpus_1.describeCorpus)("Documentos de stxt-web", root => {
    const provider = (0, corpus_1.loadProvider)(root);
    const files = (0, corpus_1.corpusFiles)(root, corpus_1.DOC_DIRS);
    it("el corpus no está vacío", () => {
        assert.ok(files.length > 0, `no se ha encontrado ningún .stxt en ${corpus_1.DOC_DIRS.join(", ")}`);
    });
    for (const file of files) {
        const name = path.relative(root, file);
        it(`valida ${name}`, () => {
            const result = (0, corpus_1.parseWithSchemas)(fs.readFileSync(file, "utf-8"), provider);
            const errors = result.getErrors();
            assert.strictEqual(errors.length, 0, `${name} tiene ${errors.length} error(es):${(0, corpus_1.describeErrors)(errors)}`);
            assert.ok(result.getNodes().length > 0, `${name} no ha producido ningún nodo`);
        });
    }
    it("todos los documentos declaran un namespace con schema conocido", () => {
        // Si esto falla, los tests de arriba pasarían de forma trivial: sin
        // namespace el ConditionalValidator no valida nada.
        for (const file of files) {
            const nodes = new Parser_1.Parser().parseResult(fs.readFileSync(file, "utf-8")).getNodes();
            for (const node of nodes) {
                const namespace = node.getNamespace();
                const name = `${path.relative(root, file)} → ${node.getName()}`;
                assert.notStrictEqual(namespace, "", `${name}: documento sin namespace`);
                assert.ok(provider.getSchema(namespace), `${name}: no hay schema para ${namespace}`);
            }
        }
    });
});
/**
 * Un mismo namespace está descrito en stxt-web dos veces: como schema
 * (`.stxt/schemas/`) y como template (`.stxt/templates/`). Como el template se
 * compila a Schema, ambos deben validar los documentos exactamente igual.
 */
(0, corpus_1.describeCorpus)("Equivalencia schema ↔ template", root => {
    const fromSchemas = (0, corpus_1.loadProvider)(root, [path.join(".stxt", "schemas")]);
    const fromTemplates = (0, corpus_1.loadProvider)(root, [path.join(".stxt", "templates")]);
    const files = (0, corpus_1.corpusFiles)(root, corpus_1.DOC_DIRS);
    for (const file of files) {
        const name = path.relative(root, file);
        const text = fs.readFileSync(file, "utf-8");
        const namespaces = new Parser_1.Parser().parseResult(text).getNodes().map(node => node.getNamespace());
        // Solo son comparables los documentos cuyo namespace está descrito de las dos formas.
        if (!namespaces.every(ns => fromSchemas.getSchema(ns) && fromTemplates.getSchema(ns))) {
            continue;
        }
        it(`mismo resultado en ${name}`, () => {
            const codes = (provider) => (0, corpus_1.parseWithSchemas)(text, provider).getErrors().map(e => `[${e.code}] línea ${e.line}`);
            assert.deepStrictEqual(codes(fromTemplates), codes(fromSchemas), `${name}: el template y el schema no validan igual`);
        });
    }
});
//# sourceMappingURL=documents.test.js.map