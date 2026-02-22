"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const AnalysisDoc_1 = require("./AnalysisDoc");
const Constants_1 = require("../core/Constants");
const SchemaLoader_1 = require("./SchemaLoader");
const StringUtils_1 = require("../core/StringUtils");
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
function getLevel(line) {
    let level = 0;
    let spaces = 0;
    let pointer = 0;
    while (pointer < line.length) {
        const c = line.charAt(pointer);
        if (c === Constants_1.Constants.SPACE) {
            spaces++;
            if (spaces === Constants_1.Constants.TAB_SPACES) {
                level++;
                spaces = 0;
            }
        }
        else if (c === Constants_1.Constants.TAB) {
            level++;
            spaces = 0;
        }
        else if (c === Constants_1.Constants.COMMENT_CHAR) {
            return 0;
        }
        else {
            // Primer carácter no espacio/tab/comentario => fin de indentación
            break;
        }
        pointer++;
    }
    return level;
}
function getCompletionContext(linePrefix) {
    const trimmed = linePrefix.trimStart();
    if (trimmed.startsWith(Constants_1.Constants.COMMENT_CHAR)) {
        return null;
    }
    // Si estamos ya en el valor/texto, no sugerimos nodos.
    if (trimmed.includes(Constants_1.Constants.SEP_NODE) || trimmed.includes('>>')) {
        return null;
    }
    const level = getLevel(linePrefix);
    const indentationLength = getIndentationLength(linePrefix);
    const rawNodePrefix = linePrefix.slice(indentationLength);
    // Permitimos texto para filtrar por prefijo de nombre.
    const prefix = rawNodePrefix.replace(/\s*\(.*$/, '').trimEnd();
    return { level, prefix };
}
function getIndentationLength(line) {
    let pointer = 0;
    while (pointer < line.length) {
        const c = line.charAt(pointer);
        if (c !== Constants_1.Constants.SPACE && c !== Constants_1.Constants.TAB) {
            break;
        }
        pointer++;
    }
    return pointer;
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
        const item = new vscode.CompletionItem(childDef.getName(), isText ? vscode.CompletionItemKind.Module : vscode.CompletionItemKind.EnumMember);
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
    const item = new vscode.CompletionItem(name, isText ? vscode.CompletionItemKind.Module : vscode.CompletionItemKind.EnumMember);
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