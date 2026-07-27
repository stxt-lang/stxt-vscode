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
exports.DOC_DIRS = exports.SCHEMA_DIRS = void 0;
exports.findStxtWeb = findStxtWeb;
exports.findStxtFiles = findStxtFiles;
exports.corpusFiles = corpusFiles;
exports.loadProvider = loadProvider;
exports.parseWithSchemas = parseWithSchemas;
exports.describeErrors = describeErrors;
exports.describeCorpus = describeCorpus;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Parser_1 = require("../core/Parser");
const ConditionalValidator_1 = require("../runtime/ConditionalValidator");
const SchemaValidator_1 = require("../schema/SchemaValidator");
const UnifiedSchemaProvider_1 = require("../runtime/UnifiedSchemaProvider");
/**
 * Utilidades para los tests de regresión contra el corpus real de `../../stxt-web`.
 *
 * No se copia el corpus a este repositorio a propósito: stxt-web es la fuente
 * normativa del lenguaje y los tests deben fallar cuando la implementación se
 * separa de los documentos reales, no de una copia congelada.
 */
// Carpetas de stxt-web con schemas y templates (se cargan en el provider).
exports.SCHEMA_DIRS = [".stxt"];
// Carpetas de stxt-web con documentos que deben validar contra esos schemas.
exports.DOC_DIRS = ["docs", "es", "en"];
/**
 * Localiza `stxt-web`. Se puede forzar con la variable de entorno STXT_WEB;
 * por defecto se busca como proyecto hermano (../../stxt-web desde este repo).
 */
function findStxtWeb() {
    const candidates = [
        process.env.STXT_WEB,
        // __dirname es <repo>/out/test
        path.resolve(__dirname, "..", "..", "..", "..", "stxt-web"),
    ];
    for (const candidate of candidates) {
        if (candidate && fs.existsSync(path.join(candidate, ".stxt"))) {
            return candidate;
        }
    }
    return undefined;
}
// Todos los .stxt bajo un directorio, recursivo y en orden estable.
function findStxtFiles(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...findStxtFiles(full));
        }
        else if (entry.name.endsWith(".stxt")) {
            result.push(full);
        }
    }
    return result.sort();
}
// Los .stxt de las carpetas indicadas, relativas a la raíz de stxt-web.
function corpusFiles(root, dirs) {
    return dirs.flatMap(dir => findStxtFiles(path.join(root, dir)));
}
/**
 * Carga en un provider todos los schemas/templates de las carpetas indicadas,
 * igual que hace `SchemaLoader` con `<workspace>/.stxt/**`.
 */
function loadProvider(root, dirs = exports.SCHEMA_DIRS) {
    const provider = new UnifiedSchemaProvider_1.UnifiedSchemaProvider();
    for (const file of corpusFiles(root, dirs)) {
        provider.addFile(fs.readFileSync(file, "utf-8"));
    }
    return provider;
}
/**
 * Parsea un documento validándolo contra el provider, igual que `analysisDoc`.
 */
function parseWithSchemas(text, provider) {
    const parser = new Parser_1.Parser();
    parser.registerValidator(new ConditionalValidator_1.ConditionalValidator(new SchemaValidator_1.SchemaValidator(provider)));
    return parser.parseResult(text);
}
// Mensaje legible para el assert: `[CODE] línea 12: mensaje`.
function describeErrors(errors) {
    return errors.map(e => `\n\t[${e.code}] línea ${e.line}: ${e.message}`).join("");
}
/**
 * `describe` que se salta el bloque entero (marcándolo como pendiente) cuando
 * stxt-web no está disponible, para que el test no falle en un clon aislado.
 */
function describeCorpus(title, body) {
    const root = findStxtWeb();
    if (root === undefined) {
        describe(title, () => {
            it("requiere el proyecto hermano stxt-web (usa STXT_WEB=/ruta para indicarlo)");
        });
        return;
    }
    describe(title, () => body(root));
}
//# sourceMappingURL=corpus.js.map