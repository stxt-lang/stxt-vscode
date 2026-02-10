import * as vscode from 'vscode';
import { StxtSemanticTokensProvider, tokenLegend } from './StxtSemanticTokensProvider';

// ******************
// Variables globales
// ******************

let diagnosticCollection: vscode.DiagnosticCollection;

const STXT_TAGS: Record<string, string> = {
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

// ******************************
// Método principal de activación
// ******************************

export function activate(context: vscode.ExtensionContext) {
    console.log('STXT extension activated');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');
	context.subscriptions.push(diagnosticCollection);

	vscode.workspace.onDidOpenTextDocument(document => {
		if (document.languageId === 'stxt') {
			handleStxtDocument(document);
		}
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		const document = event.document;
		if (document.languageId === 'stxt') {
			handleStxtChangeTextDocument(event, document);
		}
	});

	vscode.workspace.onDidCloseTextDocument(document => {
    	diagnosticCollection.delete(document.uri);
	});

    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'stxt' },
            new StxtSemanticTokensProvider(),
            tokenLegend
    ));

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            'stxt',
            new StxtHoverProvider()
    ));

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            'stxt',
            new StxtCompletionProvider(),
            '@' // carácter que dispara sugerencias
    ));

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            'stxt',
            new StxtFormattingProvider()
        )
    );

}

export function deactivate() {}

// *************************************
// Modificación y apertura de documentos
// *************************************

function handleStxtDocument(document: vscode.TextDocument) {
	console.log('Documento STXT abierto:', document.uri.toString());
    const text = document.getText();
    console.log('Procesando STXT:\n', text);
	validateStxtDocument(document);
}

function handleStxtChangeTextDocument(event: vscode.TextDocumentChangeEvent, document: vscode.TextDocument) {
	console.log('Documento STXT modificado');
	validateStxtDocument(document);
}

// ************************
// Validación del documento
// ************************

function validateStxtDocument(document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = [];

    const lines = document.getText().split(/\r?\n/);

    lines.forEach((line, index) => {
        const lineNumber = index;

        // Regla 1: etiqueta sin :
        if (line.trim().startsWith('@') && !line.includes(':')) {
            const range = new vscode.Range(lineNumber,0,lineNumber,line.length);
            diagnostics.push(new vscode.Diagnostic(range, 'Las etiquetas STXT deben usar ":"', vscode.DiagnosticSeverity.Error));
        }

        // Regla 2: key: sin valor
        if (/^\s*\w+\s*:\s*$/.test(line)) {
            const range = new vscode.Range(lineNumber,0,lineNumber,line.length);
            diagnostics.push(new vscode.Diagnostic(range, 'La clave tiene que tener un valor', vscode.DiagnosticSeverity.Warning));
        }
    });

    diagnosticCollection.set(document.uri, diagnostics);
}

// ******************
// Formating provider
// ******************

class StxtFormattingProvider implements vscode.DocumentFormattingEditProvider {

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

// *********************
// Completation provider
// *********************

class StxtCompletionProvider implements vscode.CompletionItemProvider {

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

// **************
// Hover provider
// **************

class StxtHoverProvider implements vscode.HoverProvider {

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
