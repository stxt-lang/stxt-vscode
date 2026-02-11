import * as vscode from 'vscode';

export const STXT_TOKEN_TYPES = [
  'comment',
  'namespace',
  'property',
  'keyword',
  'string'
] as const;

// Tipo literal derivado automáticamente del array
export type StxtTokenType = typeof STXT_TOKEN_TYPES[number];

// Legend derivado del mismo sitio
export const tokenLegend = new vscode.SemanticTokensLegend([...STXT_TOKEN_TYPES]);

// Mapping type -> index derivado del mismo sitio
export const tokenTypeIndex: Record<StxtTokenType, number> =
  Object.fromEntries(STXT_TOKEN_TYPES.map((t, i) => [t, i])) as Record<StxtTokenType, number>;
