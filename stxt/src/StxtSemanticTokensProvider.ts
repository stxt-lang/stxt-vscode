import * as vscode from 'vscode';
import { getLastAnalysis } from './STXTAnalysis';

const tokenTypes = [
	'keyword',
	'property',
	'string',
	'variable',
	'comment'
];

export const tokenLegend = new vscode.SemanticTokensLegend(tokenTypes);

export class StxtSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
		const builder = new vscode.SemanticTokensBuilder(tokenLegend);

		const analysis = getLastAnalysis(document);
		if (!analysis) {
			return builder.build();
		}

		for (const t of analysis.tokens) {
			if (t.type === 'comment') {
				builder.push(
					t.line,
					t.startChar,
					t.length,
					tokenTypes.indexOf('comment')
				);
			}
		}

		return builder.build();
	}
}
