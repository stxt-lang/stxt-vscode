"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLine = parseLine;
const Constants_1 = require("./Constants");
const StringUtils_1 = require("./StringUtils");
const ParseException_1 = require("../exceptions/ParseException");
const Line_1 = require("./Line");
function parseLine(line, lastNodeBlock, lastLevel, numLine) {
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
            return new Line_1.Line(level, line.substring(pointer + 1), true, false);
        }
        else {
            // Primer carácter no espacio/tab/comentario => fin de indentación
            break;
        }
        // Dentro del bloque de texto
        if (lastNodeBlock && level > lastLevel) {
            return new Line_1.Line(level, StringUtils_1.StringUtils.rightTrim(line.substring(pointer + 1)), false, true);
        }
        // Aumentamos pointer
        pointer++;
    }
    // En este punto ya estamos fuera de bloque de texto (si existía)
    // Empty
    if (pointer === line.length) {
        if (lastNodeBlock) {
            return new Line_1.Line(level, "", false, true);
        }
        return new Line_1.Line(level, "", false, false);
    }
    // Indentación no es múltiplo de 4 con espacios
    if (spaces > 0) {
        throw new ParseException_1.ParseException(numLine, "INVALID_NUMBER_SPACES", `There are ${spaces} spaces before node`);
    }
    // Validamos level
    if (level > lastLevel + 1) {
        throw new ParseException_1.ParseException(numLine, "INDENTATION_LEVEL_NOT_VALID", `Level of indent incorrect: ${level}`);
    }
    // Caso general: devolver la línea sin la indentación consumida
    return new Line_1.Line(level, line.substring(pointer).trim(), false, false);
}
//# sourceMappingURL=LineParser.js.map