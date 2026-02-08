import * as vscode from 'vscode';

// ******************
// Variables globales
// ******************

const tokenTypes = [
    'keyword',
    'property',
    'string',
    'variable'
];

const tokenLegend = new vscode.SemanticTokensLegend(tokenTypes);

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

// *****************
// Tokens semánticos
// *****************

class StxtSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

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
