"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtCompletionProvider = void 0;
const vscode_1 = __importDefault(require("vscode"));
const AnalysisDoc_1 = require("./AnalysisDoc");
const Constants_1 = require("../core/Constants");
const SchemaLoader_1 = require("./SchemaLoader");
const StringUtils_1 = require("../core/StringUtils");
const IndentUtils_1 = require("../core/IndentUtils");
let schemaLoader = new SchemaLoader_1.SchemaLoaderExtension();
class StxtCompletionProvider {
    provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        console.log(`Position: ${position.line}`);
        // Si no hay análisis no mostramos nada
        let lastAnalisis = (0, AnalysisDoc_1.getLastAnalysis)(document);
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
            if (nodeAtLine?.getLevel() === level - 1) {
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
exports.StxtCompletionProvider = StxtCompletionProvider;
function getCompletionContext(linePrefix) {
    const trimmed = linePrefix.trimStart();
    if (trimmed.startsWith(Constants_1.Constants.COMMENT_CHAR)) {
        return null;
    }
    // Si estamos ya en el valor/texto, no sugerimos nodos.
    if (trimmed.includes(Constants_1.Constants.SEP_NODE) || trimmed.includes('>>')) {
        return null;
    }
    const level = (0, IndentUtils_1.calculateIndentLevel)(linePrefix);
    const indentationLength = (0, IndentUtils_1.getIndentationLength)(linePrefix);
    const rawNodePrefix = linePrefix.slice(indentationLength);
    // Permitimos texto para filtrar por prefijo de nombre.
    const prefix = rawNodePrefix.replace(/\s*\(.*$/, '').trimEnd();
    return { level, prefix };
}
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
        const item = new vscode_1.default.CompletionItem(childDef.getName(), isText ? vscode_1.default.CompletionItemKind.Module : vscode_1.default.CompletionItemKind.EnumMember);
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
    const item = new vscode_1.default.CompletionItem(name, isText ? vscode_1.default.CompletionItemKind.Module : vscode_1.default.CompletionItemKind.EnumMember);
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
//# sourceMappingURL=CompletionProvider.js.map