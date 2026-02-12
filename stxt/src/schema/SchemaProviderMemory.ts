// SchemaProviderMemory.ts

import { StringUtils } from "../core/StringUtils";
import { Schema } from "./Schema";
import { SchemaProvider } from "./SchemaProvider";

export class SchemaProviderMemory implements SchemaProvider {
    private readonly schemas: Map<string, Schema> = new Map();

    getSchema(namespace: string): Schema | undefined {
        const key = StringUtils.lowerCase(namespace);
        return this.schemas.get(key);
    }

    addSchema(schema: Schema): void {
        const key = schema.getNamespace();
        this.schemas.set(key, schema);
    }

    hasSchema(namespace: string): boolean {
        const key = StringUtils.lowerCase(namespace);
        return this.schemas.has(key);
    }

    getAllNamespaces(): string[] {
        return Array.from(this.schemas.keys());
    }

    clear(): void {
        this.schemas.clear();
    }
}
