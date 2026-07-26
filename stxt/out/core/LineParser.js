"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLine = parseLine;
const Constants_1 = require("./Constants");
const StringUtils_1 = require("./StringUtils");
const ParseException_1 = require("../exceptions/ParseException");
const Line_1 = require("./Line");
function parseLine(line, lastNodeBlock, lastLevel, numLine, validate = true) {
    let level = 0;
    let spaces = 0;
    let pointer = 0;
    let sawSpace = false;
    let sawTab = false;
    while (pointer < line.length) {
        const c = line.charAt(pointer);
        if (c === Constants_1.Constants.SPACE) {
            sawSpace = true;
            spaces++;
            if (spaces === Constants_1.Constants.TAB_SPACES) {
                level++;
                spaces = 0;
            }
        }
        else if (c === Constants_1.Constants.TAB) {
            sawTab = true;
            level++;
            spaces = 0;
        }
        else if (c === Constants_1.Constants.COMMENT_CHAR) {
            return new Line_1.Line(level, line.substring(pointer + 1), true, false, pointer);
        }
        else {
            // Primer carácter no espacio/tab/comentario => fin de indentación
            break;
        }
        // Dentro del bloque de texto
        if (lastNodeBlock && level > lastLevel) {
            const text = StringUtils_1.StringUtils.rightTrim(line.substring(pointer + 1));
            // El prefijo que cubre el nivel de bloque debe ser homogéneo (spec 10.2, regla 2);
            // las líneas vacías se preservan siempre y quedan exentas (spec 10.3)
            if (validate && sawSpace && sawTab && text.length > 0) {
                throw new ParseException_1.ParseException(numLine, "MIXED_INDENTATION", `Mixed tabs and spaces in indentation`);
            }
            return new Line_1.Line(level, text, false, true, pointer);
        }
        // Aumentamos pointer
        pointer++;
    }
    // En este punto ya estamos fuera de bloque de texto (si existía)
    // Empty
    if (pointer === line.length) {
        if (lastNodeBlock) {
            return new Line_1.Line(level, "", false, true, pointer);
        }
        return new Line_1.Line(level, "", false, false, pointer);
    }
    // Mezcla de espacios y tabuladores en la indentación (spec 8.1 y 8.3)
    if (validate && sawSpace && sawTab) {
        throw new ParseException_1.ParseException(numLine, "MIXED_INDENTATION", `Mixed tabs and spaces in indentation`);
    }
    // Indentación no es múltiplo de 4 con espacios
    if (validate && spaces > 0) {
        throw new ParseException_1.ParseException(numLine, "INVALID_NUMBER_SPACES", `There are ${spaces} spaces before node`);
    }
    // Validamos level
    if (validate && level > lastLevel + 1) {
        throw new ParseException_1.ParseException(numLine, "INDENTATION_LEVEL_NOT_VALID", `Level of indent incorrect: ${level}`);
    }
    // Caso general: devolver la línea sin la indentación consumida
    return new Line_1.Line(level, line.substring(pointer).trim(), false, false, pointer);
}
//# sourceMappingURL=LineParser.js.map