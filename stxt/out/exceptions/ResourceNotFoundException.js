"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceNotFoundException = void 0;
const RuntimeException_1 = require("./RuntimeException");
class ResourceNotFoundException extends RuntimeException_1.RuntimeException {
    namespaceValue;
    resource;
    constructor(namespace, resource) {
        super("RESOURCE_NOT_FOUND", `Not found '${resource}' in namespace: ${namespace}`);
        this.name = "ResourceNotFoundException";
        this.namespaceValue = namespace;
        this.resource = resource;
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }
    getNamespace() {
        return this.namespaceValue;
    }
    getResource() {
        return this.resource;
    }
}
exports.ResourceNotFoundException = ResourceNotFoundException;
//# sourceMappingURL=ResourceNotFoundException.js.map