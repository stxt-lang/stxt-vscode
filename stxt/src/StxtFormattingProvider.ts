import * as vscode from 'vscode';

// ******************
// Formating provider
// ******************

export class StxtFormattingProvider implements vscode.DocumentFormattingEditProvider {

    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {

        const lines = document.getText().split(/\r?\n/);
        const edits: vscode.TextEdit[] = [];

        let blockStart = -1;
        let maxKeyLength = 0;

        function flushBlock(endLine: number) {
            if (blockStart === -1) {
                return;
            }

            for (let i = blockStart; i < endLine; i++) {
                const line = lines[i];
                const match = line.match(/^(\s*)(\w+)\s*:\s*(.*)$/);
                if (!match) continue;

                const [, indent, key, value] = match;
                const paddedKey = key.padEnd(maxKeyLength, ' ');
                const newLine = `${indent}${paddedKey} : ${value}`;

                if (newLine !== line) {
                    edits.push(
                        vscode.TextEdit.replace(
                            new vscode.Range(i, 0, i, line.length),
                            newLine
                        )
                    );
                }
            }

            blockStart = -1;
            maxKeyLength = 0;
        }

        lines.forEach((line, index) => {
            const match = line.match(/^(\s*)(\w+)\s*:\s*(.*)$/);

            if (match && !line.trim().startsWith('#')) {
                if (blockStart === -1) {
                    blockStart = index;
                }
                maxKeyLength = Math.max(maxKeyLength, match[2].length);
            } else {
                flushBlock(index);
            }
        });

        flushBlock(lines.length);

        return edits;
    }
}
