import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { StxtToken } from '../extension/Tokens';
import { StxtFormattingProvider } from '../extension/FormattingProvider';
import { StxtCompletionProvider } from '../extension/CompletionProvider';
import { StxtHoverProvider } from '../extension/HoverProvider';
import { StxtSemanticTokensProvider } from '../extension/SemanticTokensProvider';
import { asPosition, asTextDocument, applyEdits } from './stub/TestDocument';
import {
	AnalyzedDocument, DOC_DIRS, analyze, analyzeFile, corpusFiles, describeCorpus,
	describeDiagnostics, errorsOf, loadSchemas, parseTree, treeSignature
} from './corpus';

/**
 * Invariantes de la capa de editor sobre el corpus real de stxt-web.
 *
 * Aquí no se comprueba la conformidad del lenguaje —de eso se encargan los tests de
 * `../stxt-js` contra el mismo corpus— sino lo que la extensión hace con documentos
 * que ya se saben válidos: que colorea dentro de la línea, que formatea sin cambiar lo
 * que el documento dice y que no revienta en ninguna posición del cursor.
 */

const FORMATTING = new StxtFormattingProvider();
const COMPLETION = new StxtCompletionProvider();
const HOVER = new StxtHoverProvider();
const SEMANTIC_TOKENS = new StxtSemanticTokensProvider();

// Formatea el documento pasando por el provider, sembrando antes el caché de análisis.
function format(filePath: string, text: string): string {
	const { document } = analyze(filePath, text);
	const edits = FORMATTING.provideDocumentFormattingEdits(asTextDocument(document));

	return applyEdits(text, edits);
}

// Deshace la codificación relativa del builder de semantic tokens.
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

// Todas las posiciones del cursor que vale la pena probar en una línea.
function columnsOf(text: string): number[] {
	return [...new Set([0, Math.floor(text.length / 2), Math.max(0, text.length - 1), text.length])];
}

describeCorpus('Corpus de stxt-web', root => {

	before(async () => {
		await loadSchemas(root);
	});

	const files = corpusFiles(root, DOC_DIRS);

	it('encuentra documentos que analizar', () => {
		assert.ok(files.length > 0, `No hay documentos .stxt en ${DOC_DIRS.join(', ')} de ${root}.`);
	});

	for (const file of files) {
		describe(path.relative(root, file), () => {
			let analyzed: AnalyzedDocument;

			before(() => {
				analyzed = analyzeFile(file);
			});

			it('se analiza sin errores de sintaxis', () => {
				const errors = errorsOf(analyzed.diagnostics);
				assert.strictEqual(errors.length, 0, `Errores de sintaxis:${describeDiagnostics(errors)}`);
			});

			it('todos los tokens caen dentro de su línea', () => {
				const { document, analysis } = analyzed;

				for (const token of analysis.tokens) {
					assert.ok(token.line >= 0 && token.line < document.lineCount,
						`Token en la línea ${token.line + 1}, fuera de un documento de ${document.lineCount} líneas.`);

					const lineText = document.lineAt(token.line).text;
					assert.ok(token.startChar >= 0, `Token con startChar ${token.startChar} en la línea ${token.line + 1}.`);
					assert.ok(token.length >= 0, `Token con longitud ${token.length} en la línea ${token.line + 1}.`);
					assert.ok(token.startChar + token.length <= lineText.length,
						`Token [${token.startChar}, ${token.startChar + token.length}) de tipo ${token.type} ` +
						`se sale de la línea ${token.line + 1}, que mide ${lineText.length}: «${lineText}»`);
				}
			});

			it('los tokens van en orden y no se solapan', () => {
				let previous: StxtToken | undefined;

				for (const token of analyzed.analysis.tokens) {
					if (previous) {
						assert.ok(token.line > previous.line || (token.line === previous.line && token.startChar >= previous.startChar + previous.length),
							`Token ${token.type} en ${token.line + 1}:${token.startChar} va detrás de ` +
							`${previous.type} en ${previous.line + 1}:${previous.startChar}+${previous.length}.`);
					}
					previous = token;
				}
			});

			it('los semantic tokens conservan las posiciones al codificarse', () => {
				const { document, analysis } = analyzed;
				const built = SEMANTIC_TOKENS.provideDocumentSemanticTokens(asTextDocument(document));

				assert.ok(built instanceof Object && 'data' in built, 'El provider no ha devuelto semantic tokens.');

				const decoded = decodeTokens((built as { data: Uint32Array }).data);
				assert.strictEqual(decoded.length, analysis.tokens.length, 'Número de tokens distinto tras codificar.');

				decoded.forEach((token, i) => {
					const original = analysis.tokens[i];
					assert.deepStrictEqual(
						{ line: token.line, startChar: token.startChar, length: token.length },
						{ line: original.line, startChar: original.startChar, length: original.length },
						`El token ${i} cambia de sitio al codificarlo: la codificación relativa se ha corrompido.`);
				});
			});

			it('el formateo es idempotente', () => {
				const original = fs.readFileSync(file, 'utf-8');
				const once = format(file, original);
				const twice = format(file, once);

				assert.strictEqual(twice, once, 'Formatear dos veces no da el mismo resultado.');
			});

			it('el formateo conserva el árbol', () => {
				const original = fs.readFileSync(file, 'utf-8');
				const formatted = format(file, original);

				assert.strictEqual(treeSignature(parseTree(formatted)), treeSignature(parseTree(original)),
					'El formateo ha cambiado el contenido del documento, no solo su escritura.');
			});

			it('el autocompletado no lanza en ninguna posición', () => {
				const document = analyzed.document;

				for (let line = 0; line < document.lineCount; line++) {
					for (const column of columnsOf(document.lineAt(line).text)) {
						try {
							COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(line, column));
						} catch (e) {
							assert.fail(`Autocompletado roto en ${line + 1}:${column} — ${String(e)}`);
						}
					}
				}
			});

			it('el hover no lanza en ninguna línea', () => {
				const document = analyzed.document;

				for (let line = 0; line < document.lineCount; line++) {
					try {
						HOVER.provideHover(asTextDocument(document), asPosition(line, 0));
					} catch (e) {
						assert.fail(`Hover roto en la línea ${line + 1} — ${String(e)}`);
					}
				}
			});
		});
	}
});

// Estos no necesitan el corpus: son los documentos rotos o a medio escribir que el
// editor tiene delante mientras se teclea, y que no deben tumbar a ningún provider.
describe('Documentos degenerados', () => {

	const cases: Record<string, string> = {
		'documento vacío': '',
		'solo saltos de línea': '\n\n\n',
		'solo un comentario': '# nada más\n',
		'línea sin cerrar': 'Nombre',
		'nodo de texto sin contenido': 'Texto >>\n',
		'indentación suelta': '\t\t\tHuérfano: valor\n'
	};

	for (const [name, text] of Object.entries(cases)) {
		it(`${name}: se analiza, se formatea y se completa sin lanzar`, () => {
			const filePath = `/tmp/degenerado-${name.replace(/\s+/g, '-')}.stxt`;

			const { document } = analyze(filePath, text);

			assert.doesNotThrow(() => FORMATTING.provideDocumentFormattingEdits(asTextDocument(document)));

			for (let line = 0; line < document.lineCount; line++) {
				for (const column of columnsOf(document.lineAt(line).text)) {
					assert.doesNotThrow(
						() => COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(line, column)),
						`Autocompletado roto en ${line + 1}:${column}.`);
				}
			}
		});
	}
});
