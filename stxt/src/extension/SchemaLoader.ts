import vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import {
    DiscoveryEntry,
    DiscoveryEnvironment,
    DiscoveryFileSystem,
    DiscoveryResolver,
    DiscoveryResult,
    Schema,
    SchemaProvider,
    StringUtils,
    UnifiedSchemaProvider,
} from '@stxt-lang/core';
import { log } from './Log';

/**
 * Resolución de schemas/templates según STXT-DISCOVERY-SPEC (stxt-web,
 * `stxt-discovery-ref.stxt`): la lógica normativa vive en `DiscoveryResolver`
 * (@stxt-lang/core) y aquí quedan solo los dos adaptadores del editor —
 * `vscode.workspace.fs` y el entorno del proceso— más el estado por documento.
 *
 * La cadena de cada documento (todos los `.stxt/` ascendentes, nivel de usuario,
 * nivel de sistema, o `STXT_PATH`) se resuelve por su directorio y se cachea por
 * directorio; los niveles cargados se comparten entre documentos a través del
 * caché del propio resolver, que es la optimización que la spec permite.
 */

const STXT_DIR = '.stxt';
const STXT_FILES_GLOB = `**/${STXT_DIR}/**/*.stxt`;
const SCHEMA_DIR_GLOB = '**/*.stxt';

// **********
// ADAPTERS
// **********

/**
 * Adaptador de `DiscoveryFileSystem` sobre `vscode.workspace.fs`.
 *
 * Las rutas que ve el resolver son `Uri.toString()`; el adaptador recuerda el `Uri`
 * de cada ruta que produce, así no tiene que reconstruirlo con `Uri.parse` y funciona
 * con cualquier esquema (file, remoto, virtual). El `Uri.parse` de `uriOf()` es solo
 * para las rutas que no ha producido él, que vienen de un entorno inyectado.
 */
class VscodeDiscoveryFileSystem implements DiscoveryFileSystem {
    private readonly uris = new Map<string, vscode.Uri>();

    /** Registra un Uri y devuelve la ruta (su forma textual) que verá el resolver. */
    track(uri: vscode.Uri): string {
        const key = uri.toString();
        this.uris.set(key, uri);
        return key;
    }

    /** El Uri de una ruta producida por este adaptador (o, si viene de fuera, de su texto). */
    uriOf(pathKey: string): vscode.Uri {
        let uri = this.uris.get(pathKey);

        if (!uri) {
            // Las rutas nacen de track/join/parentOf, pero un entorno inyectado (tests,
            // configuración) puede aportar las suyas: se recuperan de su forma textual.
            uri = vscode.Uri.parse(pathKey);
            this.uris.set(pathKey, uri);
        }

        return uri;
    }

    async isDirectory(pathKey: string): Promise<boolean> {
        try {
            await vscode.workspace.fs.readDirectory(this.uriOf(pathKey));
            return true;
        } catch {
            // Lo normal es que el directorio no exista: no es un error.
            return false;
        }
    }

    async listDirectory(pathKey: string): Promise<DiscoveryEntry[]> {
        const base = this.uriOf(pathKey);
        const entries = await vscode.workspace.fs.readDirectory(base);

        return entries.map(([name, type]) => ({
            path: this.track(vscode.Uri.joinPath(base, name)),
            name,
            isDirectory: type === vscode.FileType.Directory,
        }));
    }

    async readFile(pathKey: string): Promise<string> {
        const bytes = await vscode.workspace.fs.readFile(this.uriOf(pathKey));
        return new TextDecoder('utf-8').decode(bytes);
    }

    parentOf(pathKey: string): string | null {
        const parent = vscode.Uri.joinPath(this.uriOf(pathKey), '..');
        const parentKey = parent.toString();

        // La raíz del sistema de ficheros es su propio padre.
        if (parentKey === pathKey) {
            return null;
        }

        return this.track(parent);
    }

    join(pathKey: string, name: string): string {
        return this.track(vscode.Uri.joinPath(this.uriOf(pathKey), name));
    }
}

/**
 * Adaptador de `DiscoveryEnvironment` sobre el entorno del proceso: `STXT_PATH`,
 * `$HOME/.stxt` y `/etc/stxt` (`%USERPROFILE%\.stxt` y `%ProgramData%\stxt` en
 * Windows). En un workspace remoto el extension host corre en la máquina remota,
 * así que estos valores son los correctos también ahí.
 */
class VscodeDiscoveryEnvironment implements DiscoveryEnvironment {
    constructor(private readonly fileSystem: VscodeDiscoveryFileSystem) {}

    getStxtPath(): string[] | null {
        const value = process.env['STXT_PATH'];

        if (value === undefined) {
            return null;
        }

        return value.split(path.delimiter)
            .filter(entry => entry !== '')
            .map(entry => this.fileSystem.track(vscode.Uri.file(entry)));
    }

