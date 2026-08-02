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
 * Utilidades para los tests contra el corpus real de `../../stxt-web`.
 *
 * El corpus no se copia aquí a propósito, igual que en `../../stxt-js`: stxt-web es la
 * fuente normativa del lenguaje y los tests tienen que fallar cuando la extensión se
 * desvía de los documentos reales, no de una copia congelada.
 */

// Carpetas de stxt-web con schemas y templates (las que carga SchemaLoader).
export const SCHEMA_DIRS = ['.stxt'];

// Carpetas de stxt-web con documentos que deben validar contra esos schemas.
export const DOC_DIRS = ['docs', 'es', 'en'];

/**
 * Localiza `stxt-web`. Se puede forzar con la variable de entorno STXT_WEB; por
 * defecto se busca como proyecto hermano.
 *
 * @returns la raíz de stxt-web, o undefined si no está disponible.
 */
export function findStxtWeb(): string | undefined {
	const candidates = [
		process.env.STXT_WEB,
		// __dirname es <repo>/stxt/out/test
		path.resolve(__dirname, '..', '..', '..', '..', 'stxt-web')
	];

	for (const candidate of candidates) {
		if (candidate && fs.existsSync(path.join(candidate, '.stxt'))) {
			return candidate;
		}
	}

	return undefined;
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
 * `describe` que se salta el bloque entero (lo marca como pendiente) cuando stxt-web
 * no está disponible, para que no falle en un clon aislado de este repositorio.
 *
 * @param title título del bloque.
 * @param body cuerpo del bloque, que recibe la raíz de stxt-web.
 */
export function describeCorpus(title: string, body: (root: string) => void): void {
	const root = findStxtWeb();

	if (root === undefined) {
		describe(title, () => {
			it('necesita el proyecto hermano stxt-web (usa STXT_WEB=/ruta para apuntarlo)');
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
