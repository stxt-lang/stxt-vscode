import * as vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { Constants } from '../core/Constants';
import { Node } from '../core/Node';
import { SchemaLoaderExtension } from './SchemaLoader';
import { ChildDefinition } from '../schema/ChildDefinition';
import { StringUtils } from '../core/StringUtils';

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

        const completionContext = getCompletionContext(linePrefix);
        if (!completionContext) {
            return [];
        }

        // Buscamos nivel del cursor
        let level = completionContext.level;
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

            return buscarSugerencias(parent, completionContext.prefix);
        }

        return [];
    }
}

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

function getCompletionContext(linePrefix: string): { level: number, prefix: string } | null {
    const trimmed = linePrefix.trimStart();
    if (trimmed.startsWith(Constants.COMMENT_CHAR)) {
        return null;
    }

    // Si estamos ya en el valor/texto, no sugerimos nodos.
    if (trimmed.includes(Constants.SEP_NODE) || trimmed.includes('>>')) {
        return null;
    }

    const level = getLevel(linePrefix);
    const indentationLength = getIndentationLength(linePrefix);
    const rawNodePrefix = linePrefix.slice(indentationLength);

    // Permitimos texto para filtrar por prefijo de nombre.
    const prefix = rawNodePrefix.replace(/\s*\(.*$/, '').trimEnd();

    return { level, prefix };
}

function getIndentationLength(line: string): number {
    let pointer = 0;
    while (pointer < line.length) {
        const c = line.charAt(pointer);
        if (c !== Constants.SPACE && c !== Constants.TAB) {
            break;
        }
        pointer++;
    }
    return pointer;
}

function buscarSugerencias(parent: Node, prefix: string): vscode.CompletionItem[] {
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
    const normalizedPrefix = StringUtils.normalize(prefix);

    for (let [childName, childDef] of children.entries()) {
        if (normalizedPrefix.length > 0 && !StringUtils.normalize(childDef.getName()).startsWith(normalizedPrefix)) {
            continue;
        }
        const isText: boolean = isBlockText(childDef);
        const item = new vscode.CompletionItem(childDef.getName(), isText ? vscode.CompletionItemKind.Module: vscode.CompletionItemKind.EnumMember);
        if (childDef.getNamespace() === parent.getNamespace()) {
            if (isText) {
                item.insertText = `${childDef.getName()} >>\n\t`;
            } else {
                item.insertText = `${childDef.getName()}: `;
            }
        } else {
            if (isText) {
                item.insertText = `${childDef.getName()} (${childDef.getNamespace()})>>\n\t`;
            } else {
                item.insertText = `${childDef.getName()} (${childDef.getNamespace()}): `;
            }
        }
        item.detail = childName;
        result.push(item);
    }

    return result;
}

function isBlockText(childDef: ChildDefinition): boolean {
    try {
         const schema = schemaLoader.getSchema(childDef.getNamespace());
         if (!schema) {
            return false;
         }

         const nodeDef = schema.getNodeDefinition(childDef.getName());
         if (!nodeDef) { 
            return false;
         }

         const type = nodeDef.getType();
         return type === "TEXT" || type === "BLOCK";
    } catch (e) {
        return false;
    }
}
