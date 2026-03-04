"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtCompletionProvider = void 0;
const AnalysisDoc_1 = require("./AnalysisDoc");
const Constants_1 = require("../core/Constants");
const IndentUtils_1 = require("../core/IndentUtils");
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
        const completionContext = getCompletionContext(linePrefix);
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
            return (0, CompletionProviderSearch_1.buscarSugerenciasPorParent)(parent, completionContext.prefix);
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
    const level = (0, IndentUtils_1.calculateIndentLevel)(linePrefix);
    const indentationLength = (0, IndentUtils_1.getIndentationLength)(linePrefix);
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