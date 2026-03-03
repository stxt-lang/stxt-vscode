import { Node } from '../core/Node';
import type { StxtToken } from './Tokens';

export interface AnalysisResult {
	tokens: StxtToken[];
	nodeByLine: Map<number, Node>;
}
