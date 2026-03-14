import vscode from 'vscode';
import { Schema } from '../schema/Schema';
import { SchemaProvider } from '../schema/SchemaProvider';
import { UnifiedSchemaProvider } from '../runtime/UnifiedSchemaProvider';

const STXT_DIR_REL = ['.stxt'];
const STXT_FILES_GLOB = '**/.stxt/**/*.stxt';
const PROVIDER = new UnifiedSchemaProvider();

export class SchemaLoaderExtension implements SchemaProvider {
    getSchema(namespace: string): Schema | null | undefined {
        return getSchema(namespace);
    }
}

export function getSchema(schema: string): Schema | undefined | null {
    return PROVIDER.getSchema(schema);
}

export function getSchemas(): ReadonlyArray<Schema> {
    return PROVIDER.getAllSchemas();
}

// ****************
// Register loaders
// ****************

export async function registerSchemaLoader(context: vscode.ExtensionContext, onSchemasChanged: () => void | Promise<void>) {
    // Watcher de cualquier fichero .stxt dentro del directorio .stxt
    const watcher = vscode.workspace.createFileSystemWatcher(STXT_FILES_GLOB);
    context.subscriptions.push(
        watcher,
        watcher.onDidCreate(() => reloadAllSchemaData('file created', onSchemasChanged)),
        watcher.onDidChange(() => reloadAllSchemaData('file changed', onSchemasChanged)),
        watcher.onDidDelete(() => reloadAllSchemaData('file deleted', onSchemasChanged)),
    );

    // Carga inicial de schemas y revalidación del workspace.
    await reloadAllSchemaData('initial load', onSchemasChanged);
}

async function reloadAllSchemaData(reason: string, onSchemasChanged: () => void | Promise<void>) {
    try {
        console.log(`[stxt] reloading schema data (${reason})...`);
        PROVIDER.clear();
        await loadAllWorkspaceFiles();
        await onSchemasChanged();
        console.log(`[stxt] schema data reloaded (${reason}).`);
    } catch (e) {
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
    } catch (e) {
        console.log("Error loading all workspace", e);
    }
}

async function loadFilesFromDir(dirUri: vscode.Uri) {
    try {
        const entries: [string, vscode.FileType][] = await vscode.workspace.fs.readDirectory(dirUri);

        for (const [name, fileType] of entries) {
            const itemUri = vscode.Uri.joinPath(dirUri, name);
            
            if (fileType === vscode.FileType.Directory) {
                // Recursivamente cargar archivos de subdirectorios
                await loadFilesFromDir(itemUri);
            } else if (name.endsWith('.stxt')) {
                await addSchemaFile(itemUri, 'initial');
            }
        }
    } catch (e) {
        console.log(`[stxt] dir not found: ${dirUri.toString()} (${String(e)})`);
    }
}

async function addSchemaFile(uri: vscode.Uri, reason: 'initial' | 'changed' | 'created') {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] file ${reason}: ${uri.toString()}\n${text.length} chars.`);
        PROVIDER.addFile(text);
    } catch (e) {
        console.log(`[stxt] file ${reason}: could not read ${uri.toString()} (${String(e)})`);
    }
}
