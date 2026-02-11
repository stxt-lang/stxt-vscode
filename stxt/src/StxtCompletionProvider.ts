import * as vscode from 'vscode';

export const STXT_TAGS: Record<string, string> = {
    '@title': 'Título principal del documento',
    '@note': 'Nota informativa',
    '@todo': 'Tarea pendiente',
    '@author': 'Autor del documento'
};

const STXT_KEYS = [
    'author',
    'status',
    'version'
];

export class StxtCompletionProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {

        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        // Sugerencias de tags
        if (linePrefix.trim().startsWith('@')) {
            return Object.keys(STXT_TAGS).map(tag => {
                const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Keyword);
                item.insertText = `${tag}: `;
                item.detail = 'STXT tag';
                item.documentation = STXT_TAGS[tag];
                return item;
            });
        }

        // Sugerencias de claves
        if (/^\s*\w*$/.test(linePrefix)) {
            return STXT_KEYS.map(key => {
                const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
                item.insertText = `${key}: `;
                item.detail = 'STXT key';
                return item;
            });
        }

        return [];
    }
}
