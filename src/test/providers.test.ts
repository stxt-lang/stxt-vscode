import * as assert from 'assert';
import * as path from 'path';
import { InlineNode } from '@stxt-lang/core';
import { StxtToken } from '../extension/Tokens';
import { StxtFormattingProvider } from '../extension/FormattingProvider';
import { StxtCompletionProvider } from '../extension/CompletionProvider';
import { StxtDefinitionProvider } from '../extension/DefinitionProvider';
import { findEnumValues, findRootLevelSuggestions, findSuggestionsByParent } from '../extension/CompletionProviderSearch';
import { asPosition, asTextDocument, applyEdits } from './stub/TestDocument';
import { analyze, describeCorpus, loadSchemas, parseTree } from './corpus';

/**
 * Targeted cases for the two files with logic of the extension's own:
 * the observer that colours and the suggestion lookup.
 *
 * The observer ones need no schemas; the completion ones do, and they use those of the
 * stxt-web corpus so as not to invent a fake schema that drifts out of sync.
 */

const FORMATTING = new StxtFormattingProvider();
const COMPLETION = new StxtCompletionProvider();
const DEFINITION = new StxtDefinitionProvider();

// Compact representation of a token, to compare at a glance.
function describeToken(token: StxtToken): string {
	return `${token.line}:${token.startChar}+${token.length} ${token.type}`;
}

function tokensOf(text: string): string[] {
	return analyze('/tmp/tokens.stxt', text).analysis.tokens.map(describeToken);
}

function format(text: string): string {
	const { document } = analyze('/tmp/format.stxt', text);
	return applyEdits(text, FORMATTING.provideDocumentFormattingEdits(asTextDocument(document)));
}

// The API `label` may be a string or an object with the label inside.
function labelsOf(items: readonly { label: string | { label: string } }[]): string[] {
	return items.map(item => typeof item.label === 'string' ? item.label : item.label.label).sort();
}

describe('TokenGeneratorObserver', () => {

	it('colours an inline node: name, colon and value', () => {
		// "Nombre: valor" — the colon is at position 6.
		assert.deepStrictEqual(tokensOf('Nombre: valor'), [
			'0:0+6 property',
			'0:6+1 property',
			'0:7+6 string'
		]);
	});

	it('colours the namespace of an inline node apart from the name', () => {
		// "Nodo (ns.uno): v" — parentheses at 5 and 12, colon at 13.
		assert.deepStrictEqual(tokensOf('Nodo (ns.uno): v'), [
			'0:0+5 property',
			'0:5+8 namespace',
			'0:13+1 property',
			'0:14+2 string'
		]);
	});

	it('colours the header of a text node', () => {
		assert.deepStrictEqual(tokensOf('Texto >>'), [
			'0:0+6 macro',
			'0:6+2 macro'
		]);
	});

	it('colours comments and records them as such', () => {
		const { analysis } = analyze('/tmp/comment.stxt', '# un comentario\nNodo: v');

		assert.deepStrictEqual(analysis.tokens[0], { line: 0, startChar: 0, length: 15, type: 'comment' });
		assert.ok(analysis.commentLines.has(0), 'Line 1 should be recorded as a comment.');
		assert.ok(!analysis.commentLines.has(1), 'Line 2 is not a comment.');
	});

	it('includes the indentation in the name token', () => {
		// The indentation goes inside the first token; being whitespace it is not visible
		// when painted, and this way the columns are absolute over the real line.
		assert.deepStrictEqual(tokensOf('Padre:\n\tHijo: v'), [
			'0:0+5 property',
			'0:5+1 property',
			'1:0+5 property',
			'1:5+1 property',
			'1:6+2 string'
		]);
	});

	it('colours the STXT inside the Structure block of a template', () => {
		const text = [
			'Template (@stxt.template): demo.tokens',
			'\tStructure >>',
			'\t\tDoc (demo.tokens):',
			'\t\t\tCampo: (1)'
		].join('\n');

		const lines = analyze('/tmp/template.stxt', text).analysis.tokens.map(token => token.line);

		assert.ok(lines.includes(2), 'Line 3, inside the block, should have tokens.');
		assert.ok(lines.includes(3), 'Line 4, inside the block, should have tokens.');
	});
});

