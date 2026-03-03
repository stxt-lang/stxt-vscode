"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenTypeIndex = exports.tokenLegend = void 0;
const vscode_1 = require("vscode");
const STXT_TOKEN_TYPES = [
    'comment',
    'namespace',
    'property',
    'macro',
    'string'
];
// Legend derivado del mismo sitio
exports.tokenLegend = new vscode_1.SemanticTokensLegend([...STXT_TOKEN_TYPES]);
// Mapping type -> index derivado del mismo sitio
exports.tokenTypeIndex = Object.fromEntries(STXT_TOKEN_TYPES.map((t, i) => [t, i]));
//# sourceMappingURL=Tokens.js.map