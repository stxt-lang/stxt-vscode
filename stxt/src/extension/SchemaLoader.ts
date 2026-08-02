import vscode from 'vscode';
import { Schema, SchemaProvider, UnifiedSchemaProvider } from '@stxt-lang/core';
import { log } from './Log';

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
        log.info(`Recargando schemas (${reason})...`);
        PROVIDER.clear();
        await loadAllWorkspaceFiles();
        await onSchemasChanged();
        log.info(`Schemas recargados (${reason}).`);
    } catch (e) {
        log.error(`Error recargando schemas (${reason}): ${String(e)}`);
    }
}

// **********
// LOAD FILES
// **********

async function loadAllWorkspaceFiles() {
    try {
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const f of folders) {
            log.trace(`Carpeta del workspace: ${f.uri.toString()}`);
            const dirUri = vscode.Uri.joinPath(f.uri, ...STXT_DIR_REL);
            await loadFilesFromDir(dirUri);
        }
    } catch (e) {
        log.error(`Error cargando los ficheros del workspace: ${String(e)}`);
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
        // Lo normal es que el workspace no tenga directorio .stxt: no es un error.
        log.trace(`Directorio no encontrado: ${dirUri.toString()} (${String(e)})`);
    }
}

async function addSchemaFile(uri: vscode.Uri, reason: 'initial' | 'changed' | 'created') {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        log.info(`Fichero (${reason}): ${uri.toString()} — ${text.length} caracteres.`);
        PROVIDER.addFile(text);
    } catch (e) {
        log.error(`Fichero (${reason}): no se ha podido cargar ${uri.toString()} (${String(e)})`);
    }
}
