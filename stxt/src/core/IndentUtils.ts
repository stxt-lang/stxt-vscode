import { Constants } from "./Constants";

/**
 * Calcula el nivel de indentación de una línea.
 * Retorna el nivel de indentación basado en tabs o espacios (4 espacios = 1 nivel).
 * 
 * @param line La línea de texto a analizar
 * @returns El nivel de indentación (0 si es comentario o línea vacía)
 */
export function calculateIndentLevel(line: string): number {
    let level = 0;
    let spaces = 0;
    let pointer = 0;

    while (pointer < line.length) {
        const c = line.charAt(pointer);

        if (c === Constants.SPACE) {
            spaces++;
            if (spaces === Constants.TAB_SPACES) {
                level++;
                spaces = 0;
            }
        } else if (c === Constants.TAB) {
            level++;
            spaces = 0;
        } else if (c === Constants.COMMENT_CHAR) {
            return 0;
        } else {
            // Primer carácter no espacio/tab/comentario => fin de indentación
            break;
        }

        pointer++;
    }
    return level;
}

/**
 * Calcula la longitud de la indentación (número de caracteres de espacios/tabs).
 * 
 * @param line La línea de texto a analizar
 * @returns El número de caracteres de indentación
 */
export function getIndentationLength(line: string): number {
    let pointer = 0;
    while (pointer < line.length) {
        const c = line.charAt(pointer);
        if (c !== Constants.SPACE && c !== Constants.TAB) {
            break;
        }
        pointer++;
    }
    return pointer;
}
