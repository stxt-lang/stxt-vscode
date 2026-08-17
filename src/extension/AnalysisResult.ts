import { Node, TextNode } from '@stxt-lang/core';
import type { StxtToken } from './Tokens';

export interface AnalysisResult {
	tokens: StxtToken[];
	nodeByLine: Map<number, Node>;
	commentLines: Set<number>;
	textLineByLineNumber: Map<number, TextNode>;
	/**
	 * Content of each text line of a block, by 0-based line index, with the indentation of the
	 * block level removed and any further indentation kept (STXT-SPEC §10.2). What the formatter
	 * re-indents; the parse tree does not keep it line by line.
	 */
	textContentByLineNumber: Map<number, string>;
}
