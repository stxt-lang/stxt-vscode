import * as vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { LineIndentParser } from '../core/LineIndentParser';
import { LineIndent } from '../core/LineIndent';
import { Constants } from '../core/Constants';
import { Node } from '../core/Node';
import { SchemaLoaderExtension } from './SchemaLoader';

/*
const STXT_KEYS = [
    'author',
    'status',
    'version',
    'demo'
];
*/

let schemaLoader: SchemaLoaderExtension = new SchemaLoaderExtension();

export class StxtCompletionProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {

        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        console.log(`Position: ${position.line}`);
        // TODO Si es la primera línea no mostramos nada. Debemos enseñar todos los de primer nivel
        if (position.line === 0) {
            return [];
        }

        // Si no hay análisis no mostramos nada
        let lastAnalisis: AnalysisResult | undefined = getLastAnalysis(document);
        if (!lastAnalisis) {
            return [];
        }

        // Si no está vacía no mostramos nada. 
        // TODO Debemos hacerlo mejor para mostrar los que empiezan con el nombre que tenemos
        if (linePrefix.trim() !== "") {
            return [];
        }

        // Buscamos nivel del cursor
        let level = getLevel(linePrefix);
        console.log("Level: " + level);

        // Buscamos parent
        let parent = null;
        let line = position.line;
        while (line > 0) {
            line = line - 1;
            const nodeAtLine = lastAnalisis.nodeByLine.get(line);
            if (nodeAtLine?.getLevel() === level-1) {
                parent = nodeAtLine;
                break;
            }
        }

        if (parent) {
            console.log(`Parent *****: ${parent.getQualifiedName()} (${parent.getLine()})`);

            return buscarSugerencias(parent);
        }

        return [];
    }
}

// TODO Hacer mejor para mostrar el prefix también y así poder enseñar los que empiezan
function getLevel(line: string): number {
    let level = 0;
    let spaces = 0;
    let pointer = 0;

    while (pointer < line.length) {
        const c = line.charAt(pointer);

        if (c === Constants.SPACE) {
            spaces++;
            if (spaces === Constants.TAB_SPACES) {
                level++;
                spaces = 0;
            }
        } else if (c === Constants.TAB) {
            level++;
            spaces = 0;
        } else if (c === Constants.COMMENT_CHAR) {
            return 0;
        } else {
            // Primer carácter no espacio/tab/comentario => fin de indentación
            break;
        }

        pointer++;
    }
    return level;
}

function buscarSugerencias(parent: Node): vscode.CompletionItem[] {
    console.log("Buscando esquema de " + parent.getQualifiedName());
    let schema = schemaLoader.getSchema(parent.getNamespace());

    if (!schema) {
        return [];
    }

    let nodeDef = schema.getNodeDefinition(parent.getName());
    if (!nodeDef) {
        return [];
    }

    const children = nodeDef.getChildren();
    const result: vscode.CompletionItem[] = [];

    for (let [childName, childDef] of children.entries()) {
        const item = new vscode.CompletionItem(childDef.getName(), vscode.CompletionItemKind.Value);
        if (childDef.getNamespace() === parent.getNamespace()) {
            item.insertText = `${childDef.getName()}: `;
        } else {
            item.insertText = `${childDef.getName()} (${childDef.getNamespace()}): `;
        }
        item.detail = childName;
        result.push(item);
    }

    return result;
}

