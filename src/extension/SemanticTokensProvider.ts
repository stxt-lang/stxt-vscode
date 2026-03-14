import { DocumentSemanticTokensProvider, ProviderResult, SemanticTokens, SemanticTokensBuilder, TextDocument } from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { tokenLegend, tokenTypeIndex } from './Tokens';

export class StxtSemanticTokensProvider implements DocumentSemanticTokensProvider {
	provideDocumentSemanticTokens(document: TextDocument): ProviderResult<SemanticTokens> {
		const builder = new SemanticTokensBuilder(tokenLegend);

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
