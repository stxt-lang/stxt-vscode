"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateIndentLevel = calculateIndentLevel;
exports.getIndentationLength = getIndentationLength;
const Constants_1 = require("./Constants");
/**
 * Calcula el nivel de indentación de una línea.
 * Retorna el nivel de indentación basado en tabs o espacios (4 espacios = 1 nivel).
 *
 * @param line La línea de texto a analizar
 * @returns El nivel de indentación (0 si es comentario o línea vacía)
 */
function calculateIndentLevel(line) {
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
/**
 * Calcula la longitud de la indentación (número de caracteres de espacios/tabs).
 *
 * @param line La línea de texto a analizar
 * @returns El número de caracteres de indentación
 */
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
//# sourceMappingURL=LineUtils.js.map