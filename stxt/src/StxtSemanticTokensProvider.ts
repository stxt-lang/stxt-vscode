import * as vscode from 'vscode';

// *****************
// Tokens semánticos
// *****************

const tokenTypes = [
    'keyword',
    'property',
    'string',
    'variable'
];

export const tokenLegend = new vscode.SemanticTokensLegend(tokenTypes);

export class StxtSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {

        const builder = new vscode.SemanticTokensBuilder(tokenLegend);
        const lines = document.getText().split(/\r?\n/);

        lines.forEach((line, lineIndex) => {

            // @tag
            const tagMatch = line.match(/^(\s*)(@\w+)/);
            if (tagMatch) {
                const start = tagMatch[1].length;
                const length = tagMatch[2].length;
                builder.push(lineIndex, start, length, tokenTypes.indexOf('keyword'));
            }

            // key: value
            const kvMatch = line.match(/^(\s*)(\w+)\s*:\s*(.+)?$/);
            if (kvMatch) {
                const keyStart = kvMatch[1].length;
                const keyLength = kvMatch[2].length;
                builder.push(lineIndex, keyStart, keyLength, tokenTypes.indexOf('property'));

                if (kvMatch[3]) {
                    const valueStart = line.indexOf(kvMatch[3]);
                    const valueLength = kvMatch[3].length;

                    builder.push(lineIndex, valueStart, valueLength, tokenTypes.indexOf('string'));
                }
            }

            // [[link]]
            const linkRegex = /\[\[([^\]]+)\]\]/g;
            let match;
            while ((match = linkRegex.exec(line))) {
                builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf('variable'));
            }
        });

        return builder.build();
    }
}
