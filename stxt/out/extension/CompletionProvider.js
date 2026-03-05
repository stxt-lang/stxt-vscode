"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtCompletionProvider = void 0;
const AnalysisDoc_1 = require("./AnalysisDoc");
const Constants_1 = require("../core/Constants");
const LineParser_1 = require("../core/LineParser");
const CompletionProviderSearch_1 = require("./CompletionProviderSearch");
class StxtCompletionProvider {
    provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        console.log(`Position: ${position.line}`);
        // Si no hay análisis no mostramos nada
        let lastAnalisis = (0, AnalysisDoc_1.getLastAnalysis)(document);
        if (!lastAnalisis) {
            return [];
        }
        // Buscar el nodo anterior para obtener lastLevel y lastNodeBlock
        let lastNode = null;
        let searchLine = position.line;
        while (searchLine > 0) {
            searchLine = searchLine - 1;
            const nodeAtLine = lastAnalisis.nodeByLine.get(searchLine);
            if (nodeAtLine) {
                lastNode = nodeAtLine;
                break;
            }
        }
        const lastLevel = lastNode ? lastNode.getLevel() : 0;
        const lastNodeBlock = lastNode ? lastNode.isTextNode() : false;
        const completionContext = getCompletionContext(linePrefix, lastNodeBlock, lastLevel);
        if (!completionContext) {
            return [];
        }
        // Si estamos completando el valor de un nodo
        if (completionContext.isValue) {
            const nodeAtLine = lastAnalisis.nodeByLine.get(position.line);
            if (nodeAtLine) {
                return (0, CompletionProviderSearch_1.buscarValoresEnum)(nodeAtLine, completionContext.prefix);
            }
            return [];
        }
        // Buscamos nivel del cursor
        let level = completionContext.level;
        console.log("Level: " + level);
        if (level === 0) {
            return (0, CompletionProviderSearch_1.buscarSugerenciasPrimerNivel)(completionContext.prefix);
        }
        // Buscamos parent
        let parent = null;
        let parentLine = position.line;
        while (parentLine > 0) {
            parentLine = parentLine - 1;
            const nodeAtLine = lastAnalisis.nodeByLine.get(parentLine);
            if (nodeAtLine?.getLevel() === level - 1) {
                parent = nodeAtLine;
                break;
            }
        }
        if (parent) {
            console.log(`Parent *****: ${parent.getQualifiedName()} (${parent.getLine()})`);
            return (0, CompletionProviderSearch_1.buscarSugerenciasPorParent)(parent, completionContext.prefix);
        }
        return [];
    }
}
exports.StxtCompletionProvider = StxtCompletionProvider;
function getCompletionContext(linePrefix, lastNodeBlock, lastLevel) {
    const trimmed = linePrefix.trimStart();
    if (trimmed.startsWith(Constants_1.Constants.COMMENT_CHAR)) {
        return null;
    }
    const line = (0, LineParser_1.parseLine)(linePrefix, lastNodeBlock, lastLevel, 0, false);
    const level = line.level;
    const indentationLength = line.indentLength;
    // Detectar si estamos completando un valor (después de ':' o '>>')
    const sepIndex = trimmed.indexOf(Constants_1.Constants.SEP_NODE);
    const textSepIndex = trimmed.indexOf('>>');
    if (sepIndex !== -1) {
        // Estamos después de ':', completando un valor inline
        const valuePrefix = trimmed.substring(sepIndex + 1).trimStart();
        return { level, prefix: valuePrefix, isValue: true };
    }
    if (textSepIndex !== -1) {
        // Estamos después de '>>', esto es para nodos de texto, no ofrecemos completado
        return null;
    }
    // Estamos completando un nombre de nodo
    const rawNodePrefix = linePrefix.slice(indentationLength);
    const prefix = rawNodePrefix.replace(/\s*\(.*$/, '').trimEnd();
    return { level, prefix, isValue: false };
}
//# sourceMappingURL=CompletionProvider.js.map