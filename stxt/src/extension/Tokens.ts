import { SemanticTokensLegend } from "vscode";

export const STXT_TOKEN_TYPES = [
	'comment',
	'namespace',
	'property',
	'macro',
	'string'
] as const;

// Tipo literal derivado automáticamente del array
export type StxtTokenType = typeof STXT_TOKEN_TYPES[number];

// Legend derivado del mismo sitio
export const tokenLegend = new SemanticTokensLegend([...STXT_TOKEN_TYPES]);

// Mapping type -> index derivado del mismo sitio
export const tokenTypeIndex: Record<StxtTokenType, number> =
	Object.fromEntries(STXT_TOKEN_TYPES.map((t, i) => [t, i])) as Record<StxtTokenType, number>;

export interface StxtToken {
	line: number; // 0 based
	startChar: number; // 0 based
	length: number;
	type: StxtTokenType;
}