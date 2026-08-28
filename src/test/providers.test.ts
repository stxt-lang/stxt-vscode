import * as assert from 'assert';
import * as path from 'path';
import { InlineNode } from '@stxt-lang/core';
import { StxtToken } from '../extension/Tokens';
import { StxtFormattingProvider } from '../extension/FormattingProvider';
import { StxtCompletionProvider } from '../extension/CompletionProvider';
import { StxtDefinitionProvider } from '../extension/DefinitionProvider';
import { StxtHoverProvider } from '../extension/HoverProvider';
import { Hover, MarkdownString, setConfiguration } from './stub/vscode';
import { findEnumValues, findRootLevelSuggestions, findSuggestionsByParent } from '../extension/CompletionProviderSearch';
import { asPosition, asTextDocument, applyEdits } from './stub/TestDocument';
import { analyze, describeCorpus, loadSchemas, parseTree } from './corpus';
import { MarkdownSpan, newMarkdownState, tokenizeMarkdownLine } from '../extension/MarkdownTokenizer';

/**
 * Targeted cases for the two files with logic of the extension's own:
 * the observer that colours and the suggestion lookup.
 *
 * The observer ones need no schemas; the completion ones do, and they use those of the
 * stxt-lang corpus so as not to invent a fake schema that drifts out of sync.
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

function format(text: string, insertSpaces = false): string {
	const { document } = analyze('/tmp/format.stxt', text);
	return applyEdits(text, FORMATTING.provideDocumentFormattingEdits(asTextDocument(document), { insertSpaces, tabSize: 4 }));
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
		// which level to place it at: it only converts its indentation units to the editor's
		// style (none here, tabs to tabs) instead of inventing an indent.
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

	it('re-indents the lines of a text block to the level of the block', () => {
		// Like `stxt format` of the CLI: the block level is rewritten, the extra indentation
		// of a line beyond it is content and stays.
		assert.strictEqual(format('Doc >>\n    una línea\n        sangrada'), 'Doc >>\n\tuna línea\n\t    sangrada');
	});

	it('indents the blank lines inside a text block to the level of the block', () => {
		// STXT-SPEC §10.3: a blank line before more block text is "" whatever its indentation,
		// so writing it with the indentation of the block changes nothing, keeps the block in
		// one piece, and is what the CLI does too. Blank lines outside a block have no level
		// and stay empty.
		assert.strictEqual(format('Doc >>\n\tuna\n\n\t\t\t\n\totra'), 'Doc >>\n\tuna\n\t\n\t\n\totra');
		assert.strictEqual(format('Doc >>\n\tuna\n\t\n\totra'), 'Doc >>\n\tuna\n\t\n\totra');
		assert.strictEqual(format('Doc >>\n\tuna\n\n\totra', true), 'Doc >>\n    una\n    \n    otra');
		assert.strictEqual(format('Padre:\n\tHijo: v\n\t\n\tOtro: w'), 'Padre:\n\tHijo: v\n\n\tOtro: w');
	});

	it('normalises a whitespace-only last line of a text block to a plain blank line', () => {
		// The final blank lines of a block are not content (STXT-SPEC §10.3, since core 0.15.0:
		// the parser drops them when the block closes), so the formatter leaves them plain and
		// unindented, like any blank line outside a block.
		assert.strictEqual(format('Doc >>\n\tuna\n\t\t\t'), 'Doc >>\n\tuna\n');
		assert.strictEqual(format('Doc >>\n\tuna\n\t\t\t\nOtro: x'), 'Doc >>\n\tuna\n\nOtro: x');
	});

	describe('comment lines', () => {
		// STXT-SPEC §9 validates the indentation of a comment like a node's (whole units, at most
		// one level deeper than the last node), so the formatter converts its units one for one:
		// the comment does not stay in the old style. Same rule as `stxt format` of the CLI and
		// the playground.
		const MIXED = 'Padre: p\n\t# tab comment\n    # spaces comment\n\tHijo: v\n\t\t# two units, after a childless node';

		it('converts their indentation units to tabs', () => {
			assert.strictEqual(format(MIXED),
				'Padre: p\n\t# tab comment\n\t# spaces comment\n\tHijo: v\n\t\t# two units, after a childless node');
		});

		it('converts their indentation units to spaces', () => {
			assert.strictEqual(format(MIXED, true),
				'Padre: p\n    # tab comment\n    # spaces comment\n    Hijo: v\n        # two units, after a childless node');
		});

		it('reports a comment with invalid indentation as a syntax error, like a node', () => {
			const { diagnostics } = analyze('/tmp/format.stxt', 'Padre: p\n\t\t  # mixed\n  # two spaces\n\t\t# level 2 after level 0');
			assert.deepStrictEqual(diagnostics.map((d) => `${d.range.start.line + 1}:${d.message.split(']')[0]}]`),
				['2:[INDENTATION_MIXED]', '3:[INDENTATION_SPACES_NOT_VALID]', '4:[INDENTATION_LEVEL_NOT_VALID]']);
		});

		it('leaves a comment at the margin alone', () => {
			assert.strictEqual(format('# nada más\nDoc: v', true), '# nada más\nDoc: v');
		});
	});

	describe('when the editor inserts spaces', () => {
		it('indents with four spaces per level, nodes and block lines alike', () => {
			assert.strictEqual(format('Padre: p\n\tHijo: v\n\t\tTexto >>\n\t\t\tlínea', true),
				'Padre: p\n    Hijo: v\n        Texto >>\n            línea');
		});

		it('uses four spaces whatever the tab size, so the result is valid STXT', () => {
			// STXT-SPEC: an indentation of spaces is a multiple of four; two would be an error.
			const { document } = analyze('/tmp/format.stxt', 'Padre: p\n\tHijo: v');
			const edits = FORMATTING.provideDocumentFormattingEdits(asTextDocument(document), { insertSpaces: true, tabSize: 2 });
			assert.strictEqual(applyEdits('Padre: p\n\tHijo: v', edits), 'Padre: p\n    Hijo: v');
		});

		it('converts a document written with tabs, and tabs converts it back', () => {
			// The blank line of the block takes the indentation of the block in both styles.
			const tabs = 'Padre: p\n\tHijo: v\n\tTexto >>\n\t\tuna\n\t\t\n\t\t\tsangrada';
			const spaces = 'Padre: p\n    Hijo: v\n    Texto >>\n        una\n        \n        \tsangrada';
			assert.strictEqual(format(tabs, true), spaces);
			assert.strictEqual(format(spaces, false), tabs);
		});

		it('does not touch a document already indented with spaces', () => {
			const text = 'Padre:\n    Hijo: v\n    Texto >>\n        línea';
			assert.strictEqual(format(text, true), text);
		});
	});
});

describeCorpus('Completion with the corpus schemas', root => {

	// The org.example.enum.test schema of stxt-lang: Document has the children Priority
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

describe('HoverProvider', () => {
	const HOVER = new StxtHoverProvider();

	afterEach(() => setConfiguration('stxt.developerMode', undefined));

	function hoverText(text: string, line: number, developerMode: boolean): string | undefined {
		setConfiguration('stxt.developerMode', developerMode);
		const { document } = analyze('/tmp/hover.stxt', text);
		const hover = HOVER.provideHover(asTextDocument(document), asPosition(line, 0)) as Hover | undefined;
		if (!hover) {
			return undefined;
		}
		const contents = Array.isArray(hover.contents) ? hover.contents : [hover.contents];
		return contents.map(c => (c as MarkdownString).value).join('\n');
	}

	it('shows nothing in normal mode when no grammar declares the node', () => {
		assert.strictEqual(hoverText('Doc: hola\n\tHijo: v', 1, false), undefined);
	});

	it('shows the technical card in developer mode, grammar or not', () => {
		const text = hoverText('Doc: hola\n\tHijo: v', 1, true);
		assert.ok(text?.includes('INLINE (Level 1)'), 'the form and level');
		assert.ok(text?.includes('**🏷️ Name:** `Hijo`'), 'the name');
		assert.ok(text?.includes('**💎 Value:** `v`'), 'the value');
	});

	it('shows the content of a text block only in developer mode', () => {
		const text = 'Doc >>\n\tuna línea';
		assert.strictEqual(hoverText(text, 0, false), undefined);
		assert.ok(hoverText(text, 0, true)?.includes('una línea'));
	});

	it('shows comments only in developer mode', () => {
		const text = '# nota\nDoc: v';
		assert.strictEqual(hoverText(text, 0, false), undefined);
		assert.ok(hoverText(text, 0, true)?.includes('Comment'));
	});

	it('shows nothing over the text lines of a block, in either mode', () => {
		const text = 'Doc >>\n\tuna línea';
		assert.strictEqual(hoverText(text, 1, false), undefined);
		assert.strictEqual(hoverText(text, 1, true), undefined);
	});
});

describe('MarkdownTokenizer', () => {

	// Compact representation of a span: its type without the prefix and the text it covers.
	function spansOf(line: string, state = newMarkdownState()): string[] {
		return tokenizeMarkdownLine(line, state)
			.map((span: MarkdownSpan) => `${span.type.replace('markdown', '').toLowerCase()}[${line.substring(span.startChar, span.startChar + span.length)}]`);
	}

	it('colours a heading line as a whole', () => {
		assert.deepStrictEqual(spansOf('# Título'), ['heading[# Título]']);
		assert.deepStrictEqual(spansOf('###### h6 con **negrita**'), ['heading[###### h6 con **negrita**]']);
		assert.deepStrictEqual(spansOf('#sin espacio'), [], 'a # without whitespace is not a heading');
	});

	it('colours the inline constructs: bold, italic, code and links', () => {
		assert.deepStrictEqual(spansOf('Texto con **negrita**, *cursiva*, `código` y [enlace](https://x.y).'), [
			'bold[**negrita**]', 'italic[*cursiva*]', 'code[`código`]', 'link[[enlace](https://x.y)]'
		]);
		assert.deepStrictEqual(spansOf('__bold__ _it_ ***fuerte*** ![img](p.png) <https://a.b>'), [
			'bold[__bold__]', 'italic[_it_]', 'bold[***fuerte***]', 'link[![img](p.png)]', 'link[<https://a.b>]'
		]);
	});

	it('does not take underscores inside words or escaped markers as emphasis', () => {
		assert.deepStrictEqual(spansOf('snake_case_name y otro_nombre_así'), []);
		assert.deepStrictEqual(spansOf('\\*no\\* es cursiva'), []);
		assert.deepStrictEqual(spansOf('un * suelto y otro *'), []);
	});

	it('colours list and quote markers and keeps parsing the rest of the line', () => {
		assert.deepStrictEqual(spansOf('- item con **x**'), ['list[-]', 'bold[**x**]']);
		assert.deepStrictEqual(spansOf('  1. ordenado'), ['list[1.]']);
		assert.deepStrictEqual(spansOf('> cita con *x*'), ['quote[>]', 'italic[*x*]']);
		assert.deepStrictEqual(spansOf('> > # título citado'), ['quote[> >]', 'heading[# título citado]']);
		assert.deepStrictEqual(spansOf('-x'), [], 'a marker needs whitespace after it');
	});

	it('colours a fenced code block as code, from fence to fence, ignoring the markup inside', () => {
		const state = newMarkdownState();
		assert.deepStrictEqual(spansOf('```js', state), ['code[```js]']);
		assert.deepStrictEqual(spansOf('const a = **1**; // # no heading', state), ['code[const a = **1**; // # no heading]']);
		assert.deepStrictEqual(spansOf('', state), []);
		assert.deepStrictEqual(spansOf('```', state), ['code[```]']);
		assert.deepStrictEqual(spansOf('ya fuera **x**', state), ['bold[**x**]']);
	});

	it('does not close a fence with a shorter one or with a different character', () => {
		const state = newMarkdownState();
		spansOf('````', state);
		spansOf('```', state);
		spansOf('~~~~', state);
		assert.deepStrictEqual(spansOf('**x**', state), ['code[**x**]'], 'still inside the fence');
		spansOf('`````', state);
		assert.deepStrictEqual(spansOf('**x**', state), ['bold[**x**]'], 'closed by a longer fence of the same character');
	});
});

describeCorpus('MARKDOWN blocks with the corpus grammars', root => {

	// dev.stxt.website of stxt-lang declares `Content: MARKDOWN` and `CODE: TEXT`.
	before(async () => {
		await loadSchemas(root);
	});

	function blockTokens(name: string, namespace: string): string[] {
		const text = `${name} (${namespace}) >>\n\t# Título\n\tCon **negrita** y \`código\`.\n\t\t- indentado`;
		return analyze('/tmp/markdown.stxt', text).analysis.tokens.filter(token => token.line > 0).map(describeToken);
	}

	it('colours the content of a MARKDOWN block, at the position of each line', () => {
		assert.deepStrictEqual(blockTokens('Content', 'dev.stxt.website'), [
			'1:1+8 markdownHeading',
			'2:5+11 markdownBold',
			'2:19+8 markdownCode',
			'3:2+1 markdownList'
		]);
	});

	it('leaves the content of a TEXT block, and of a block without grammar, uncoloured', () => {
		assert.deepStrictEqual(blockTokens('CODE', 'dev.stxt.website'), []);
		assert.deepStrictEqual(blockTokens('Content', 'no.grammar.here'), []);
	});

	it('keeps the tokens in document order when a comment closes the block (STXT-SPEC 9.1)', () => {
		// Since core 0.8.0 a comment at the level of the block node ends the block: the next
		// block is a new node, and its lines are coloured on their own.
		const text = 'Content (dev.stxt.website) >>\n\t**a**\n# comentario\nContent (dev.stxt.website) >>\n\t**b**';
		assert.deepStrictEqual(analyze('/tmp/markdown-comment.stxt', text).analysis.tokens.map(describeToken), [
			'0:0+8 macro', '0:8+18 namespace', '0:26+3 macro',
			'1:1+5 markdownBold',
			'2:0+12 comment',
			'3:0+8 macro', '3:8+18 namespace', '3:26+3 macro',
			'4:1+5 markdownBold'
		]);
	});
});

describeCorpus('Hover with the corpus definitions', root => {
	const HOVER = new StxtHoverProvider();

	// The dev.stxt.website template of stxt-lang describes its nodes in a Description block
	// ("Document: Un documento es bla, bla, bla"); Priority of org.example.enum.test is an ENUM
	// with no description.
	before(async () => {
		await loadSchemas(root);
	});

	afterEach(() => setConfiguration('stxt.developerMode', undefined));

	function hoverText(text: string, line: number, developerMode: boolean): string | undefined {
		setConfiguration('stxt.developerMode', developerMode);
		const { document } = analyze('/tmp/hover-corpus.stxt', text);
		const hover = HOVER.provideHover(asTextDocument(document), asPosition(line, 0)) as Hover | undefined;
		return hover ? (hover.contents as MarkdownString).value : undefined;
	}

	it('in normal mode shows the description and the type of the grammar, and nothing technical', () => {
		const text = hoverText('Document (dev.stxt.website): Título', 0, false);
		assert.strictEqual(text?.trim(), 'Un documento es bla, bla, bla\n\n---\n**Type:** `INLINE`');
	});

	it('in normal mode shows the type and the allowed values of an ENUM without a description', () => {
		const text = hoverText('Document (org.example.enum.test):\n\tPriority: high', 1, false);
		assert.strictEqual(text?.trim(), '**Type:** `ENUM` — `high`, `medium`, `low`');
	});

	it('in normal mode shows nothing for a namespace with no grammar loaded', () => {
		assert.strictEqual(hoverText('Doc (no.grammar.here): v', 0, false), undefined);
	});

	it('in developer mode shows the type, the allowed values and the description', () => {
		const enumText = hoverText('Document (org.example.enum.test):\n\tPriority: high', 1, true);
		assert.ok(enumText?.includes('**Type**: `ENUM`'), 'the type');
		assert.ok(enumText?.includes('`high`, `medium`, `low`'), 'the allowed values');

		const described = hoverText('Document (dev.stxt.website): Título', 0, true);
		assert.ok(described?.includes('INLINE (Level 0)'), 'the technical card');
		assert.ok(described?.includes('Un documento es bla, bla, bla'), 'and the description');
	});
});

describeCorpus('Go to definition with the corpus definitions', root => {

	// Two definitions of stxt-lang: org.example.enum.test is a schema (`Node: Document` on
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
