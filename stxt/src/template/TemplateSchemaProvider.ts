// TemplateSchemaProvider.ts

import { Parser } from "../core/Parser";
import { Node } from "../core/Node";

import { SchemaValidator } from "../schema/SchemaValidator";

import { SchemaException } from "../exceptions/SchemaException";

import { MetaTemplateSchemaProvider } from "./MetaTemplateSchemaProvider";
import { TemplateParser } from "./TemplateParser";
import { SchemaProviderMemory } from "../schema/SchemaProviderMemory";

export class TemplateSchemaProvider extends SchemaProviderMemory {

    addSchemaFromTemplate(template: string): void {
        // Creamos parser
        const parser = new Parser();

        const nodes: Node[] = parser.parse(template);
        if (nodes.length !== 1) {
            throw new SchemaException("INVALID_SCHEMA",`There are ${nodes.length}, and expected is 1`);
        }
        // Validamos
        const schemaValidator = new SchemaValidator(new MetaTemplateSchemaProvider(), true);
        schemaValidator.validate(nodes[0]);

        // Obtenemos schema
        const sch = TemplateParser.transformNodeToSchema(nodes[0]);
        this.addSchema(sch);
    }
}