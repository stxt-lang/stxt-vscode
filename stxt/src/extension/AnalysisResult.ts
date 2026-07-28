import { Node } from 'stxt-parser-js';
import type { StxtToken } from './Tokens';

export interface AnalysisResult {
	tokens: StxtToken[];
	nodeByLine: Map<number, Node>;
	commentLines: Set<number>;
	textLineByLineNumber: Map<number, Node>;
}
