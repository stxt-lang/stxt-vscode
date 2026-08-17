import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { StxtToken } from '../extension/Tokens';
import { StxtFormattingProvider } from '../extension/FormattingProvider';
import { StxtCompletionProvider } from '../extension/CompletionProvider';
import { StxtHoverProvider } from '../extension/HoverProvider';
import { StxtDefinitionProvider } from '../extension/DefinitionProvider';
import { StxtSemanticTokensProvider } from '../extension/SemanticTokensProvider';
import { asPosition, asTextDocument, applyEdits } from './stub/TestDocument';
import {
	AnalyzedDocument, DOC_DIRS, analyze, analyzeFile, corpusFiles, describeCorpus,
	describeDiagnostics, errorsOf, loadSchemas, parseTree, treeSignature
} from './corpus';

/**
 * Editor-layer invariants over the real stxt-web corpus.
 *
 * Language conformance is not checked here —the `../stxt-js` tests do that against the
 * same corpus— but what the extension does with documents already known to be valid:
 * that it colours within the line, that it formats without changing what the document
 * says, and that it does not blow up at any cursor position.
 */

const FORMATTING = new StxtFormattingProvider();
const COMPLETION = new StxtCompletionProvider();
const HOVER = new StxtHoverProvider();
const DEFINITION = new StxtDefinitionProvider();
const SEMANTIC_TOKENS = new StxtSemanticTokensProvider();

// The two indentation styles the editor can ask for.
const WITH_TABS = { insertSpaces: false, tabSize: 4 };
const WITH_SPACES = { insertSpaces: true, tabSize: 4 };

// Formats the document through the provider, seeding the analysis cache first.
function format(filePath: string, text: string, options = WITH_TABS): string {
	const { document } = analyze(filePath, text);
	const edits = FORMATTING.provideDocumentFormattingEdits(asTextDocument(document), options);

	return applyEdits(text, edits);
}

// Undoes the relative encoding of the semantic tokens builder.
function decodeTokens(data: Uint32Array): { line: number, startChar: number, length: number }[] {
	const result: { line: number, startChar: number, length: number }[] = [];
	let line = 0;
	let startChar = 0;

	for (let i = 0; i < data.length; i += 5) {
		const deltaLine = data[i];
		const deltaChar = data[i + 1];

		line += deltaLine;
		startChar = deltaLine === 0 ? startChar + deltaChar : deltaChar;

		result.push({ line, startChar, length: data[i + 2] });
	}

	return result;
}

// Every cursor position worth trying on a line.
function columnsOf(text: string): number[] {
	return [...new Set([0, Math.floor(text.length / 2), Math.max(0, text.length - 1), text.length])];
}

