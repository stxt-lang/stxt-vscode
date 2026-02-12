import { STXTException } from "./STXTException";

export class ResourceNotFoundException extends STXTException {
    private readonly namespaceValue: string;
    private readonly resource: string;

    constructor(namespace: string, resource: string) {
        super("RESOURCE_NOT_FOUND", `Not found '${resource}' in namespace: ${namespace}`);

        this.name = "ResourceNotFoundException";
        this.namespaceValue = namespace;
        this.resource = resource;

        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }

    getNamespace(): string {
        return this.namespaceValue;
    }

    getResource(): string {
        return this.resource;
    }
}
