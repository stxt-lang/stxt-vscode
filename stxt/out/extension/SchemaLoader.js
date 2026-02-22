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
exports.SchemaLoaderExtension = void 0;
exports.getSchema = getSchema;
exports.registerSchemaLoader = registerSchemaLoader;
const vscode = __importStar(require("vscode"));
const SchemaProviderMemory_1 = require("../schema/SchemaProviderMemory");
const SchemaProviderMeta_1 = require("../schema/SchemaProviderMeta");
const SCHEMA_DIR_REL = ['.stxt', '@stxt.schema'];
const SCHEMA_FILES_GLOB = '**/.stxt/@stxt.schema/*.stxt';
const SCHEMA_PROVIDER = new SchemaProviderMemory_1.SchemaProviderMemory(new SchemaProviderMeta_1.SchemaProviderMeta());
class SchemaLoaderExtension {
    getSchema(namespace) {
        return getSchema(namespace);
    }
}
exports.SchemaLoaderExtension = SchemaLoaderExtension;
function getSchema(schema) {
    return SCHEMA_PROVIDER.getSchema(schema);
}
function registerSchemaLoader(context) {
    // Carga inicial
    void loadAllWorkspaceSchemas();
    // Watcher de cualquier fichero .stxt dentro del directorio
    const watcher = vscode.workspace.createFileSystemWatcher(SCHEMA_FILES_GLOB);
    context.subscriptions.push(watcher, watcher.onDidCreate(uri => void addSchemaFile(uri, 'created')), watcher.onDidChange(uri => void addSchemaFile(uri, 'changed')), watcher.onDidDelete(uri => {
        console.log(`[stxt] schema deleted: ${uri.toString()}`);
    }));
}
async function loadAllWorkspaceSchemas() {
    const folders = vscode.workspace.workspaceFolders ?? [];
    for (const f of folders) {
        const dirUri = vscode.Uri.joinPath(f.uri, ...SCHEMA_DIR_REL);
        await loadSchemasFromDir(dirUri);
    }
}
async function loadSchemasFromDir(dirUri) {
    try {
        const entries = await vscode.workspace.fs.readDirectory(dirUri);
        for (const [name] of entries) {
            if (name.endsWith('.stxt')) {
                const fileUri = vscode.Uri.joinPath(dirUri, name);
                await addSchemaFile(fileUri, 'initial');
            }
        }
    }
    catch (e) {
        console.log(`[stxt] schema dir not found: ${dirUri.toString()} (${String(e)})`);
    }
}
async function addSchemaFile(uri, reason) {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] schema ${reason}: ${uri.toString()}\n${text.length} chars.`);
        SCHEMA_PROVIDER.addSchema(text);
    }
    catch (e) {
        console.log(`[stxt] schema ${reason}: could not read ${uri.toString()} (${String(e)})`);
    }
}
//# sourceMappingURL=SchemaLoader.js.map