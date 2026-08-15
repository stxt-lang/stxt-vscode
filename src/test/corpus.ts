import * as fs from 'fs';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';
import { Node, Parser, ParseException } from '@stxt-lang/core';
import { languages, setWorkspaceFolder, Diagnostic, DiagnosticSeverity } from './stub/vscode';
import { TestDocument, asTextDocument } from './stub/TestDocument';
import { analysisDoc } from '../extension/AnalysisDoc';
import { AnalysisResult } from '../extension/AnalysisResult';
import { registerSchemaLoader, getSchemas } from '../extension/SchemaLoader';

/**
 * Utilidades para los tests contra el corpus real de `../stxt-web`.
 *
 * El corpus no se copia aquí a propósito, igual que en `../stxt-js`: stxt-web es la
 * fuente normativa del lenguaje y los tests tienen que fallar cuando la extensión se
 * desvía de los documentos reales, no de una copia congelada.
 *
 * The corpus is mandatory: if `stxt-web` cannot be located, the corpus suites fail
 * (they are never skipped). A silently skipped corpus hid a broken locator in this very
 * repository from 2026-08-10 to 2026-08-15, so "no corpus" is an error, not a pending run.
 */

/**
 * Carpetas de stxt-web con los documentos que deben validar sin errores. Son las mismas
 * que mira `../stxt-js` a propósito, para que los dos repositorios prueben el mismo
 * conjunto; `examples/` y `tutorial/` se quedan fuera por eso.
 *
 * Los schemas y templates no se listan aquí: los carga el `SchemaLoader` real, que ya
 * recorre `<workspace>/.stxt/**` por su cuenta (ver `loadSchemas`).
 */
export const DOC_DIRS = ['docs', 'es', 'en'];

/**
 * Locates `stxt-web`. It can be forced with the STXT_WEB environment variable; by
 * default it is looked up as a sibling project (`../stxt-web` from this repo).
 *
 * @returns the root of stxt-web.
 * @throws Error if it cannot be found: the corpus is mandatory, never optional.
 */
export function findStxtWeb(): string {
	const candidates = [
		process.env.STXT_WEB,
		// __dirname is <repo>/out/test
		path.resolve(__dirname, '..', '..', '..', 'stxt-web')
	];

	for (const candidate of candidates) {
		if (candidate && fs.existsSync(path.join(candidate, '.stxt'))) {
			return candidate;
		}
	}

	throw new Error(
		'The corpus of the sibling project stxt-web is required and was not found. Tried: '
		+ candidates.filter(c => c).map(c => `"${c}"`).join(', ')
		+ '. Clone stxt-lang/stxt-web next to this repository or set STXT_WEB=/path/to/stxt-web.');
}

// Todos los .stxt de un directorio, recursivamente y en orden estable.
export function findStxtFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) {
		return [];
	}

	const result: string[] = [];

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			result.push(...findStxtFiles(full));
		} else if (entry.name.endsWith('.stxt')) {
			result.push(full);
		}
	}

	return result.sort();
}

// Los .stxt de las carpetas indicadas, a partir de la raíz de stxt-web.
export function corpusFiles(root: string, dirs: readonly string[]): string[] {
	return dirs.flatMap(dir => findStxtFiles(path.join(root, dir)));
}

/**
 * `describe` over the corpus. When stxt-web cannot be located the block is NOT
 * skipped: it turns into a single failing test that explains what is missing, so
 * that a broken locator or an isolated clone can never pass unnoticed.
 *
 * @param title title of the block.
 * @param body body of the block, which gets the root of stxt-web.
 */
export function describeCorpus(title: string, body: (root: string) => void): void {
	let root: string;
	try {
		root = findStxtWeb();
	}
	catch (error) {
		describe(title, () => {
			it('finds the mandatory corpus of the sibling project stxt-web', () => {
				throw error;
			});
		});
		return;
	}

	describe(title, () => body(root));
}

/**
 * Carga en el proveedor de schemas todo `<root>/.stxt/**`, pasando por el
 * `SchemaLoader` real: apunta el workspace del stub a stxt-web y deja que recorra el
 * directorio como haría en el editor.
 *
 * @param root raíz de stxt-web.
 */
export async function loadSchemas(root: string): Promise<void> {
	setWorkspaceFolder(root);

	const context = { subscriptions: [] } as unknown as ExtensionContext;
	await registerSchemaLoader(context, async () => { /* sin documentos abiertos que revalidar */ });

	if (getSchemas().length === 0) {
		throw new Error(`No se ha cargado ningún schema desde ${path.join(root, '.stxt')}.`);
	}
}

export interface AnalyzedDocument {
	readonly document: TestDocument;
	readonly analysis: AnalysisResult;
	readonly diagnostics: readonly Diagnostic[];
}

/**
 * Analiza un texto igual que el editor en cada pulsación: un solo parseo que deja
 * tokens, mapas y diagnósticos, y que además siembra el caché que leen los providers.
 *
 * @param filePath ruta que hace de URI del documento.
 * @param text contenido del documento.
 * @returns el documento, su análisis y los diagnósticos publicados.
 */
export function analyze(filePath: string, text: string): AnalyzedDocument {
	const document = new TestDocument(filePath, text);
	const collection = languages.createDiagnosticCollection('stxt');
	const analysis = analysisDoc(asTextDocument(document), collection as never);

	return { document, analysis, diagnostics: collection.get(document.uri) ?? [] };
}

// Analiza un fichero del corpus leyéndolo del disco.
export function analyzeFile(filePath: string): AnalyzedDocument {
	return analyze(filePath, fs.readFileSync(filePath, 'utf-8'));
}

// Los diagnósticos de gravedad Error, que son los fallos de sintaxis.
export function errorsOf(diagnostics: readonly Diagnostic[]): Diagnostic[] {
	return diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
}

// Mensaje legible para el assert: `línea 12: [CODE] mensaje`.
export function describeDiagnostics(diagnostics: readonly Diagnostic[]): string {
	return diagnostics.map(d => `\n\tlínea ${d.range.start.line + 1}: ${d.message}`).join('');
}

export function describeErrors(errors: readonly ParseException[]): string {
	return errors.map(e => `\n\t[${e.code}] línea ${e.line}: ${e.message}`).join('');
}

/**
 * Firma canónica del árbol de un documento: nombre cualificado, nivel y contenido de
 * cada nodo. Sirve para comprobar que el formateo no cambia lo que el documento dice,
 * solo cómo se escribe.
 *
 * @param nodes nodos raíz del documento.
 * @returns una cadena que representa el árbol entero.
 */
export function treeSignature(nodes: readonly Node[]): string {
	const lines: string[] = [];

	const walk = (node: Node): void => {
		const content = node.isTextNode() ? `>>${node.getText()}` : `:${node.getValue()}`;
		lines.push(`${'\t'.repeat(node.getLevel())}${node.getQualifiedName()}${content}`);
		node.getChildren().forEach(walk);
	};

	nodes.forEach(walk);
	return lines.join('\n');
}

// Parsea sin validar, para comparar árboles antes y después de formatear.
export function parseTree(text: string): Node[] {
	return new Parser().parseResult(text).getNodes();
}
