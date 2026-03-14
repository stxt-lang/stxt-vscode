"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeRegistry = void 0;
const RuntimeException_1 = require("../exceptions/RuntimeException");
const INLINE_1 = require("./type/INLINE");
const BLOCK_1 = require("./type/BLOCK");
const TEXT_1 = require("./type/TEXT");
const BOOLEAN_1 = require("./type/BOOLEAN");
const URL_1 = require("./type/URL");
const INTEGER_1 = require("./type/INTEGER");
const NATURAL_1 = require("./type/NATURAL");
const NUMBER_1 = require("./type/NUMBER");
const DATE_1 = require("./type/DATE");
const TIMESTAMP_1 = require("./type/TIMESTAMP");
const EMAIL_1 = require("./type/EMAIL");
const HEXADECIMAL_1 = require("./type/HEXADECIMAL");
const BASE64_1 = require("./type/BASE64");
const GROUP_1 = require("./type/GROUP");
const ENUM_1 = require("./type/ENUM");
class TypeRegistry {
    static REGISTRY = new Map();
    // Inicialización estática (sin INSTANCE)
    static _init = (() => {
        // Tipos principales
        TypeRegistry.register(INLINE_1.INLINE);
        TypeRegistry.register(BLOCK_1.BLOCK);
        // Subtipos
        TypeRegistry.register(TEXT_1.TEXT);
        TypeRegistry.register(BOOLEAN_1.BOOLEAN);
        TypeRegistry.register(URL_1.URL);
        TypeRegistry.register(INTEGER_1.INTEGER);
        TypeRegistry.register(NATURAL_1.NATURAL);
        TypeRegistry.register(NUMBER_1.NUMBER);
        TypeRegistry.register(DATE_1.DATE);
        TypeRegistry.register(TIMESTAMP_1.TIMESTAMP);
        TypeRegistry.register(EMAIL_1.EMAIL);
        TypeRegistry.register(HEXADECIMAL_1.HEXADECIMAL);
        TypeRegistry.register(BASE64_1.BASE64);
        TypeRegistry.register(GROUP_1.GROUP);
        TypeRegistry.register(ENUM_1.ENUM);
        return true;
    })();
    static get(nodeType) {
        // fuerza que se ejecute _init al cargar la clase (por si el bundler hiciera cosas raras)
        void this._init;
        return this.REGISTRY.get(nodeType);
    }
    static register(instance) {
        const name = instance.getName();
        if (this.REGISTRY.has(name)) {
            throw new RuntimeException_1.RuntimeException("DUPLICATED_TYPE", `Type already defined: ${name}`);
        }
        this.REGISTRY.set(name, instance);
    }
}
exports.TypeRegistry = TypeRegistry;
//# sourceMappingURL=TypeRegistry.js.map