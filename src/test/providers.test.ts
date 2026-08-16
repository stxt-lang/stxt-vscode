import * as assert from 'assert';
import { InlineNode } from '@stxt-lang/core';
import { StxtToken } from '../extension/Tokens';
import { StxtFormattingProvider } from '../extension/FormattingProvider';
import { StxtCompletionProvider } from '../extension/CompletionProvider';
import { findEnumValues, findRootLevelSuggestions, findSuggestionsByParent } from '../extension/CompletionProviderSearch';
import { asPosition, asTextDocument, applyEdits } from './stub/TestDocument';
import { analyze, describeCorpus, loadSchemas, parseTree } from './corpus';

/**
 * Casos dirigidos de los dos ficheros con lógica propia de la extensión:
 * el observer que colorea y la búsqueda de sugerencias.
 *
 * Los del observer no necesitan schemas; los de autocompletado sí, y usan los del
 * corpus de stxt-web para no inventarse un schema de mentira que se desincronice.
 */

const FORMATTING = new StxtFormattingProvider();
const COMPLETION = new StxtCompletionProvider();

// Representación compacta de un token, para comparar de un vistazo.
function describeToken(token: StxtToken): string {
	return `${token.line}:${token.startChar}+${token.length} ${token.type}`;
}

function tokensOf(text: string): string[] {
	return analyze('/tmp/tokens.stxt', text).analysis.tokens.map(describeToken);
}

function format(text: string): string {
	const { document } = analyze('/tmp/formato.stxt', text);
	return applyEdits(text, FORMATTING.provideDocumentFormattingEdits(asTextDocument(document)));
}

// El `label` del API puede ser una cadena o un objeto con la etiqueta dentro.
function labelsOf(items: readonly { label: string | { label: string } }[]): string[] {
	return items.map(item => typeof item.label === 'string' ? item.label : item.label.label).sort();
}

describe('TokenGeneratorObserver', () => {

	it('colorea un nodo inline: nombre, dos puntos y valor', () => {
		// «Nombre: valor» — los dos puntos están en la posición 6.
		assert.deepStrictEqual(tokensOf('Nombre: valor'), [
			'0:0+6 property',
			'0:6+1 property',
			'0:7+6 string'
		]);
	});

	it('colorea el namespace de un nodo inline aparte del nombre', () => {
		// «Nodo (ns.uno): v» — paréntesis en 5 y 12, dos puntos en 13.
		assert.deepStrictEqual(tokensOf('Nodo (ns.uno): v'), [
			'0:0+5 property',
			'0:5+8 namespace',
			'0:13+1 property',
			'0:14+2 string'
		]);
	});

	it('colorea la cabecera de un nodo de texto', () => {
		assert.deepStrictEqual(tokensOf('Texto >>'), [
			'0:0+6 macro',
			'0:6+2 macro'
		]);
	});

	it('colorea los comentarios y los registra como tales', () => {
		const { analysis } = analyze('/tmp/comentario.stxt', '# un comentario\nNodo: v');

		assert.deepStrictEqual(analysis.tokens[0], { line: 0, startChar: 0, length: 15, type: 'comment' });
		assert.ok(analysis.commentLines.has(0), 'La línea 1 debería estar registrada como comentario.');
		assert.ok(!analysis.commentLines.has(1), 'La línea 2 no es un comentario.');
	});

	it('incluye la indentación en el token del nombre', () => {
		// La indentación va dentro del primer token; al ser espacio en blanco no se
		// nota al pintarlo, y así las columnas son absolutas sobre la línea real.
		assert.deepStrictEqual(tokensOf('Padre:\n\tHijo: v'), [
			'0:0+5 property',
			'0:5+1 property',
			'1:0+5 property',
			'1:5+1 property',
			'1:6+2 string'
		]);
	});

	it('colorea el STXT que hay dentro del bloque Structure de un template', () => {
		const text = [
			'Template (@stxt.template): demo.tokens',
			'\tStructure >>',
			'\t\tDoc (demo.tokens):',
			'\t\t\tCampo: (1)'
		].join('\n');

		const lines = analyze('/tmp/template.stxt', text).analysis.tokens.map(token => token.line);

		assert.ok(lines.includes(2), 'La línea 3, dentro del bloque, debería tener tokens.');
		assert.ok(lines.includes(3), 'La línea 4, dentro del bloque, debería tener tokens.');
	});
});

