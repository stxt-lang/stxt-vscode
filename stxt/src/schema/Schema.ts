import { NamespaceValidator } from "../core/NamespaceValidator";
import { StringUtils } from "../core/StringUtils";
import { SchemaException } from "../exceptions/SchemaException";
import { NodeDefinition } from "./NodeDefinition";

export class Schema {
    static readonly SCHEMA_NAMESPACE = "@stxt.schema";

    private readonly nodes: Map<string, NodeDefinition> = new Map();
    private readonly namespace: string;

    constructor(namespace: string | null | undefined, line: number) {
        this.namespace = StringUtils.lowerCase(namespace);
        NamespaceValidator.validateNamespaceFormat(this.namespace, line);
    }

    getNodes(): ReadonlyMap<string, NodeDefinition> {
        return this.nodes;
    }

    getNodeDefinition(name: string): NodeDefinition | undefined {
        return this.nodes.get(StringUtils.normalize(name));
    }

    addNodeDefinition(nodeDefinition: NodeDefinition): void {
        const qname = nodeDefinition.getNormalizedName();

        if (this.nodes.has(qname)) {
            throw new SchemaException("NODE_DEF_ALREADY_DEFINED", `Exists a previous node definition with: ${qname}`);
        }

        this.nodes.set(qname, nodeDefinition);
    }

    getNamespace(): string {
        return this.namespace;
    }
}
