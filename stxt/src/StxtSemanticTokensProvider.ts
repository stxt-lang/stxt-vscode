import * as vscode from 'vscode';
import { Node } from './core/Node';
import { LineIndent } from './core/LineIndent';
import { LineIndentParser } from './core/LineIndentParser';

// *****************
// Tokens semánticos
// *****************

const tokenTypes = [
    'keyword',
    'property',
    'string',
    'variable',
    'comment'
];

export const tokenLegend = new vscode.SemanticTokensLegend(tokenTypes);

export class StxtSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {

        const builder = new vscode.SemanticTokensBuilder(tokenLegend);
        const lines = document.getText().split(/\r?\n/);
        console.log("Init 1!");

        const stack: Node[] = [];
        let lastNode: Node = new Node(0,0,"Init",null,false,"");
        console.log("Init 2");

        lines.forEach((line, lineIndex) => {
            const lastLevel = lastNode ? lastNode.getLevel() : 0;
            const lastNodeText = lastNode ? lastNode.isTextNode() : false;

            // Parseamos línea
            try
            {
            const lineIndent: LineIndent | null = LineIndentParser.parseLine(line,lastNodeText,lastLevel,lineIndex + 1);
            console.log(lineIndent);
            }
            catch(e)
            {
                console.log("Error: " + e);
                // Añadir a errores!! ¿Está bien?
            }
            
            // Comment (hacer mejor)
            if (line.trim().startsWith("#")) {
                builder.push(lineIndex, 0, line.length, tokenTypes.indexOf('comment'));
            }
        });

        return builder.build();
    }
}
