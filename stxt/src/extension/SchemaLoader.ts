import vscode from 'vscode';
import { Schema, SchemaProvider, UnifiedSchemaProvider } from '@stxt-lang/core';
import { log } from './Log';

const STXT_DIR = '.stxt';
const STXT_FILES_GLOB = `**/${STXT_DIR}/**/*.stxt`;
const SCHEMA_DIR_GLOB = '**/*.stxt';

/**
 * Cuántos directorios se suben como máximo buscando un `.stxt`. La búsqueda para sola al
 * llegar a la raíz del sistema de ficheros; el tope es solo un seguro contra rutas
 * patológicas (enlaces circulares, sistemas de ficheros virtuales).
 */
const MAX_PARENT_LEVELS = 32;

const PROVIDER = new UnifiedSchemaProvider();

/** Directorios `.stxt` descubiertos, indexados por URI para no repetirlos. */
const SCHEMA_DIRS = new Map<string, vscode.Uri>();

/** Directorios que ya tienen watcher propio, para no duplicarlos. */
const WATCHED_DIRS = new Set<string>();

let extensionContext: vscode.ExtensionContext | undefined;
let notifySchemasChanged: () => void | Promise<void> = () => { /* aún no registrado */ };

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
    extensionContext = context;
    notifySchemasChanged = onSchemasChanged;

    // Registrar es empezar de cero: en el editor solo pasa una vez, al activar.
    SCHEMA_DIRS.clear();
    WATCHED_DIRS.clear();

    // Watcher de cualquier fichero .stxt dentro de un directorio .stxt del workspace
    watchPattern(STXT_FILES_GLOB);

    // Puntos de partida iniciales: las carpetas del workspace y los documentos ya abiertos.
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        log.trace(`Carpeta del workspace: ${folder.uri.toString()}`);
        await discoverSchemaDir(folder.uri);
    }

    for (const document of vscode.workspace.textDocuments) {
        await discoverSchemaDirForDocument(document);
    }

    // Carga inicial de schemas y revalidación del workspace.
    await reloadAllSchemaData('initial load');
}

/**
 * Busca el directorio `.stxt` que le corresponde a un documento antes de analizarlo.
 *
 * Es lo que salva el caso habitual de abrir un `.stxt` suelto, o una subcarpeta de un
 * proyecto, cuando el `.stxt/` está por encima de la raíz del workspace: sin esto no se
 * cargaría ningún schema.
 *
 * @param document documento que se acaba de abrir.
 */
export async function ensureSchemasForDocument(document: vscode.TextDocument): Promise<void> {
    if (await discoverSchemaDirForDocument(document)) {
        await reloadAllSchemaData(`documento abierto: ${document.uri.toString()}`);
    }
}

async function reloadAllSchemaData(reason: string) {
    try {
        log.info(`Recargando schemas (${reason})...`);
        PROVIDER.clear();
        await loadAllSchemaDirs();
        await notifySchemasChanged();

        if (getSchemas().length === 0) {
            log.info(`Sin schemas cargados (${reason}): no se encontró ningún directorio ${STXT_DIR}. Los documentos no se validan.`);
        } else {
            log.info(`Schemas recargados (${reason}): ${getSchemas().length}.`);
        }
    } catch (e) {
        log.error(`Error recargando schemas (${reason}): ${String(e)}`);
    }
}

// *********
// DISCOVERY
// *********

// El directorio del documento es el punto de partida de su búsqueda hacia arriba.
async function discoverSchemaDirForDocument(document: vscode.TextDocument): Promise<boolean> {
    if (document.languageId !== 'stxt' || document.isUntitled) {
        return false;
    }

    return discoverSchemaDir(vscode.Uri.joinPath(document.uri, '..'));
}

/**
 * Sube desde un directorio buscando el primer `.stxt` que exista, como hacen las
 * herramientas que resuelven su configuración (`tsconfig.json`, `.editorconfig`…): se
 * para en el primero que encuentra, y sigue subiendo por encima de la raíz del workspace
 * si hace falta, hasta la raíz del sistema de ficheros.
 *
 * @param startUri directorio desde el que se empieza a subir.
 * @returns true si ha descubierto un directorio que no se conocía.
 */
async function discoverSchemaDir(startUri: vscode.Uri): Promise<boolean> {
    let dirUri = startUri;

    for (let level = 0; level < MAX_PARENT_LEVELS; level++) {
        const candidate = vscode.Uri.joinPath(dirUri, STXT_DIR);
        const key = candidate.toString();

        // Ya descubierto desde otro punto de partida: no hay nada nuevo que cargar.
        if (SCHEMA_DIRS.has(key)) {
            return false;
        }

        if (await isDirectory(candidate)) {
            SCHEMA_DIRS.set(key, candidate);
            watchSchemaDir(candidate);
            log.info(`Directorio de schemas encontrado: ${key}`);
            return true;
        }

        const parentUri = vscode.Uri.joinPath(dirUri, '..');

        // La raíz del sistema de ficheros es su propio padre.
        if (parentUri.toString() === dirUri.toString()) {
            break;
        }

        dirUri = parentUri;
    }

    log.trace(`Sin directorio ${STXT_DIR} desde ${startUri.toString()} hacia arriba.`);
    return false;
}

// Un directorio `.stxt` fuera del workspace no lo cubre el watcher global, así que lleva el suyo.
function watchSchemaDir(dirUri: vscode.Uri): void {
    const key = dirUri.toString();

    if (!WATCHED_DIRS.has(key)) {
        WATCHED_DIRS.add(key);
        watchPattern(new vscode.RelativePattern(dirUri, SCHEMA_DIR_GLOB));
    }
}

function watchPattern(pattern: vscode.GlobPattern): void {
    if (!extensionContext) {
        return;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    extensionContext.subscriptions.push(
        watcher,
        watcher.onDidCreate(() => reloadAllSchemaData('file created')),
        watcher.onDidChange(() => reloadAllSchemaData('file changed')),
        watcher.onDidDelete(() => reloadAllSchemaData('file deleted')),
    );
}

async function isDirectory(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.readDirectory(uri);
        return true;
    } catch {
        // Lo normal es que el directorio no exista: no es un error.
        return false;
    }
}

// **********
// LOAD FILES
// **********

async function loadAllSchemaDirs() {
    for (const dirUri of SCHEMA_DIRS.values()) {
        await loadFilesFromDir(dirUri);
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
        // El directorio puede haber desaparecido desde que se descubrió: no es un error.
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
