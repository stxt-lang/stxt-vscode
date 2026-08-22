import * as fs from 'fs';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';
import { InlineNode, Node, Parser, ParseException } from '@stxt-lang/core';
import { languages, setWorkspaceFolder, Diagnostic, DiagnosticSeverity } from './stub/vscode';
import { TestDocument, asTextDocument } from './stub/TestDocument';
import { analysisDoc } from '../extension/AnalysisDoc';
import { AnalysisResult } from '../extension/AnalysisResult';
import { registerSchemaLoader, getSchemas } from '../extension/SchemaLoader';

/**
 * Utilities for the tests against the real corpus of `../stxt-lang`.
 *
 * The corpus is deliberately not copied here, just like in `../stxt-js`: stxt-lang is the
 * normative source of the language and the tests must fail when the extension drifts
 * from the real documents, not from a frozen copy.
 *
 * The corpus is mandatory: if `stxt-lang` cannot be located, the corpus suites fail
 * (they are never skipped). A silently skipped corpus hid a broken locator in this very
 * repository from 2026-08-10 to 2026-08-15, so "no corpus" is an error, not a pending run.
 */

/**
 * stxt-lang folders whose documents must validate without errors. They are deliberately
 * the same ones `../stxt-js` looks at, so that both repositories test the same set;
 * `examples/` and `tutorial/` are left out for that reason.
 *
 * Schemas and templates are not listed here: the real `SchemaLoader` loads them, since it
 * already walks `<workspace>/.stxt/**` on its own (see `loadSchemas`).
 */
export const DOC_DIRS = ['docs', 'es', 'en'];

/**
 * Locates `stxt-lang`. It can be forced with the STXT_LANG environment variable; by
 * default it is looked up as a sibling project (`../stxt-lang` from this repo).
 *
 * @returns the root of stxt-lang.
 * @throws Error if it cannot be found: the corpus is mandatory, never optional.
 */
export function findStxtLang(): string {
	const candidates = [
		process.env.STXT_LANG,
		// __dirname is <repo>/out/test
		path.resolve(__dirname, '..', '..', '..', 'stxt-lang')
	];

	for (const candidate of candidates) {
		if (candidate && fs.existsSync(path.join(candidate, '.stxt'))) {
			return candidate;
		}
	}

	throw new Error(
		'The corpus of the sibling project stxt-lang is required and was not found. Tried: '
		+ candidates.filter(c => c).map(c => `"${c}"`).join(', ')
		+ '. Clone stxt-lang/stxt-lang next to this repository or set STXT_LANG=/path/to/stxt-lang.');
}

// Every .stxt in a directory, recursively and in stable order.
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

// The .stxt files of the given folders, relative to the stxt-lang root.
export function corpusFiles(root: string, dirs: readonly string[]): string[] {
	return dirs.flatMap(dir => findStxtFiles(path.join(root, dir)));
}

/**
 * `describe` over the corpus. When stxt-lang cannot be located the block is NOT
 * skipped: it turns into a single failing test that explains what is missing, so
 * that a broken locator or an isolated clone can never pass unnoticed.
 *
 * @param title title of the block.
 * @param body body of the block, which gets the root of stxt-lang.
 */
export function describeCorpus(title: string, body: (root: string) => void): void {
	let root: string;
	try {
		root = findStxtLang();
	}
	catch (error) {
		describe(title, () => {
			it('finds the mandatory corpus of the sibling project stxt-lang', () => {
				throw error;
			});
		});
		return;
	}

	describe(title, () => body(root));
}

/**
 * Loads all of `<root>/.stxt/**` into the schema provider, going through the real
 * `SchemaLoader`: points the stub workspace at stxt-lang and lets it walk the directory
 * as it would in the editor.
 *
 * @param root the stxt-lang root.
 */
export async function loadSchemas(root: string): Promise<void> {
	setWorkspaceFolder(root);

	const context = { subscriptions: [] } as unknown as ExtensionContext;
	await registerSchemaLoader(context, async () => { /* no open documents to revalidate */ });

	if (getSchemas().length === 0) {
		throw new Error(`No schema was loaded from ${path.join(root, '.stxt')}.`);
	}
}

export interface AnalyzedDocument {
	readonly document: TestDocument;
	readonly analysis: AnalysisResult;
	readonly diagnostics: readonly Diagnostic[];
}

/**
 * Analyzes a text just like the editor does on every keystroke: a single parse that
 * yields tokens, maps and diagnostics, and also seeds the cache the providers read.
 *
 * @param filePath the path that acts as the document URI.
 * @param text the document content.
 * @returns the document, its analysis and the published diagnostics.
 */
export function analyze(filePath: string, text: string): AnalyzedDocument {
	const document = new TestDocument(filePath, text);
	const collection = languages.createDiagnosticCollection('stxt');
	const analysis = analysisDoc(asTextDocument(document), collection as never);

	return { document, analysis, diagnostics: collection.get(document.uri) ?? [] };
}

// Analyzes a corpus file, reading it from disk.
export function analyzeFile(filePath: string): AnalyzedDocument {
	return analyze(filePath, fs.readFileSync(filePath, 'utf-8'));
}

// The diagnostics with severity Error, which are the syntax failures.
export function errorsOf(diagnostics: readonly Diagnostic[]): Diagnostic[] {
	return diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
}

// Readable message for the assert: `line 12: [CODE] message`.
export function describeDiagnostics(diagnostics: readonly Diagnostic[]): string {
	return diagnostics.map(d => `\n\tline ${d.range.start.line + 1}: ${d.message}`).join('');
}

export function describeErrors(errors: readonly ParseException[]): string {
	return errors.map(e => `\n\t[${e.code}] line ${e.line}: ${e.message}`).join('');
}

/**
 * Canonical signature of a document tree: qualified name, level and content of every
 * node. Used to check that formatting does not change what the document says, only
 * how it is written.
 *
 * @param nodes the root nodes of the document.
 * @returns a string representing the whole tree.
 */
export function treeSignature(nodes: readonly Node[]): string {
	const lines: string[] = [];

	const walk = (node: Node): void => {
		const content = node instanceof InlineNode ? `:${node.getValue()}` : `>>${node.getText()}`;
		lines.push(`${'\t'.repeat(node.getLevel())}${node.getQualifiedName()}${content}`);
		if (node instanceof InlineNode) {
			node.getChildren().forEach(walk);
		}
	};

	nodes.forEach(walk);
	return lines.join('\n');
}

// Parses without validating, to compare trees before and after formatting.
export function parseTree(text: string): Node[] {
	return new Parser().parseResult(text).getNodes();
}