describe('FormattingProvider', () => {

	it('trims the extra spaces around the value', () => {
		assert.strictEqual(format('Doc:    hola   '), 'Doc: hola');
	});

	it('rewrites the indentation with tabs according to the node level', () => {
		assert.strictEqual(format('Padre: p\n    Hijo: v'), 'Padre: p\n\tHijo: v');
	});

	it('leaves a line with invalid indentation untouched', () => {
		// A jump of more than one level produces no node, so the formatter does not know
		// which level to place it at: it leaves it as is instead of inventing an indent.
		const text = 'Padre: p\n\t\t\tHijo: v';
		assert.strictEqual(format(text), text);
	});

	it('does not touch an already formatted document', () => {
		const text = 'Padre:\n\tHijo: v\n\tOtro: w';
		assert.strictEqual(format(text), text);
	});

	it('does not add a trailing space to nodes without a value', () => {
		assert.strictEqual(format('Contenedor:'), 'Contenedor:');
		assert.strictEqual(format('Contenedor (ns.uno):'), 'Contenedor (ns.uno):');
	});

	it('preserves the lines of a text block', () => {
		const text = 'Doc >>\n\tuna línea\n\totra línea';
		assert.strictEqual(parseTree(format(text))[0].getText(), parseTree(text)[0].getText());
	});

	it('preserves the trailing empty line of a text block', () => {
		// STXT-SPEC §10.3: the empty lines of the block, trailing ones included, are
		// preserved. Here the last line of the file is indentation only.
		const text = 'Doc >>\n\tuna línea\n\t\t';
		assert.strictEqual(parseTree(format(text))[0].getText(), parseTree(text)[0].getText());
	});
});

describeCorpus('Completion with the corpus schemas', root => {

	// The org.example.enum.test schema of stxt-web: Document has the children Priority
	// (Max 1), Title (1,1) and Content (1,1, of type TEXT); Priority is an ENUM.
	const NAMESPACE = 'org.example.enum.test';

	before(async () => {
		await loadSchemas(root);
	});

	function documentNode(text: string): InlineNode {
		const node = parseTree(text)[0];
		assert.ok(node instanceof InlineNode, 'The test document produced no inline node.');
		return node;
	}

	it('suggests the children defined by the parent schema', () => {
		const parent = documentNode(`Document (${NAMESPACE}):\n\tTitle: hola`);
		const labels = labelsOf(findSuggestionsByParent(parent, ''));

		assert.ok(labels.includes('Priority'), `Priority was missing in ${labels.join(', ')}.`);
		assert.ok(labels.includes('Content'), `Content was missing in ${labels.join(', ')}.`);
	});

	it('does not suggest a child that has already reached its Max', () => {
		const parent = documentNode(`Document (${NAMESPACE}):\n\tTitle: hola`);
		const labels = labelsOf(findSuggestionsByParent(parent, ''));

		assert.ok(!labels.includes('Title'), 'Title has Max 1 and is already present, it should not be suggested.');
	});

	it('filters the suggestions by the prefix being typed', () => {
		const parent = documentNode(`Document (${NAMESPACE}):`);

		assert.deepStrictEqual(labelsOf(findSuggestionsByParent(parent, 'pri')), ['Priority']);
		assert.deepStrictEqual(labelsOf(findSuggestionsByParent(parent, 'zzz')), []);
	});

	it('proposes the ">>" block for children of type TEXT', () => {
		const parent = documentNode(`Document (${NAMESPACE}):`);
		const content = findSuggestionsByParent(parent, 'content')[0];

		assert.ok(content, 'Content was not suggested.');
		assert.ok(content.insertText?.toString().includes('>>'),
			`Content is TEXT, it should insert a block: "${content.insertText}".`);
	});

	it('offers the values of an ENUM and filters them by prefix', () => {
		const priority = documentNode(`Document (${NAMESPACE}):\n\tPriority: high`).getChildren()[0];

		assert.deepStrictEqual(labelsOf(findEnumValues(priority, '')), ['high', 'low', 'medium']);
		assert.deepStrictEqual(labelsOf(findEnumValues(priority, 'l')), ['low']);
	});

	it('suggests root nodes of the loaded schemas', () => {
		const labels = labelsOf(findRootLevelSuggestions('document'));
		assert.ok(labels.includes('Document'), `Document was missing in ${labels.join(', ')}.`);
	});

	it('completes through the real provider path while typing', () => {
		const text = `Document (${NAMESPACE}):\n\tPri`;
		const { document } = analyze('/tmp/completion.stxt', text);

		const items = COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(1, 4));

		assert.ok(Array.isArray(items), 'The provider should return a list of suggestions.');
		assert.deepStrictEqual(labelsOf(items), ['Priority']);
	});

	it('completes ENUM values after the colon', () => {
		const text = `Document (${NAMESPACE}):\n\tPriority: `;
		const { document } = analyze('/tmp/completion-enum.stxt', text);

		const items = COMPLETION.provideCompletionItems(asTextDocument(document), asPosition(1, 11));

		assert.ok(Array.isArray(items), 'The provider should return a list of suggestions.');
		assert.deepStrictEqual(labelsOf(items), ['high', 'low', 'medium']);
	});
});

