"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaLoaderExtension = void 0;
exports.getSchema = getSchema;
exports.getSchemas = getSchemas;
exports.registerSchemaLoader = registerSchemaLoader;
const vscode_1 = __importDefault(require("vscode"));
const UnifiedSchemaProvider_1 = require("../runtime/UnifiedSchemaProvider");
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
    const watcher = vscode_1.default.workspace.createFileSystemWatcher(STXT_FILES_GLOB);
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
        const folders = vscode_1.default.workspace.workspaceFolders ?? [];
        for (const f of folders) {
            console.log(`Folder: ${f.uri}`);
            const dirUri = vscode_1.default.Uri.joinPath(f.uri, ...STXT_DIR_REL);
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
        const entries = await vscode_1.default.workspace.fs.readDirectory(dirUri);
        for (const [name, fileType] of entries) {
            const itemUri = vscode_1.default.Uri.joinPath(dirUri, name);
            if (fileType === vscode_1.default.FileType.Directory) {
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
        const bytes = await vscode_1.default.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] file ${reason}: ${uri.toString()}\n${text.length} chars.`);
        PROVIDER.addFile(text);
    }
    catch (e) {
        console.log(`[stxt] file ${reason}: could not read ${uri.toString()} (${String(e)})`);
    }
}
//# sourceMappingURL=SchemaLoader.js.map