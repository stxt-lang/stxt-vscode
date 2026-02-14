import * as vscode from 'vscode';

const STXT_KEYS = [
    'author',
    'status',
    'version'
];

export class StxtCompletionProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {

        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        // Sugerencias de claves
        if (/^\s*\w*$/.test(linePrefix)) {
            return STXT_KEYS.map(key => {
                const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Value);
                item.insertText = `${key}: `;
                item.detail = 'STXT key';
                return item;
            });
        }

        return [];
    }
}
