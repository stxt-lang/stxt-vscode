"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarSugerencias = buscarSugerencias;
exports.buscarSugerenciasPrimerNivel = buscarSugerenciasPrimerNivel;
const StringUtils_1 = require("../core/StringUtils");
const SchemaLoader_1 = require("./SchemaLoader");
const vscode_1 = require("vscode");
let schemaLoader = new SchemaLoader_1.SchemaLoaderExtension();
function buscarSugerencias(parent, prefix) {
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
    const result = [];
    const normalizedPrefix = StringUtils_1.StringUtils.normalize(prefix);
    for (let [childName, childDef] of children.entries()) {
        if (normalizedPrefix.length > 0 && !StringUtils_1.StringUtils.normalize(childDef.getName()).startsWith(normalizedPrefix)) {
            continue;
        }
        const isText = isBlockText(childDef);
        const item = new vscode_1.CompletionItem(childDef.getName(), isText ? vscode_1.CompletionItemKind.Module : vscode_1.CompletionItemKind.EnumMember);
        if (childDef.getNamespace() === parent.getNamespace()) {
            if (isText) {
                item.insertText = `${childDef.getName()} >>\n\t`;
            }
            else {
                item.insertText = `${childDef.getName()}: `;
            }
        }
        else {
            if (isText) {
                item.insertText = `${childDef.getName()} (${childDef.getNamespace()})>>\n\t`;
            }
            else {
                item.insertText = `${childDef.getName()} (${childDef.getNamespace()}): `;
            }
        }
        item.detail = childName;
        result.push(item);
    }
    return result;
}
function buscarSugerenciasPrimerNivel(prefix) {
    const result = [];
    const seen = new Set();
    const normalizedPrefix = StringUtils_1.StringUtils.normalize(prefix);
    for (const schema of (0, SchemaLoader_1.getSchemas)()) {
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
function getRootNodeDefinitions(schema) {
    const referencedLocalChildren = new Set();
    for (const nodeDef of schema.getNodes().values()) {
        for (const childDef of nodeDef.getChildren().values()) {
            if (childDef.getNamespace() === schema.getNamespace()) {
                referencedLocalChildren.add(childDef.getNormalizedName());
            }
        }
    }
    const roots = [];
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
function isBlockTextNode(nodeDef) {
    const type = nodeDef.getType();
    return type === "TEXT" || type === "BLOCK";
}
function createCompletionItem(name, namespace, isText, hideNamespaceWhenEmpty) {
    const item = new vscode_1.CompletionItem(name, isText ? vscode_1.CompletionItemKind.Module : vscode_1.CompletionItemKind.EnumMember);
    const includeNamespace = namespace.length > 0 && !hideNamespaceWhenEmpty;
    if (includeNamespace) {
        if (isText) {
            item.insertText = `${name} (${namespace})>>\n\t`;
        }
        else {
            item.insertText = `${name} (${namespace}): `;
        }
    }
    else {
        if (isText) {
            item.insertText = `${name} >>\n\t`;
        }
        else {
            item.insertText = `${name}: `;
        }
    }
    item.detail = includeNamespace ? `${namespace}:${StringUtils_1.StringUtils.normalize(name)}` : StringUtils_1.StringUtils.normalize(name);
    return item;
}
function isBlockText(childDef) {
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
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=CompletionProviderSearch.js.map