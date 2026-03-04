import { Node } from '../core/Node';
import { StringUtils } from '../core/StringUtils';
import { getSchemas, SchemaLoaderExtension } from './SchemaLoader';
import { Schema } from '../schema/Schema';
import { NodeDefinition } from '../schema/NodeDefinition';
import { ChildDefinition } from '../schema/ChildDefinition';
import { CompletionItem, CompletionItemKind } from 'vscode';

let schemaLoader: SchemaLoaderExtension = new SchemaLoaderExtension();

export function buscarSugerenciasPorParent(parent: Node, prefix: string): CompletionItem[] {
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
    const result: CompletionItem[] = [];
    const normalizedPrefix = StringUtils.normalize(prefix);

    for (let [childName, childDef] of children.entries()) {
        if (normalizedPrefix.length > 0 && !StringUtils.normalize(childDef.getName()).startsWith(normalizedPrefix)) {
            continue;
        }
        const isText: boolean = isBlockText(childDef);
        const item = new CompletionItem(childDef.getName(), isText ? CompletionItemKind.Module: CompletionItemKind.EnumMember);
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

        const actualChildren: Node[] = parent.getChildrenByName(childDef.getName());
        const maxChilds = childDef.getMax() ?? -1;
        if (maxChilds < 0 || actualChildren.length < maxChilds) {
            result.push(item);
        }        
    }

    return result;
}

export function buscarSugerenciasPrimerNivel(prefix: string): CompletionItem[] {
    const result: CompletionItem[] = [];
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

function createCompletionItem(name: string, namespace: string, isText: boolean, hideNamespaceWhenEmpty: boolean): CompletionItem {
    const item = new CompletionItem(name, isText ? CompletionItemKind.Module : CompletionItemKind.EnumMember);
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

function isBlockTextNode(nodeDef: NodeDefinition): boolean {
    const type = nodeDef.getType();
    return type === "TEXT" || type === "BLOCK";
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
         
         return isBlockTextNode(nodeDef);
    } catch (e) {
        return false;
    }
}

export function buscarValoresEnum(node: Node, prefix: string): CompletionItem[] {
    console.log(`Buscando valores ENUM para nodo: ${node.getQualifiedName()}`);
    
    const schema = schemaLoader.getSchema(node.getNamespace());
    if (!schema) {
        return [];
    }

    const nodeDef = schema.getNodeDefinition(node.getName());
    if (!nodeDef) {
        return [];
    }

    // Solo ofrecer valores si el tipo es ENUM
    if (nodeDef.getType() !== 'ENUM') {
        return [];
    }

    const values = nodeDef.getValues();
    const result: CompletionItem[] = [];
    const normalizedPrefix = StringUtils.normalize(prefix);

    for (const value of values) {
        // Filtrar los valores que comienzan con el prefijo
        if (normalizedPrefix.length > 0 && !StringUtils.normalize(value).startsWith(normalizedPrefix)) {
            continue;
        }

        const item = new CompletionItem(value, CompletionItemKind.EnumMember);
        item.insertText = value;
        item.detail = `ENUM value for ${node.getName()}`;
        result.push(item);
    }

    return result;
}
