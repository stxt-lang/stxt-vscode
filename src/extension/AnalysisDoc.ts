import vscode from 'vscode';
import { Constants, Node, Parser, ParseException, ParseResult, ParserOptions, Schema, SchemaValidator, ValidationException, transformNodeToSchema, transformTemplateNodeToSchema } from '@stxt-lang/core';
import { AnalysisResult } from './AnalysisResult';
import { SchemaLoaderExtension, getSchemaForDocument } from './SchemaLoader';
import { TokenGeneratorObserver } from './TokenGeneratorObserver';
import { log } from './Log';

const LAST_ANALYSIS_BY_URI  = new Map<string, AnalysisResult>();

// The collection every analysis publishes its diagnostics to. It lives here, beside the cache
// it goes hand in hand with, so no module needs to import it back from extension.ts.
let diagnosticCollection: vscode.DiagnosticCollection | undefined;

/**
 * Creates the diagnostic collection the analyses publish to, replacing any previous one.
 * `activate()` calls it once and pushes the result to the subscriptions; the test harness
 * calls it to observe the published diagnostics.
 */
export function createDiagnosticCollection(): vscode.DiagnosticCollection {
	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');
	return diagnosticCollection;
}

/**
 * Forgets everything about a closed document: its cached analysis and its published
 * diagnostics. Without this the cache would keep an entry for every URI ever opened.
 */
export function dropAnalysis(uri: vscode.Uri): void {
	LAST_ANALYSIS_BY_URI.delete(uri.toString());
	diagnosticCollection?.delete(uri);
}

/**
 * Whether the `stxt.schemaValidation` setting is on for a document. Default on: a freshly
 * installed extension validates against the resolution chain of each document.
 */
export function isSchemaValidationEnabled(document: vscode.TextDocument): boolean {
	return vscode.workspace.getConfiguration('stxt', document).get<boolean>('schemaValidation', true);
}

/**
 * The parser limits for a document (STXT-SPEC 11.2), from the `stxt.maxNesting`,
 * `stxt.maxLineLength` and `stxt.maxInputSize` settings; -1 disables one. The defaults are
 * the recommended ones of the specification, the same the core ships.
 */
export function parserLimits(document: vscode.TextDocument): ParserOptions {
	const configuration = vscode.workspace.getConfiguration('stxt', document);
	return {
		maxNesting: configuration.get<number>('maxNesting', Constants.DEFAULT_MAX_NESTING),
		maxLineLength: configuration.get<number>('maxLineLength', Constants.DEFAULT_MAX_LINE_LENGTH),
		maxInputSize: configuration.get<number>('maxInputSize', Constants.DEFAULT_MAX_INPUT_SIZE),
	};
}

/**
 * The analysis the providers use: the cached one if the document has already been
 * analyzed, otherwise a fresh one computed on the spot.
 *
 * The cold case is real and must be covered: VS Code asks for the semantic tokens as
 * soon as it paints the document, and that may arrive before the `onDidOpenTextDocument`
 * that analyzes it —or before the initial schema load, which is asynchronous, finishes—.
 * A provider that only looked at the cache would return nothing and the document would
 * stay **uncolored until it was edited**.
 *
 * @param document the document whose analysis is wanted.
 * @returns the analysis, or undefined if the extension is not activated yet (tests only).
 */
export function getAnalysis(document: vscode.TextDocument): AnalysisResult | undefined {
	const cached = LAST_ANALYSIS_BY_URI.get(document.uri.toString());

	if (cached || !diagnosticCollection) {
		return cached;
	}

	log.trace(`Cold analysis, not in cache: ${document.uri.toString()}`);
	return analyzeDocument(document);
}

/** Re-analyzes every open STXT document; for when the settings or the schemas change. */
export function analyzeAllOpenDocuments(): void{
	for (const doc of vscode.workspace.textDocuments) {
		if (doc.languageId === 'stxt') {
			log.trace(`Re-analyzing open document: ${doc.uri.toString()}`);
			analyzeDocument(doc);
		}
	}
}

/**
 * Analyzes one document: a single parse yields diagnostics, tokens and the line maps at once.
 * The diagnostics are published to the collection and the {@link AnalysisResult} refreshes the
 * cache every provider reads through {@link getAnalysis}.
 */
