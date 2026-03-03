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
exports.getSchemas = getSchemas;
exports.registerSchemaLoader = registerSchemaLoader;
const vscode = __importStar(require("vscode"));
const UnifiedSchemaProvider_1 = require("./UnifiedSchemaProvider");
const STXT_DIR_REL = ['.stxt'];
const STXT_FILES_GLOB = '**/.stxt/**/*.stxt';
const PROVIDER = new UnifiedSchemaProvider_1.UnifiedSchemaProvider();
class SchemaLoaderExtension {
    getSchema(namespace) {
        return getSchema(namespace);
    }
}
exports.SchemaLoaderExtension = SchemaLoaderExtension;
function getSchema(schema) {
    return PROVIDER.getSchema(schema);
}
function getSchemas() {
    return PROVIDER.getAllSchemas();
}
// ****************
// Register loaders
// ****************
async function registerSchemaLoader(context, onSchemasChanged) {
    const reloadScheduler = createReloadScheduler(onSchemasChanged);
    // Watcher de cualquier fichero .stxt dentro del directorio .stxt
    const watcher = vscode.workspace.createFileSystemWatcher(STXT_FILES_GLOB);
    context.subscriptions.push(watcher, watcher.onDidCreate(() => reloadScheduler.schedule('file created')), watcher.onDidChange(() => reloadScheduler.schedule('file changed')), watcher.onDidDelete(() => reloadScheduler.schedule('file deleted')), { dispose: reloadScheduler.dispose });
    // Carga inicial de schemas y revalidación del workspace.
    await reloadAllSchemaData('initial load', onSchemasChanged);
}
function createReloadScheduler(onSchemasChanged) {
    let reloadTimer;
    const schedule = (reason) => {
        if (reloadTimer) {
            clearTimeout(reloadTimer);
        }
        reloadTimer = setTimeout(() => {
            void reloadAllSchemaData(reason, onSchemasChanged);
        }, 120);
    };
    const dispose = () => {
        if (reloadTimer) {
            clearTimeout(reloadTimer);
            reloadTimer = undefined;
        }
    };
    return { schedule, dispose };
}
async function reloadAllSchemaData(reason, onSchemasChanged) {
    try {
        console.log(`[stxt] reloading schema data (${reason})...`);
        PROVIDER.clear();
        await loadAllWorkspaceFiles();
        await onSchemasChanged();
        console.log(`[stxt] schema data reloaded (${reason}).`);
    }
    catch (e) {
        console.log(`[stxt] error reloading schema data (${reason})`, e);
    }
}
// **********
// LOAD FILES
// **********
async function loadAllWorkspaceFiles() {
    try {
        console.log("Init loading workspace files...");
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const f of folders) {
            console.log(`Folder: ${f.uri}`);
            const dirUri = vscode.Uri.joinPath(f.uri, ...STXT_DIR_REL);
            await loadFilesFromDir(dirUri);
        }
        console.log("Ok loading workspace.");
    }
    catch (e) {
        console.log("Error loading all workspace", e);
    }
}
async function loadFilesFromDir(dirUri) {
    try {
        const entries = await vscode.workspace.fs.readDirectory(dirUri);
        for (const [name, fileType] of entries) {
            const itemUri = vscode.Uri.joinPath(dirUri, name);
            if (fileType === vscode.FileType.Directory) {
                // Recursivamente cargar archivos de subdirectorios
                await loadFilesFromDir(itemUri);
            }
            else if (name.endsWith('.stxt')) {
                await addSchemaFile(itemUri, 'initial');
            }
        }
    }
    catch (e) {
        console.log(`[stxt] dir not found: ${dirUri.toString()} (${String(e)})`);
    }
}
async function addSchemaFile(uri, reason) {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] file ${reason}: ${uri.toString()}\n${text.length} chars.`);
        PROVIDER.addFile(text);
    }
    catch (e) {
        console.log(`[stxt] file ${reason}: could not read ${uri.toString()} (${String(e)})`);
    }
}
//# sourceMappingURL=SchemaLoader.js.map