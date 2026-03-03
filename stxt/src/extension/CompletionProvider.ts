import vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { Constants } from '../core/Constants';
import { Node } from '../core/Node';
import { getSchemas, SchemaLoaderExtension } from './SchemaLoader';
import { ChildDefinition } from '../schema/ChildDefinition';
import { StringUtils } from '../core/StringUtils';
import { NodeDefinition } from '../schema/NodeDefinition';
import { Schema } from '../schema/Schema';
import { calculateIndentLevel, getIndentationLength } from '../core/IndentUtils';

let schemaLoader: SchemaLoaderExtension = new SchemaLoaderExtension();

export class StxtCompletionProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {

        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        console.log(`Position: ${position.line}`);

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

        if (level === 0) {
            return buscarSugerenciasPrimerNivel(completionContext.prefix);
        }

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

function getCompletionContext(linePrefix: string): { level: number, prefix: string } | null {
    const trimmed = linePrefix.trimStart();
    if (trimmed.startsWith(Constants.COMMENT_CHAR)) {
        return null;
    }

    // Si estamos ya en el valor/texto, no sugerimos nodos.
    if (trimmed.includes(Constants.SEP_NODE) || trimmed.includes('>>')) {
        return null;
    }

    const level = calculateIndentLevel(linePrefix);
    const indentationLength = getIndentationLength(linePrefix);
    const rawNodePrefix = linePrefix.slice(indentationLength);

    // Permitimos texto para filtrar por prefijo de nombre.
    const prefix = rawNodePrefix.replace(/\s*\(.*$/, '').trimEnd();

    return { level, prefix };
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

function buscarSugerenciasPrimerNivel(prefix: string): vscode.CompletionItem[] {
    const result: vscode.CompletionItem[] = [];
    const seen = new Set<string>();
    const normalizedPrefix = StringUtils.normalize(prefix);

    for (const schema of getSchemas()) {
        for (const nodeDef of getRootNodeDefinitions(schema)) {
            if (normalizedPrefix.length > 0 && !nodeDef.getNormalizedName().startsWith(normalizedPrefix)) {
                continue;
            }

            const key = `${schema.getNamespace()}:${nodeDef.getNormalizedName()}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);

            result.push(createCompletionItem(nodeDef.getName(), schema.getNamespace(), isBlockTextNode(nodeDef), false));
        }
    }

    return result;
}

function getRootNodeDefinitions(schema: Schema): NodeDefinition[] {
    const referencedLocalChildren = new Set<string>();

    for (const nodeDef of schema.getNodes().values()) {
        for (const childDef of nodeDef.getChildren().values()) {
            if (childDef.getNamespace() === schema.getNamespace()) {
                referencedLocalChildren.add(childDef.getNormalizedName());
            }
        }
    }

    const roots: NodeDefinition[] = [];
    for (const nodeDef of schema.getNodes().values()) {
        if (!referencedLocalChildren.has(nodeDef.getNormalizedName())) {
            roots.push(nodeDef);
        }
    }

    if (roots.length > 0) {
        return roots;
    }

    // Fallback si no podemos inferir raíces.
    return Array.from(schema.getNodes().values());
}

function isBlockTextNode(nodeDef: NodeDefinition): boolean {
    const type = nodeDef.getType();
    return type === "TEXT" || type === "BLOCK";
}

function createCompletionItem(name: string, namespace: string, isText: boolean, hideNamespaceWhenEmpty: boolean): vscode.CompletionItem {
    const item = new vscode.CompletionItem(name, isText ? vscode.CompletionItemKind.Module : vscode.CompletionItemKind.EnumMember);
    const includeNamespace = namespace.length > 0 && !hideNamespaceWhenEmpty;

    if (includeNamespace) {
        if (isText) {
            item.insertText = `${name} (${namespace})>>\n\t`;
        } else {
            item.insertText = `${name} (${namespace}): `;
        }
    } else {
        if (isText) {
            item.insertText = `${name} >>\n\t`;
        } else {
            item.insertText = `${name}: `;
        }
    }

    item.detail = includeNamespace ? `${namespace}:${StringUtils.normalize(name)}` : StringUtils.normalize(name);
    return item;
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
