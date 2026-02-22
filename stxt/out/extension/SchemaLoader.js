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
const TemplateSchemaProviderMemory_1 = require("../template/TemplateSchemaProviderMemory");
const SCHEMA_DIR_REL = ['.stxt', '@stxt.schema'];
const TEMPLATE_DIR_REL = ['.stxt', '@stxt.template'];
const SCHEMA_FILES_GLOB = '**/.stxt/@stxt.schema/*.stxt';
const SCHEMA_PROVIDER = new SchemaProviderMemory_1.SchemaProviderMemory();
const TEMPLATE_FILES_GLOB = '**/.stxt/@stxt.template/*.stxt';
const TEMPLATE_PROVIDER = new TemplateSchemaProviderMemory_1.TemplateSchemaProviderMemory();
class SchemaLoaderExtension {
    getSchema(namespace) {
        return getSchema(namespace);
    }
}
exports.SchemaLoaderExtension = SchemaLoaderExtension;
function getSchema(schema) {
    try {
        console.log("Search schema..." + schema);
        const result = SCHEMA_PROVIDER.getSchema(schema);
        return result;
    }
    catch (e) {
        // Continuamos
        console.log("Not found in schema\nContinue with template");
    }
    const result = TEMPLATE_PROVIDER.getSchema(schema);
    return result;
}
// ****************
// Register loaders
// ****************
function registerSchemaLoader(context) {
    // Carga inicial
    void loadAllWorkspaceSchemas();
    void loadAllWorkspaceTemplates();
    // Watcher de cualquier fichero .stxt dentro del directorio
    const watcherSchema = vscode.workspace.createFileSystemWatcher(SCHEMA_FILES_GLOB);
    context.subscriptions.push(watcherSchema, watcherSchema.onDidCreate(uri => void addSchemaFile(uri, 'created')), watcherSchema.onDidChange(uri => void addSchemaFile(uri, 'changed')), watcherSchema.onDidDelete(uri => {
        console.log(`[stxt] schema deleted: ${uri.toString()}`);
    }));
    // Watcher de cualquier fichero .stxt dentro del directorio
    const watcherTemplate = vscode.workspace.createFileSystemWatcher(TEMPLATE_FILES_GLOB);
    context.subscriptions.push(watcherTemplate, watcherTemplate.onDidCreate(uri => void addTemplateFile(uri, 'created')), watcherTemplate.onDidChange(uri => void addTemplateFile(uri, 'changed')), watcherTemplate.onDidDelete(uri => {
        console.log(`[stxt] template deleted: ${uri.toString()}`);
    }));
}
// ************
// LOAD SCHEMAS
// ************
async function loadAllWorkspaceSchemas() {
    try {
        console.log("Init loading workspace...");
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const f of folders) {
            console.log(`Folder: ${f.uri}`);
            const dirUri = vscode.Uri.joinPath(f.uri, ...SCHEMA_DIR_REL);
            await loadSchemasFromDir(dirUri);
        }
        console.log("Ok loading workspace.");
    }
    catch (e) {
        console.log("Error loading all workspace", e);
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
// **************
// LOAD TEMPLATES
// **************
async function loadAllWorkspaceTemplates() {
    try {
        console.log("Init loading workspace...");
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const f of folders) {
            console.log(`Folder: ${f.uri}`);
            const dirUri = vscode.Uri.joinPath(f.uri, ...TEMPLATE_DIR_REL);
            await loadTemplatesFromDir(dirUri);
        }
        console.log("Ok loading workspace.");
    }
    catch (e) {
        console.log("Error loading all workspace", e);
    }
}
async function loadTemplatesFromDir(dirUri) {
    try {
        const entries = await vscode.workspace.fs.readDirectory(dirUri);
        for (const [name] of entries) {
            if (name.endsWith('.stxt')) {
                const fileUri = vscode.Uri.joinPath(dirUri, name);
                await addTemplateFile(fileUri, 'initial');
            }
        }
    }
    catch (e) {
        console.log(`[stxt] template dir not found: ${dirUri.toString()} (${String(e)})`);
    }
}
async function addTemplateFile(uri, reason) {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] template ${reason}: ${uri.toString()}\n${text.length} chars.`);
        TEMPLATE_PROVIDER.addTemplate(text);
    }
    catch (e) {
        console.log(`[stxt] template ${reason}: could not read ${uri.toString()}:\n(${String(e)})`);
    }
}
//# sourceMappingURL=SchemaLoader.js.map