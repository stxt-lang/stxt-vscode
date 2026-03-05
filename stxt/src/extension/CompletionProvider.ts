import { getLastAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { Constants } from '../core/Constants';
import { calculateIndentLevel, getIndentationLength } from '../core/LineUtils';
import { buscarSugerenciasPorParent, buscarSugerenciasPrimerNivel, buscarValoresEnum } from './CompletionProviderSearch';
import { CompletionItem, CompletionItemProvider, Position, ProviderResult, TextDocument } from 'vscode';

export class StxtCompletionProvider implements CompletionItemProvider {

    provideCompletionItems(document: TextDocument, position: Position): ProviderResult<CompletionItem[]> {

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

        // Si estamos completando el valor de un nodo
        if (completionContext.isValue) {
            const nodeAtLine = lastAnalisis.nodeByLine.get(position.line);
            if (nodeAtLine) {
                return buscarValoresEnum(nodeAtLine, completionContext.prefix);
            }
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
            return buscarSugerenciasPorParent(parent, completionContext.prefix);
        }

        return [];
    }
}

function getCompletionContext(linePrefix: string): { level: number, prefix: string, isValue: boolean } | null {
    const trimmed = linePrefix.trimStart();
    if (trimmed.startsWith(Constants.COMMENT_CHAR)) {
        return null;
    }

    const level = calculateIndentLevel(linePrefix);
    const indentationLength = getIndentationLength(linePrefix);

    // Detectar si estamos completando un valor (después de ':' o '>>')
    const sepIndex = trimmed.indexOf(Constants.SEP_NODE);
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


