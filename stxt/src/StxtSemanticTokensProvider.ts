import * as vscode from 'vscode';
import { getLastAnalysis } from './STXTAnalysis';

const tokenTypes = [
  'comment',    // # ...
  'namespace',  // Clave (namespace)
  'property',   // Clave:
  'keyword',    // Nodo texto >>
  'string'      // valores y bloque de texto
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
			let index = tokenTypes.indexOf(t.type);
			if (index !== -1) {
				builder.push(t.line, t.startChar, t.length, index);
			} else {
				console.log("No valid type: " + t.type);
			}
		}

		return builder.build();
	}
}
