import { SemanticTokensLegend } from "vscode";

const STXT_TOKEN_TYPES = [
	'comment',
	'namespace',
	'property',
	'macro',
	'string'
] as const;

// Literal type derived automatically from the array
export type StxtTokenType = typeof STXT_TOKEN_TYPES[number];

// Legend derived from the same place
export const tokenLegend = new SemanticTokensLegend([...STXT_TOKEN_TYPES]);

// Mapping type -> index derived from the same place
export const tokenTypeIndex: Record<StxtTokenType, number> =
	Object.fromEntries(STXT_TOKEN_TYPES.map((t, i) => [t, i])) as Record<StxtTokenType, number>;

export interface StxtToken {
	line: number; // 0 based
	startChar: number; // 0 based
	length: number;
	type: StxtTokenType;
}