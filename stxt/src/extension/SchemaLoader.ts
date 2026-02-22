import * as vscode from 'vscode';
import { Schema } from '../schema/Schema';
import { SchemaProvider } from '../schema/SchemaProvider';
import { SchemaProviderMemory } from '../schema/SchemaProviderMemory';
import { SchemaProviderMeta } from '../schema/SchemaProviderMeta';

const SCHEMA_DIR_REL = ['.stxt', '@stxt.schema'];
const SCHEMA_FILES_GLOB = '**/.stxt/@stxt.schema/*.stxt';

const SCHEMA_PROVIDER: SchemaProviderMemory = new SchemaProviderMemory(new SchemaProviderMeta());

export class SchemaLoaderExtension implements SchemaProvider {
    getSchema(namespace: string): Schema | null | undefined {
        return getSchema(namespace);
    }
}

export function getSchema(schema: string): Schema | undefined | null {
    return SCHEMA_PROVIDER.getSchema(schema);
}

export function registerSchemaLoader(context: vscode.ExtensionContext) {
    // Carga inicial
    void loadAllWorkspaceSchemas();

    // Watcher de cualquier fichero .stxt dentro del directorio
    const watcher = vscode.workspace.createFileSystemWatcher(SCHEMA_FILES_GLOB);
    context.subscriptions.push(
        watcher,
        watcher.onDidCreate(uri => void addSchemaFile(uri, 'created')),
        watcher.onDidChange(uri => void addSchemaFile(uri, 'changed')),
        watcher.onDidDelete(uri => {console.log(`[stxt] schema deleted: ${uri.toString()}`);
        })
    );
}

async function loadAllWorkspaceSchemas() {
    const folders = vscode.workspace.workspaceFolders ?? [];
    for (const f of folders) {
        const dirUri = vscode.Uri.joinPath(f.uri, ...SCHEMA_DIR_REL);
        await loadSchemasFromDir(dirUri);
    }
}

async function loadSchemasFromDir(dirUri: vscode.Uri) {
    try {
        const entries:[string, vscode.FileType][] = await vscode.workspace.fs.readDirectory(dirUri);

        for (const [name] of entries) {
            if (name.endsWith('.stxt')) {
                const fileUri = vscode.Uri.joinPath(dirUri, name);
                await addSchemaFile(fileUri, 'initial');
            }
        }
    } catch (e) {
        console.log(`[stxt] schema dir not found: ${dirUri.toString()} (${String(e)})`);
    }
}

async function addSchemaFile(uri: vscode.Uri, reason: 'initial' | 'changed' | 'created') {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] schema ${reason}: ${uri.toString()}\n${text.length} chars.`);
        SCHEMA_PROVIDER.addSchema(text);

    } catch (e) {
        console.log(`[stxt] schema ${reason}: could not read ${uri.toString()} (${String(e)})`);
    }
}
