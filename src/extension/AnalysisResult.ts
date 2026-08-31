import { Node, TextNode } from '@stxt-lang/core';
import type { StxtToken } from './Tokens';

export interface AnalysisResult {
	tokens: StxtToken[];
	nodeByLine: Map<number, Node>;
	commentLines: Set<number>;
	/** The block node whose text each line belongs to, by 0-based line index. */
	textNodeByLineIndex: Map<number, TextNode>;
}