describeCorpus('stxt-web corpus', root => {

	before(async () => {
		await loadSchemas(root);
	});

	const files = corpusFiles(root, DOC_DIRS);

	it('finds documents to analyze', () => {
		assert.ok(files.length > 0, `No .stxt documents in ${DOC_DIRS.join(', ')} of ${root}.`);
	});

	for (const file of files) {
		describe(path.relative(root, file), () => {
			let analyzed: AnalyzedDocument;

			before(() => {
				analyzed = analyzeFile(file);
			});

			it('is analyzed without syntax errors', () => {
				const errors = errorsOf(analyzed.diagnostics);
				assert.strictEqual(errors.length, 0, `Syntax errors:${describeDiagnostics(errors)}`);
			});

			it('every token falls within its line', () => {
				const { document, analysis } = analyzed;

				for (const token of analysis.tokens) {
					assert.ok(token.line >= 0 && token.line < document.lineCount,
						`Token on line ${token.line + 1}, outside a document of ${document.lineCount} lines.`);

					const lineText = document.lineAt(token.line).text;
					assert.ok(token.startChar >= 0, `Token with startChar ${token.startChar} on line ${token.line + 1}.`);
					assert.ok(token.length >= 0, `Token with length ${token.length} on line ${token.line + 1}.`);
					assert.ok(token.startChar + token.length <= lineText.length,
						`Token [${token.startChar}, ${token.startChar + token.length}) of type ${token.type} ` +
						`overflows line ${token.line + 1}, which is ${lineText.length} long: "${lineText}"`);
				}
			});

			it('tokens are in order and do not overlap', () => {
				let previous: StxtToken | undefined;

				for (const token of analyzed.analysis.tokens) {
					if (previous) {
						assert.ok(token.line > previous.line || (token.line === previous.line && token.startChar >= previous.startChar + previous.length),
							`Token ${token.type} at ${token.line + 1}:${token.startChar} comes after ` +
							`${previous.type} at ${previous.line + 1}:${previous.startChar}+${previous.length}.`);
					}
					previous = token;
				}
			});

			it('semantic tokens keep their positions when encoded', () => {
				const { document, analysis } = analyzed;
				const built = SEMANTIC_TOKENS.provideDocumentSemanticTokens(asTextDocument(document));

				assert.ok(built instanceof Object && 'data' in built, 'The provider did not return semantic tokens.');

				const decoded = decodeTokens((built as { data: Uint32Array }).data);
				assert.strictEqual(decoded.length, analysis.tokens.length, 'Different number of tokens after encoding.');

				decoded.forEach((token, i) => {
					const original = analysis.tokens[i];
					assert.deepStrictEqual(
						{ line: token.line, startChar: token.startChar, length: token.length },
						{ line: original.line, startChar: original.startChar, length: original.length },
						`Token ${i} moves when encoded: the relative encoding is corrupted.`);
				});
			});

			for (const [style, options] of [['tabs', WITH_TABS], ['spaces', WITH_SPACES]] as const) {
				it(`formatting with ${style} is idempotent`, () => {
					const original = fs.readFileSync(file, 'utf-8');
					const once = format(file, original, options);
					const twice = format(file, once, options);

					assert.strictEqual(twice, once, 'Formatting twice does not give the same result.');
				});

				it(`formatting with ${style} preserves the tree`, () => {
					const original = fs.readFileSync(file, 'utf-8');
					const formatted = format(file, original, options);

					assert.strictEqual(treeSignature(parseTree(formatted)), treeSignature(parseTree(original)),
						'Formatting changed the document content, not only how it is written.');
				});
			}

			it('formatting with spaces leaves no tab in the indentation of nodes and block lines', () => {
				// The corpus is written with tabs: converting it is the real test of the spaces style.
				// Comment lines are kept as written (their indentation is not part of the language),
				// and the extra indentation of a block line beyond its level is content, so it may
				// still hold a tab after the spaces of the level: what must not remain is a line
				// whose indentation starts with a tab. A whitespace-only last line of a block is
				// kept as written too (STXT-SPEC §10.3), so blank lines do not count either.
				const original = fs.readFileSync(file, 'utf-8');
				const formatted = format(file, original, WITH_SPACES);
				const offenders = formatted.split(/\r?\n/)
					.filter(line => line.startsWith('\t') && line.trim() !== '' && !line.trim().startsWith('#'));

				assert.deepStrictEqual(offenders, [], 'A tab survived in the indentation of some line.');
			});

			it('formatting with tabs and then with spaces and back gives the tabs result again', () => {
				const original = fs.readFileSync(file, 'utf-8');
				const tabs = format(file, original, WITH_TABS);
				const spaces = format(file, tabs, WITH_SPACES);

				assert.strictEqual(format(file, spaces, WITH_TABS), tabs, 'The two styles are not inverse of each other.');
			});

			it('completion does not throw at any position', () => {
				const document = analyzed.document;

				for (let line = 0; line < document.lineCount; line++) {
					for (const column of columnsOf(document.lineAt(line).text)) {
						try {
							COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(line, column));
						} catch (e) {
							assert.fail(`Completion broken at ${line + 1}:${column} — ${String(e)}`);
						}
					}
				}
			});

			it('hover does not throw on any line', () => {
				const document = analyzed.document;

				for (let line = 0; line < document.lineCount; line++) {
					try {
						HOVER.provideHover(asTextDocument(document), asPosition(line, 0));
					} catch (e) {
						assert.fail(`Hover broken on line ${line + 1} — ${String(e)}`);
					}
				}
			});

			it('go to definition does not throw on any line', async () => {
				const document = analyzed.document;

				for (let line = 0; line < document.lineCount; line++) {
					try {
						await DEFINITION.provideDefinition(asTextDocument(document), asPosition(line, 0));
					} catch (e) {
						assert.fail(`Go to definition broken on line ${line + 1} — ${String(e)}`);
					}
				}
			});
		});
	}
});

// These do not need the corpus: they are the broken or half-written documents the
// editor faces while typing, and they must not bring down any provider.
describe('Degenerate documents', () => {

	const cases: Record<string, string> = {
		'empty document': '',
		'only line breaks': '\n\n\n',
		'only a comment': '# nada más\n',
		'unclosed line': 'Nombre',
		'text node without content': 'Texto >>\n',
		'stray indentation': '\t\t\tHuérfano: valor\n'
	};

	for (const [name, text] of Object.entries(cases)) {
		it(`${name}: is analyzed, formatted and completed without throwing`, () => {
			const filePath = `/tmp/degenerate-${name.replace(/\s+/g, '-')}.stxt`;

			const { document } = analyze(filePath, text);

			assert.doesNotThrow(() => FORMATTING.provideDocumentFormattingEdits(asTextDocument(document), WITH_TABS));
			assert.doesNotThrow(() => FORMATTING.provideDocumentFormattingEdits(asTextDocument(document), WITH_SPACES));

			for (let line = 0; line < document.lineCount; line++) {
				for (const column of columnsOf(document.lineAt(line).text)) {
					assert.doesNotThrow(
						() => COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(line, column)),
						`Completion broken at ${line + 1}:${column}.`);
				}
			}
		});
	}
});
