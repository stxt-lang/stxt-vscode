// MetaTemplateSchemaProvider.ts

import { Parser } from "../core/Parser";
import { Node } from "../core/Node";

import { Schema } from "../schema/Schema";
import { SchemaProvider } from "../schema/SchemaProvider";

import { ResourceNotFoundException } from "../exceptions/ResourceNotFoundException";
import { SchemaException } from "../exceptions/SchemaException";

import { TemplateParser } from "./TemplateParser";

export class MetaTemplateSchemaProvider implements SchemaProvider {
  private static readonly META_TEXT = `Template (@stxt.template): @stxt.template
\tStructure >>
\t\tTemplate (@stxt.template):
\t\t\tStructure: (1) BLOCK
`;

  private readonly meta: Schema;

  constructor() {
    const parser = new Parser();
    const nodes: Node[] = parser.parse(MetaTemplateSchemaProvider.META_TEXT);

    if (nodes.length !== 1) {
      throw new SchemaException(
        "META_SCHEMA_INVALID",
        `Meta schema must produce exactly 1 document, got ${nodes.length}`
      );
    }

    this.meta = TemplateParser.transformNodeToSchema(nodes[0]);
  }

  getSchema(namespace: string): Schema {
    if (namespace !== "@stxt.template") {
      throw new ResourceNotFoundException("@stxt.template", namespace);
    }

    // meta siempre existe si el constructor terminó, pero lo dejamos equivalente al Java
    if (!this.meta) {
      throw new SchemaException("META_SCHEMA_NOT_AVAILABLE", "Meta schema not available");
    }

    return this.meta;
  }
}