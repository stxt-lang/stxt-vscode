import * as vscode from 'vscode';
import { Parser } from '../core/Parser';
import { Node } from '../core/Node';
import { SchemaParser } from '../schema/SchemaParser';
import { Schema } from '../schema/Schema';
import { SchemaProvider } from '../schema/SchemaProvider';
import { SchemaProviderMemory } from '../schema/SchemaProviderMemory';

const SCHEMA_DIR_REL = ['.stxt', '@stxt.schema'];
const SCHEMA_FILES_GLOB = '**/.stxt/@stxt.schema/*.stxt';

const SCHEMA_PROVIDER: SchemaProviderMemory = new SchemaProviderMemory();

export class SchemaLoaderExtension implements SchemaProvider {
    getSchema(namespace: string): Schema | null | undefined {
        return getSchema(namespace);
    }
}

export function getSchema(schema: string): Schema | undefined {
    return SCHEMA_PROVIDER.getSchema(schema);
}

export function registerSchemaLoader(context: vscode.ExtensionContext) {
    // Carga inicial
    void loadAllWorkspaceSchemas();

    // Watcher de cualquier fichero .stxt dentro del directorio
    const watcher = vscode.workspace.createFileSystemWatcher(SCHEMA_FILES_GLOB);
    context.subscriptions.push(
        watcher,
        watcher.onDidCreate(uri => void logSchemaFile(uri, 'created')),
        watcher.onDidChange(uri => void logSchemaFile(uri, 'changed')),
        watcher.onDidDelete(uri => {
            console.log(`[stxt] schema deleted: ${uri.toString()}`);
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
        const entries = await vscode.workspace.fs.readDirectory(dirUri);
        // entries: Array<[name: string, type: vscode.FileType]>

        for (const [name, type] of entries) {
            if (type === vscode.FileType.File && name.endsWith('.stxt')) {
                const fileUri = vscode.Uri.joinPath(dirUri, name);
                await logSchemaFile(fileUri, 'initial');
            }
        }
    } catch (e) {
        // Normal si no existe la carpeta en el proyecto
        console.log(`[stxt] schema dir not found: ${dirUri.toString()} (${String(e)})`);
    }
}

async function logSchemaFile(uri: vscode.Uri, reason: 'initial' | 'changed' | 'created') {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] schema ${reason}: ${uri.toString()}\n${text.length} chars.`);
        const parser: Parser = new Parser();
        const node: Node = parser.parse(text)[0];
        //console.log("NODE: " + node);
        const schema: Schema = SchemaParser.transformNodeToSchema(node);
        //console.log(`Schema: ${schema}`);
        SCHEMA_PROVIDER.addSchema(schema);

    } catch (e) {
        console.log(`[stxt] schema ${reason}: could not read ${uri.toString()} (${String(e)})`);
    }
}