describeCorpus('Go to definition with the corpus definitions', root => {

	// Two definitions of stxt-web: org.example.enum.test is a schema (`Node: Document` on
	// line 2, `Node: Priority` on line 12) and org.example.tomcat a template (`Server` on
	// line 3 of the file, its child `Port` on line 4).
	const SCHEMA_NAMESPACE = 'org.example.enum.test';
	const TEMPLATE_NAMESPACE = 'org.example.tomcat';

	before(async () => {
		await loadSchemas(root);
	});

	async function definitionOf(text: string, line: number, character: number): Promise<{ file: string, line: number } | undefined> {
		const { document } = analyze('/tmp/definition.stxt', text);
		const location = await DEFINITION.provideDefinition(asTextDocument(document), asPosition(line, character));

		return location ? { file: path.relative(root, location.uri.fsPath), line: location.range.start.line } : undefined;
	}

	it('jumps to the `Node:` line of the schema from the node name', async () => {
		const target = await definitionOf(`Document (${SCHEMA_NAMESPACE}):\n\tTitle: hola`, 0, 2);
		assert.deepStrictEqual(target, { file: path.join('.stxt', 'schemas', 'org.example.enum.test.stxt'), line: 1 });
	});

	it('jumps to the `Node:` line of a child that inherits the namespace', async () => {
		const target = await definitionOf(`Document (${SCHEMA_NAMESPACE}):\n\tPriority: high`, 1, 3);
		assert.deepStrictEqual(target, { file: path.join('.stxt', 'schemas', 'org.example.enum.test.stxt'), line: 11 });
	});

	it('jumps to the root of the definition from the namespace itself', async () => {
		const target = await definitionOf(`Document (${SCHEMA_NAMESPACE}):`, 0, 12);
		assert.deepStrictEqual(target, { file: path.join('.stxt', 'schemas', 'org.example.enum.test.stxt'), line: 0 });
	});

	it('jumps inside the Structure block of a template', async () => {
		const text = `Server (${TEMPLATE_NAMESPACE}):\n\tPort: 8080`;
		assert.deepStrictEqual(await definitionOf(text, 0, 2), { file: path.join('.stxt', 'templates', 'org.example.tomcat.stxt'), line: 2 });
		assert.deepStrictEqual(await definitionOf(text, 1, 3), { file: path.join('.stxt', 'templates', 'org.example.tomcat.stxt'), line: 3 });
	});

	it('offers nothing over the value, without namespace, or for an unknown namespace', async () => {
		assert.strictEqual(await definitionOf(`Document (${SCHEMA_NAMESPACE}):\n\tTitle: hola`, 1, 9), undefined);
		assert.strictEqual(await definitionOf('Document:\n\tTitle: hola', 0, 2), undefined);
		assert.strictEqual(await definitionOf('Document (no.such.namespace):', 0, 2), undefined);
	});

	it('offers nothing on a comment or an empty line', async () => {
		assert.strictEqual(await definitionOf(`# comment\nDocument (${SCHEMA_NAMESPACE}):\n`, 0, 2), undefined);
		assert.strictEqual(await definitionOf(`# comment\nDocument (${SCHEMA_NAMESPACE}):\n`, 2, 0), undefined);
	});
});