describe('FormattingProvider', () => {

	it('recorta los espacios sobrantes alrededor del valor', () => {
		assert.strictEqual(format('Doc:    hola   '), 'Doc: hola');
	});

	it('reescribe la indentación con tabuladores según el nivel del nodo', () => {
		assert.strictEqual(format('Padre: p\n    Hijo: v'), 'Padre: p\n\tHijo: v');
	});

	it('deja intacta una línea con indentación inválida', () => {
		// Un salto de más de un nivel no produce nodo, así que el formateador no sabe
		// a qué nivel colocarla: la deja como está en vez de inventarse una sangría.
		const text = 'Padre: p\n\t\t\tHijo: v';
		assert.strictEqual(format(text), text);
	});

	it('no toca un documento ya formateado', () => {
		const text = 'Padre:\n\tHijo: v\n\tOtro: w';
		assert.strictEqual(format(text), text);
	});

	it('no añade un espacio final a los nodos sin valor', () => {
		assert.strictEqual(format('Contenedor:'), 'Contenedor:');
		assert.strictEqual(format('Contenedor (ns.uno):'), 'Contenedor (ns.uno):');
	});

	it('conserva las líneas de un bloque de texto', () => {
		const text = 'Doc >>\n\tuna línea\n\totra línea';
		assert.strictEqual(parseTree(format(text))[0].getText(), parseTree(text)[0].getText());
	});

	it('conserva la línea vacía final de un bloque de texto', () => {
		// STXT-SPEC §10.3: las líneas vacías del bloque, también las finales, se
		// preservan. Aquí la última línea del fichero es solo indentación.
		const text = 'Doc >>\n\tuna línea\n\t\t';
		assert.strictEqual(parseTree(format(text))[0].getText(), parseTree(text)[0].getText());
	});
});

describeCorpus('Autocompletado con los schemas del corpus', root => {

	// El schema org.example.enum.test de stxt-web: Document tiene como hijos Priority
	// (Max 1), Title (1,1) y Content (1,1, de tipo TEXT); Priority es un ENUM.
	const NAMESPACE = 'org.example.enum.test';

	before(async () => {
		await loadSchemas(root);
	});

	function documentNode(text: string): InlineNode {
		const node = parseTree(text)[0];
		assert.ok(node instanceof InlineNode, 'El documento de prueba no ha producido ningún nodo inline.');
		return node;
	}

	it('sugiere los hijos que define el schema del padre', () => {
		const parent = documentNode(`Document (${NAMESPACE}):\n\tTitle: hola`);
		const labels = labelsOf(findSuggestionsByParent(parent, ''));

		assert.ok(labels.includes('Priority'), `Faltaba Priority en ${labels.join(', ')}.`);
		assert.ok(labels.includes('Content'), `Faltaba Content en ${labels.join(', ')}.`);
	});

	it('no sugiere un hijo que ya ha llegado a su Max', () => {
		const parent = documentNode(`Document (${NAMESPACE}):\n\tTitle: hola`);
		const labels = labelsOf(findSuggestionsByParent(parent, ''));

		assert.ok(!labels.includes('Title'), 'Title tiene Max 1 y ya está puesto, no debería sugerirse.');
	});

	it('filtra las sugerencias por el prefijo que se está tecleando', () => {
		const parent = documentNode(`Document (${NAMESPACE}):`);

		assert.deepStrictEqual(labelsOf(findSuggestionsByParent(parent, 'pri')), ['Priority']);
		assert.deepStrictEqual(labelsOf(findSuggestionsByParent(parent, 'zzz')), []);
	});

	it('propone el bloque «>>» para los hijos de tipo TEXT', () => {
		const parent = documentNode(`Document (${NAMESPACE}):`);
		const content = findSuggestionsByParent(parent, 'content')[0];

		assert.ok(content, 'No se ha sugerido Content.');
		assert.ok(content.insertText?.toString().includes('>>'),
			`Content es TEXT, debería insertar un bloque: «${content.insertText}».`);
	});

	it('ofrece los valores de un ENUM y los filtra por prefijo', () => {
		const priority = documentNode(`Document (${NAMESPACE}):\n\tPriority: high`).getChildren()[0];

		assert.deepStrictEqual(labelsOf(findEnumValues(priority, '')), ['high', 'low', 'medium']);
		assert.deepStrictEqual(labelsOf(findEnumValues(priority, 'l')), ['low']);
	});

	it('sugiere nodos raíz de los schemas cargados', () => {
		const labels = labelsOf(findRootLevelSuggestions('document'));
		assert.ok(labels.includes('Document'), `Faltaba Document en ${labels.join(', ')}.`);
	});

	it('completa por el camino real del provider mientras se teclea', () => {
		const text = `Document (${NAMESPACE}):\n\tPri`;
		const { document } = analyze('/tmp/completado.stxt', text);

		const items = COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(1, 4));

		assert.ok(Array.isArray(items), 'El provider debería devolver una lista de sugerencias.');
		assert.deepStrictEqual(labelsOf(items), ['Priority']);
	});

	it('completa valores de ENUM después de los dos puntos', () => {
		const text = `Document (${NAMESPACE}):\n\tPriority: `;
		const { document } = analyze('/tmp/completado-enum.stxt', text);

		const items = COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(1, 11));

		assert.ok(Array.isArray(items), 'El provider debería devolver una lista de sugerencias.');
		assert.deepStrictEqual(labelsOf(items), ['high', 'low', 'medium']);
	});
});
