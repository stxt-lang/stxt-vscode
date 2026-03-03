import vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { Constants } from '../core/Constants';
import { calculateIndentLevel, getIndentationLength } from '../core/IndentUtils';
import { buscarSugerencias, buscarSugerenciasPrimerNivel } from './CompletionProviderSearch';

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


