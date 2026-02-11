import * as vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { tokenLegend, tokenTypeIndex } from './Tokens';

export class StxtSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
    const builder = new vscode.SemanticTokensBuilder(tokenLegend);

    const analysis = getLastAnalysis(document);
    if (!analysis) {
		return builder.build();
	} 

    for (const t of analysis.tokens) {
      builder.push(t.line, t.startChar, t.length, tokenTypeIndex[t.type]);
    }

    return builder.build();
  }
}
