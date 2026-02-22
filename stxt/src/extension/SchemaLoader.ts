import * as vscode from 'vscode';
import { Schema } from '../schema/Schema';
import { SchemaProvider } from '../schema/SchemaProvider';
import { SchemaProviderMemory } from '../schema/SchemaProviderMemory';
import { TemplateSchemaProviderMemory } from '../template/TemplateSchemaProviderMemory';

const SCHEMA_DIR_REL    = ['.stxt', '@stxt.schema'];
const TEMPLATE_DIR_REL    = ['.stxt', '@stxt.template'];

const SCHEMA_FILES_GLOB = '**/.stxt/@stxt.schema/*.stxt';
const SCHEMA_PROVIDER   = new SchemaProviderMemory();

const TEMPLATE_FILES_GLOB = '**/.stxt/@stxt.template/*.stxt';
const TEMPLATE_PROVIDER = new TemplateSchemaProviderMemory();

export class SchemaLoaderExtension implements SchemaProvider {
    getSchema(namespace: string): Schema | null | undefined {
        return getSchema(namespace);
    }
}

export function getSchema(schema: string): Schema | undefined | null {
    try {
        //console.log("Search schema..." + schema);
        const result = SCHEMA_PROVIDER.getSchema(schema);
        return result;
    } catch (e) {
        // Continuamos
        // console.log("Not found in schema\nContinue with template");
    }

    const result = TEMPLATE_PROVIDER.getSchema(schema);
    return result;
}

export function getSchemas(): ReadonlyArray<Schema> {
    const merged = new Map<string, Schema>();

    for (const templateSchema of TEMPLATE_PROVIDER.getAllSchemas()) {
        merged.set(templateSchema.getNamespace(), templateSchema);
    }

    for (const schema of SCHEMA_PROVIDER.getAllSchemas()) {
        merged.set(schema.getNamespace(), schema);
    }

    return Array.from(merged.values());
}

// ****************
// Register loaders
// ****************

export function registerSchemaLoader(context: vscode.ExtensionContext) {
    // Carga inicial
    void loadAllWorkspaceSchemas();
    void loadAllWorkspaceTemplates();

    // Watcher de cualquier fichero .stxt dentro del directorio
    const watcherSchema = vscode.workspace.createFileSystemWatcher(SCHEMA_FILES_GLOB);
    context.subscriptions.push(
        watcherSchema,
        watcherSchema.onDidCreate(uri => void addSchemaFile(uri, 'created')),
        watcherSchema.onDidChange(uri => void addSchemaFile(uri, 'changed')),
        watcherSchema.onDidDelete(uri => {console.log(`[stxt] schema deleted: ${uri.toString()}`);
        })
    );

    // Watcher de cualquier fichero .stxt dentro del directorio
    const watcherTemplate = vscode.workspace.createFileSystemWatcher(TEMPLATE_FILES_GLOB);
    context.subscriptions.push(
        watcherTemplate,
        watcherTemplate.onDidCreate(uri => void addTemplateFile(uri, 'created')),
        watcherTemplate.onDidChange(uri => void addTemplateFile(uri, 'changed')),
        watcherTemplate.onDidDelete(uri => {console.log(`[stxt] template deleted: ${uri.toString()}`);
        })
    );
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
    } catch (e) {
        console.log("Error loading all workspace", e);
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
    } catch (e) {
        console.log("Error loading all workspace", e);
    }
}

async function loadTemplatesFromDir(dirUri: vscode.Uri) {
    try {
        const entries:[string, vscode.FileType][] = await vscode.workspace.fs.readDirectory(dirUri);

        for (const [name] of entries) {
            if (name.endsWith('.stxt')) {
                const fileUri = vscode.Uri.joinPath(dirUri, name);
                await addTemplateFile(fileUri, 'initial');
            }
        }
    } catch (e) {
        console.log(`[stxt] template dir not found: ${dirUri.toString()} (${String(e)})`);
    }
}

async function addTemplateFile(uri: vscode.Uri, reason: 'initial' | 'changed' | 'created') {
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log(`\n[stxt] template ${reason}: ${uri.toString()}\n${text.length} chars.`);
        TEMPLATE_PROVIDER.addTemplate(text);
    } catch (e) {
        console.log(`[stxt] template ${reason}: could not read ${uri.toString()}:\n(${String(e)})`);
    }
}
