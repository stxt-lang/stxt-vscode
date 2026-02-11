import * as vscode from 'vscode';
import { STXT_TAGS } from './StxtCompletionProvider';

export class StxtHoverProvider implements vscode.HoverProvider {

    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {

        const range = document.getWordRangeAtPosition(position, /@\w+/);
        if (!range) {
            return;
        }

        const word = document.getText(range);

        const description = STXT_TAGS[word];
        if (!description) {
            return;
        }

        return new vscode.Hover(
            new vscode.MarkdownString(`**${word}**\n\n${description}`)
        );
    }
}
