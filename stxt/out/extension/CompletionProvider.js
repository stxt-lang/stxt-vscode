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
/*
const STXT_KEYS = [
    'author',
    'status',
    'version',
    'demo'
];
*/
let schemaLoader = new SchemaLoader_1.SchemaLoaderExtension();
class StxtCompletionProvider {
    provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        console.log(`Position: ${position.line}`);
        // TODO Si es la primera línea no mostramos nada. Debemos enseñar todos los de primer nivel
        if (position.line === 0) {
            return [];
        }
        // Si no hay análisis no mostramos nada
        let lastAnalisis = (0, AnalysisDoc_1.getLastAnalysis)(document);
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
            if (nodeAtLine?.getLevel() === level - 1) {
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
exports.StxtCompletionProvider = StxtCompletionProvider;
// TODO Hacer mejor para mostrar el prefix también y así poder enseñar los que empiezan
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
function buscarSugerencias(parent) {
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
    for (let [childName, childDef] of children.entries()) {
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