export function analyzeDocument(document: vscode.TextDocument): AnalysisResult {
	const diagnostics: vscode.Diagnostic[] = [];

	// Create the observer that generates tokens and nodeByLine during parsing. It asks the
	// grammar of each block's namespace for its type, to colour MARKDOWN blocks as Markdown;
	// the resolution chain is the document's own (STXT-DISCOVERY-SPEC section 7).
	const tokenObserver = new TokenGeneratorObserver(node => node.getNamespace()
		? getSchemaForDocument(document.uri, node.getNamespace())?.getNodeDefinition(node.getName())?.getType()
		: undefined);

	// Parse the document, with schema validation unless the setting turns it off. The
	// provider is created with the document's Uri: each document validates against its own
	// resolution chain (STXT-DISCOVERY-SPEC section 7), not against the union of everything
	// loaded. With validation on, a namespace that no definition of the chain covers is a
	// SCHEMA_NOT_FOUND warning (STXT-SCHEMA-SPEC section 13) also when the chain is empty:
	// the setting decides whether a document is validated, not the presence of unrelated
	// definitions. Until 0.10.0 the code was silenced on an empty chain, and a document's
	// verdict changed when an unrelated schema was installed beside it.
	const schemaValidation = isSchemaValidationEnabled(document);
	const parser = new Parser(parserLimits(document));
	parser.registerObserver(tokenObserver);
	if (schemaValidation) {
		parser.registerValidator(new SchemaValidator(new SchemaLoaderExtension(document.uri)));
	}
	const parseResult: ParseResult = parser.parseResult(document.getText());

	// Collect the tokens and the line maps generated by the observer
	const tokens = tokenObserver.getTokens();
	const nodeByLine = tokenObserver.getNodeByLine();
	const commentLines = tokenObserver.getCommentLines();
	const textNodeByLineIndex = tokenObserver.getTextNodeByLineIndex();

	// Convert errors to diagnostics
	for (const error of parseResult.getErrors()) {
		const line = error.line > 0 ? error.line - 1 : 0;
		const severity = error instanceof ValidationException
			? vscode.DiagnosticSeverity.Warning
			: vscode.DiagnosticSeverity.Error;
		diagnostics.push(new vscode.Diagnostic(fullLineRange(document, line), `[${error.code}]: ${error.message}`, severity));
	}

	// A definition document is itself checked by its transform (same layer as schema
	// validation, so the same setting governs it, as `--no-schema` does in the CLI).
	if (schemaValidation) {
		validateSpecialDocument(document, parseResult.getNodes(), diagnostics, "@stxt.template", "Template", transformTemplateNodeToSchema);
		validateSpecialDocument(document, parseResult.getNodes(), diagnostics, "@stxt.schema", "Schema", transformNodeToSchema);
	}

	// Publish the diagnostics (activate() created the collection; the cold path of
	// getAnalysis() only gets here once it exists)
	diagnosticCollection?.set(document.uri, diagnostics);

	// Store the results
	const result: AnalysisResult = { tokens, nodeByLine, commentLines, textNodeByLineIndex };
	LAST_ANALYSIS_BY_URI.set(document.uri.toString(), result);

	log.trace(`Analysis of ${document.uri.toString()}: ${tokens.length} tokens, ${diagnostics.length} diagnostics.`);
	return result;
}

/** The range covering the whole text of a (0-based) line of the document. */
function fullLineRange(document: vscode.TextDocument, line: number): vscode.Range {
	return new vscode.Range(line, 0, line, document.lineAt(line).text.length);
}

function validateSpecialDocument(document: vscode.TextDocument, nodes: Node[], diagnostics: vscode.Diagnostic[],
	namespace: string, typeName: string, transformer: (node: Node) => Schema): void {

	nodes.forEach((node) => {
		if (node.getNamespace() === namespace) {
			try {
				transformer(node);
			} catch (e: unknown) {
				if (e instanceof ParseException) {
					const line = e.line > 0 ? e.line - 1 : 0;
					diagnostics.push(new vscode.Diagnostic(fullLineRange(document, line), `${typeName} error [${e.code}]: ${e.message}`, vscode.DiagnosticSeverity.Error));
				} else if (e instanceof Error) {
					diagnostics.push(new vscode.Diagnostic(fullLineRange(document, 0), `Error: ${e.message}`, vscode.DiagnosticSeverity.Error));
				} else {
					diagnostics.push(new vscode.Diagnostic(fullLineRange(document, 0), `Unknown error: ${String(e)}`, vscode.DiagnosticSeverity.Error));
				}
			}
		}
	});
}
