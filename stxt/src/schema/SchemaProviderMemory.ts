// SchemaProviderMemory.ts

import { StringUtils } from "../core/StringUtils";
import { Schema } from "./Schema";
import { SchemaProvider } from "./SchemaProvider";

export class SchemaProviderMemory implements SchemaProvider {
    private readonly parentSchema: SchemaProvider;

    constructor(parent: SchemaProvider) {
        this.parentSchema = parent;
    }

    private readonly schemas: Map<string, Schema> = new Map();

    getSchema(namespace: string): Schema | undefined | null {
        const key = StringUtils.lowerCase(namespace);

        let result: Schema | undefined | null = this.schemas.get(key);
        if (!result) {
            result = this.parentSchema.getSchema(namespace);
        }
        return result;
    }

    addSchema(schema: Schema): void {
        const key = schema.getNamespace();
        this.schemas.set(key, schema);
    }

    clear(): void {
        this.schemas.clear();
    }
}
