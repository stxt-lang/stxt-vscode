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
const UnifiedSchemaProvider_1 = require("../runtime/UnifiedSchemaProvider");
const corpus_1 = require("./corpus");
/**
 * Regresión de carga: todos los schemas y templates reales de stxt-web deben
 * parsear, validar contra su meta-schema y transformarse a Schema sin excepción.
 *
 * Cada fichero se carga en un provider propio para que un fallo señale el
 * fichero culpable y no se enmascare con los demás.
 */
(0, corpus_1.describeCorpus)("Schemas y templates de stxt-web", root => {
    const files = (0, corpus_1.corpusFiles)(root, corpus_1.SCHEMA_DIRS);
    it("el corpus no está vacío", () => {
        assert.ok(files.length > 0, `no se ha encontrado ningún .stxt en ${path.join(root, corpus_1.SCHEMA_DIRS[0])}`);
    });
    for (const file of files) {
        it(`carga ${path.relative(root, file)}`, () => {
            const provider = new UnifiedSchemaProvider_1.UnifiedSchemaProvider();
            provider.addFile(fs.readFileSync(file, "utf-8"));
            assert.ok(provider.getAllSchemas().length > 0, "el fichero no ha producido ningún schema (¿namespace raíz distinto de @stxt.schema/@stxt.template?)");
        });
    }
    it("todos juntos se cargan en un único provider", () => {
        const provider = new UnifiedSchemaProvider_1.UnifiedSchemaProvider();
        for (const file of files) {
            provider.addFile(fs.readFileSync(file, "utf-8"));
        }
        // Schemas y templates comparten namespace a propósito (mismo modelo
        // descrito de dos formas), así que hay menos schemas que ficheros.
        assert.ok(provider.getAllSchemas().length > 0);
    });
});
//# sourceMappingURL=schemas.test.js.map