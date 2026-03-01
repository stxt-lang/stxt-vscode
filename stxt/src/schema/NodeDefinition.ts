// NodeDefinition.ts

import { ParseException } from "../exceptions/ParseException";
import { StringUtils } from "../core/StringUtils";
import { ChildDefinition } from "./ChildDefinition";

export class NodeDefinition {
    private readonly name: string;
    private readonly normalizedName: string;
    private readonly type: string;
    private readonly description: string | undefined;

    private readonly children: Map<string, ChildDefinition> = new Map();
    private readonly values: Set<string> = new Set();

    constructor(name: string, type: string, line: number, description: string | undefined) {
        this.name = StringUtils.compactSpaces(name);
        this.normalizedName = StringUtils.normalize(name);
        this.type = type;
        this.description = description;

        if (this.normalizedName.length === 0) {
            throw new ParseException(line, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
        }
    }

    getName(): string {
        return this.name;
    }

    getNormalizedName(): string {
        return this.normalizedName;
    }

    getType(): string {
        return this.type;
    }

    getChildren(): ReadonlyMap<string, ChildDefinition> {
        return this.children;
    }

    getDescription(): string | undefined {
        return this.description;
    }

    addChildDefinition(childDefinition: ChildDefinition): void {
        const qname = childDefinition.getQualifiedName();
        if (this.children.has(qname)) {
            throw new ParseException(0, "CHILD_DEF_ALREADY_DEFINED", `Exists a previous node definition with: ${qname}`);
        }
        this.children.set(qname, childDefinition);
    }

    addValue(value: string): void {
        this.values.add(value);
    }

    isAllowedValue(value: string): boolean {
        if (this.values.size === 0) {
            return true;
        }
        return this.values.has(value);
    }

    getValues(): ReadonlySet<string> {
        return this.values;
    }

    toJSON() {
        return {
            name: this.getName(),
            normalizedName: this.getNormalizedName(),
            type: this.getType(),
            description: this.description,
            children: Array.from(this.getChildren().values()).map(c => c.toJSON()),
            values: Array.from(this.getValues()),
        };
    }

}