    getUserLevelDir(): string | null {
        const home = os.homedir();
        return home ? this.fileSystem.track(vscode.Uri.file(path.join(home, STXT_DIR))) : null;
    }

    getSystemLevelDir(): string | null {
        if (process.platform === 'win32') {
            const programData = process.env['ProgramData'];
            return programData ? this.fileSystem.track(vscode.Uri.file(path.join(programData, 'stxt'))) : null;
        }

        return this.fileSystem.track(vscode.Uri.file('/etc/stxt'));
    }
}

// **********
// ESTADO
// **********

let fileSystem = new VscodeDiscoveryFileSystem();
let resolver: DiscoveryResolver | undefined;

/** Resultados de resolución por directorio de partida (el del documento o carpeta del workspace). */
const RESULTS = new Map<string, DiscoveryResult>();

/** Directorios de resolución (niveles) ya descubiertos, para watchers y para detectar novedades. */
const KNOWN_LEVEL_DIRS = new Set<string>();

/** Directorios que ya tienen watcher propio, para no duplicarlos. */
const WATCHED_DIRS = new Set<string>();

/** Sirve los meta-schemas de `@stxt.schema`/`@stxt.template` cuando aún no hay ningún resultado. */
const META_FALLBACK = new UnifiedSchemaProvider();

let extensionContext: vscode.ExtensionContext | undefined;
let notifySchemasChanged: () => void | Promise<void> = () => { /* aún no registrado */ };

/**
 * `SchemaProvider` de cara al validador. Con un Uri de documento resuelve contra la
 * cadena de ese documento (STXT-DISCOVERY-SPEC sección 7); sin él, contra la unión
 * de todo lo resuelto, que es el comportamiento de los consumidores sin documento.
 */
export class SchemaLoaderExtension implements SchemaProvider {
    constructor(private readonly documentUri?: vscode.Uri) {}

    getSchema(namespace: string): Schema | null | undefined {
        if (this.documentUri) {
            return getSchemaForDocument(this.documentUri, namespace);
        }

        return getSchema(namespace);
    }
}

/** El resultado de resolución que corresponde a un documento, si su directorio ya se resolvió. */
function resultForDocument(documentUri: vscode.Uri): DiscoveryResult | undefined {
    return RESULTS.get(vscode.Uri.joinPath(documentUri, '..').toString());
}

/**
 * Resuelve un namespace contra la cadena del documento; si el directorio del documento
 * aún no está resuelto, cae a la unión global.
 */
export function getSchemaForDocument(documentUri: vscode.Uri, namespace: string): Schema | null | undefined {
    const result = resultForDocument(documentUri);

    if (result) {
        const schema = result.getSchema(namespace);

        if (schema) {
            return schema;
        }
    }

    return getSchema(namespace);
}

/** Los schemas activos para un documento; si su directorio no está resuelto, la unión global. */
export function getSchemasForDocument(documentUri: vscode.Uri): ReadonlyArray<Schema> {
    const result = resultForDocument(documentUri);
    return result ? result.getAllSchemas() : getSchemas();
}

/** Resuelve un namespace contra la unión de todos los resultados (primero que lo tenga). */
export function getSchema(namespace: string): Schema | undefined | null {
    for (const result of RESULTS.values()) {
        const schema = result.getSchema(namespace);

        if (schema) {
            return schema;
        }
    }

    // Sin resultados también hay que servir los meta-schemas de los namespaces reservados.
    return META_FALLBACK.getSchema(namespace);
}

/** Todos los schemas activos conocidos, uno por namespace (gana el primer resultado que lo defina). */
export function getSchemas(): ReadonlyArray<Schema> {
    const seen = new Set<string>();
    const result: Schema[] = [];

    for (const discovery of RESULTS.values()) {
        for (const definition of discovery.getActiveDefinitions()) {
            const key = StringUtils.lowerCase(definition.namespace);

            if (!seen.has(key)) {
                seen.add(key);
                result.push(definition.schema);
            }
        }
    }

    return result;
}

// ****************
// Register loaders
// ****************

