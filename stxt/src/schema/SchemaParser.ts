import { Schema } from "./Schema";
import { NodeDefinition } from "./NodeDefinition";
import { ChildDefinition } from "./ChildDefinition";
import { Node } from "../core/Node";
import { SchemaException } from "../exceptions/SchemaException";
import { ValidationException } from "../exceptions/ValidationException";
import { ParseException } from "../exceptions/ParseException";
import { STXTException } from "../exceptions/STXTException";
import { NameNamespaceParser } from "../core/NameNamespaceParser";

export class SchemaParser {
    static transformNodeToSchema(node: Node): Schema {
        // Node name
        const nodeName = node.getNormalizedName();
        const namespaceSchema = node.getNamespace();

        // Obtenemos name y namespace
        if (nodeName !== "schema" || namespaceSchema !== Schema.SCHEMA_NAMESPACE) {
            throw new SchemaException("NOT_STXT_SCHEMA", `Se espera schema(${Schema.SCHEMA_NAMESPACE}) y es ${nodeName}(${namespaceSchema})`);
        }

        const schema = new Schema(node.getValue(), node.getLine());

        // Para validar
        const allNames = new Set<string>(); // Para validar que existan los childs

        // Obtenemos los nodos
        for (const n of node.getChildrenByName("node")) {
            const schNode = this.createFrom(n, schema.getNamespace());
            schema.addNodeDefinition(schNode);
            allNames.add(schNode.getNormalizedName());
        }

        // Validamos que todos los nombres estén definidos
        for (const schNode of schema.getNodes().values()) {
            for (const schChild of schNode.getChildren().values()) {
                // Sólo validamos del mismo namespace
                if (schChild.getNamespace() === schema.getNamespace()) {
                    // Ojo: en Java aquí se usa schChild.getNormalizedName(), pero ChildDefinition no lo expone.
                    // Para mantener el comportamiento, se recomienda añadir getNormalizedName() a ChildDefinition.
                    const childNorm = (schChild as any).getNormalizedName?.() as string | undefined;

                    if (!childNorm) {
                        throw new Error("ChildDefinition.getNormalizedName() is missing in TypeScript version. Add it to ChildDefinition.");
                    }

                    if (!allNames.has(childNorm)) {
                        throw new ValidationException(0, "CHILD_NOT_DEFINED", `Child ${childNorm} not defined in ${schema.getNamespace()}`);
                    }
                }
            }
        }

        return schema;
    }

    private static createFrom(n: Node, namespace: string): NodeDefinition {
        const name = n.getValue();

        let type = "INLINE";
        const typeNode = n.getChild("type");
        if (typeNode) {
            type = typeNode.getValue();
        }

        const result = new NodeDefinition(name, type, n.getLine());

        const children = n.getChild("children");
        if (children) {
            for (const child of children.getChildrenByName("child")) {
                this.putChildToSchemaNode(result, child, namespace);
            }
        }

        // Miramos values
        let valuesNodes = n.getChildrenByName("values");
        if (valuesNodes && valuesNodes.length > 0) {
            if (type !== "ENUM") {
                throw new ParseException(n.getLine(), "VALUES_ONLY_SUPPORTED_BY_ENUM",`Values only supported for type ENUM, not for type ${type}`);
            }

            if (valuesNodes.length > 1) {
                throw new STXTException("INVALID_SIZE_VALUES", `Unexpected number of values: ${valuesNodes.length}`);
            }

            const valuesNode = valuesNodes[0];
            const values = valuesNode.getChildrenByName("value");
            for (const v of values) {
                result.addValue(v.getValue());
            }

            // Para la comprobación final de ENUM
            valuesNodes = values;
        }

        // Miramos enum
        if (type === "ENUM" && (!valuesNodes || valuesNodes.length === 0)) {
            throw new ParseException(n.getLine(), "VALUES_EMPTY_FOR_ENUM", "ENUM Type must include values");
        }

        return result;
    }

    private static putChildToSchemaNode(schemaNode: NodeDefinition, child: Node, defNamespace: string): void {
        // Obtenemos name y namespace
        const ns = NameNamespaceParser.parse(child.getValue(), defNamespace, child.getLine(), child.getValue());
        const name = ns.getName();
        const namespace = ns.getNamespace();

        const schemaChild = new ChildDefinition(name, namespace, this.getInteger(child, "min"), this.getInteger(child, "max"), child.getLine());
        schemaNode.addChildDefinition(schemaChild);
    }

    private static getInteger(node: Node, name: string): number | null {
        const n = node.getChild(name);
        if (!n) {
            return null;
        }

        const raw = n.getValue();
        const parsed = Number.parseInt(raw, 10);

        if (Number.isNaN(parsed)) {
            throw new ParseException(node.getLine(), "INVALID_INTEGER", `Integer not valid: ${raw}`);
        }

        return parsed;
    }
}
