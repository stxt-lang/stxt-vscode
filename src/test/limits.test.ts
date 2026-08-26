import * as assert from 'assert';
import { setConfiguration } from './stub/vscode';
import { analyze, describeDiagnostics } from './corpus';

// The stxt.maxNesting / stxt.maxLineLength / stxt.maxInputSize settings feed the parser
// limits of STXT-SPEC 11.2 (parserLimits() in AnalysisDoc). Schema validation is turned off
// here so the diagnostics under test are exactly the parser's.

/** A document nesting the given number of levels (level 0 is the first), one node per level. */
function nested(levels: number): string {
	let content = '';
	for (let i = 0; i < levels; i++) {
		content += '\t'.repeat(i) + 'N' + i + ': v\n';
	}
	return content;
}

describe('Parser limits (stxt.max* settings)', () => {

	beforeEach(() => {
		setConfiguration('stxt.schemaValidation', false);
	});

	afterEach(() => {
		setConfiguration('stxt.schemaValidation', undefined);
		setConfiguration('stxt.maxNesting', undefined);
		setConfiguration('stxt.maxInputSize', undefined);
	});

	it('rejects a document deeper than the default nesting limit', () => {
		const { diagnostics } = analyze('/virtual/deep.stxt', nested(101));

		assert.ok(diagnostics.some(d => d.message.includes('LIMIT_NESTING_EXCEEDED')),
			`LIMIT_NESTING_EXCEEDED was expected:${describeDiagnostics(diagnostics)}`);
	});

	it('accepts a document of exactly 100 levels under the defaults', () => {
		const { diagnostics } = analyze('/virtual/deep.stxt', nested(100));

		assert.strictEqual(diagnostics.length, 0, `No diagnostic was expected:${describeDiagnostics(diagnostics)}`);
	});

	it('stxt.maxNesting -1 disables the nesting limit', () => {
		setConfiguration('stxt.maxNesting', -1);
		setConfiguration('stxt.maxInputSize', -1);

		const { diagnostics } = analyze('/virtual/deep.stxt', nested(150));

		assert.strictEqual(diagnostics.length, 0, `No diagnostic was expected:${describeDiagnostics(diagnostics)}`);
	});

	it('stxt.maxInputSize can lower the limit, and the limit error is the last diagnostic', () => {
		setConfiguration('stxt.maxInputSize', 10);

		const { diagnostics } = analyze('/virtual/doc.stxt', 'Nota: hola\n\tCuerpo: texto\n');

		assert.ok(diagnostics.length > 0, 'LIMIT_INPUT_SIZE_EXCEEDED was expected.');
		assert.ok(diagnostics[diagnostics.length - 1].message.includes('LIMIT_INPUT_SIZE_EXCEEDED'),
			describeDiagnostics(diagnostics));
	});
});