export async function registerSchemaLoader(
    context: vscode.ExtensionContext,
    onSchemasChanged: () => void | Promise<void>,
    environment?: DiscoveryEnvironment,
): Promise<void> {
    extensionContext = context;
    notifySchemasChanged = onSchemasChanged;

    // Registrar es empezar de cero: en el editor solo pasa una vez, al activar.
    // El parámetro `environment` existe para los tests, que inyectan un entorno aislado
    // (sin STXT_PATH ni niveles de usuario/sistema reales).
    fileSystem = new VscodeDiscoveryFileSystem();
    resolver = new DiscoveryResolver(fileSystem, environment ?? new VscodeDiscoveryEnvironment(fileSystem));
    RESULTS.clear();
    KNOWN_LEVEL_DIRS.clear();
    WATCHED_DIRS.clear();

    // Watcher de cualquier fichero .stxt dentro de un directorio .stxt del workspace
    watchPattern(STXT_FILES_GLOB);

    // Puntos de partida iniciales: las carpetas del workspace y los documentos ya abiertos.
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        log.trace(`Carpeta del workspace: ${folder.uri.toString()}`);
        await resolveLocation(folder.uri);
    }

    for (const document of vscode.workspace.textDocuments) {
        await resolveLocationForDocument(document);
    }

    await notifySchemasChanged();

    if (getSchemas().length === 0) {
        log.info(`Sin schemas cargados: la cadena de resolución no aporta ninguna definición. Los documentos no se validan.`);
    } else {
        log.info(`Carga inicial: ${getSchemas().length} schemas, ${KNOWN_LEVEL_DIRS.size} directorios de resolución.`);
    }
}

/**
 * Resuelve la cadena de un documento antes de analizarlo.
 *
 * Es lo que salva el caso habitual de abrir un `.stxt` suelto, o una subcarpeta de un
 * proyecto, cuando el `.stxt/` está por encima de la raíz del workspace: sin esto no se
 * cargaría ningún schema.
 *
 * @param document documento que se acaba de abrir.
 */
export async function ensureSchemasForDocument(document: vscode.TextDocument): Promise<void> {
    if (await resolveLocationForDocument(document)) {
        log.info(`Directorios de resolución nuevos por ${document.uri.toString()}: revalidando.`);
        await notifySchemasChanged();
    }
}

// El directorio del documento es el punto de partida de su cadena de resolución.
async function resolveLocationForDocument(document: vscode.TextDocument): Promise<boolean> {
    if (document.languageId !== 'stxt' || document.isUntitled) {
        // Un documento sin ubicación no tiene nivel de proyecto (STXT-DISCOVERY-SPEC 4.1);
        // sus niveles de usuario/sistema ya los cubre la carga inicial.
        return false;
    }

    return resolveLocation(vscode.Uri.joinPath(document.uri, '..'));
}

/**
 * Resuelve la cadena de un directorio y guarda el resultado. Vigila los directorios de
 * resolución que no conocía.
 *
 * @param dirUri directorio de partida (el del documento, o una carpeta del workspace).
 * @returns true si ha descubierto algún directorio de resolución nuevo.
 */
async function resolveLocation(dirUri: vscode.Uri): Promise<boolean> {
    if (!resolver) {
        return false;
    }

    const key = fileSystem.track(dirUri);
    const result = await resolver.resolve(key);
    RESULTS.set(key, result);

    let discovered = false;

    for (const levelDir of result.getChain()) {
        if (!KNOWN_LEVEL_DIRS.has(levelDir)) {
            KNOWN_LEVEL_DIRS.add(levelDir);
            watchSchemaDir(levelDir);
            log.info(`Directorio de resolución encontrado: ${levelDir}`);
            discovered = true;
        }
    }

    if (discovered) {
        // Los errores de resolución (STXT-DISCOVERY-SPEC sección 8) se reportan al log,
        // una vez por descubrimiento para no repetirlos en cada resolve.
        for (const error of result.getErrors()) {
            log.error(`[${error.code}] ${error.message}`);
        }
    }

    return discovered;
}

// Un cambio en disco invalida los niveles cargados: se re-resuelve todo lo conocido.
async function reloadAllSchemaData(reason: string): Promise<void> {
    if (!resolver) {
        return;
    }

    try {
        log.info(`Recargando schemas (${reason})...`);
        resolver.clearCache();

        for (const key of RESULTS.keys()) {
            const result = await resolver.resolve(key);
            RESULTS.set(key, result);

            for (const levelDir of result.getChain()) {
                if (!KNOWN_LEVEL_DIRS.has(levelDir)) {
                    KNOWN_LEVEL_DIRS.add(levelDir);
                    watchSchemaDir(levelDir);
                }
            }
        }

        await notifySchemasChanged();
        log.info(`Schemas recargados (${reason}): ${getSchemas().length}.`);
    } catch (e) {
        log.error(`Error recargando schemas (${reason}): ${String(e)}`);
    }
}

// *********
// WATCHERS
// *********

// Un directorio de resolución fuera del workspace no lo cubre el watcher global, así que lleva el suyo.
function watchSchemaDir(levelDirKey: string): void {
    if (!WATCHED_DIRS.has(levelDirKey)) {
        WATCHED_DIRS.add(levelDirKey);
        watchPattern(new vscode.RelativePattern(fileSystem.uriOf(levelDirKey), SCHEMA_DIR_GLOB));
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
