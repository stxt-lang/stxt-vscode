import { Node } from '@stxt-lang/core';
import type { StxtToken } from './Tokens';

export interface AnalysisResult {
	tokens: StxtToken[];
	nodeByLine: Map<number, Node>;
	commentLines: Set<number>;
	textLineByLineNumber: Map<number, Node>;
}
