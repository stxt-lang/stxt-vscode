"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformNodeToSchema = transformNodeToSchema;
const Schema_1 = require("./Schema");
const NodeDefinition_1 = require("./NodeDefinition");
const ChildDefinition_1 = require("./ChildDefinition");
const ValidationException_1 = require("../exceptions/ValidationException");
const RuntimeException_1 = require("../exceptions/RuntimeException");
const NameNamespaceParser_1 = require("../core/NameNamespaceParser");
function transformNodeToSchema(node) {
    // Node name
    const nodeName = node.getNormalizedName();
    const namespaceSchema = node.getNamespace();
    // Obtenemos name y namespace
    if (nodeName !== "schema" || namespaceSchema !== Schema_1.Schema.SCHEMA_NAMESPACE) {
        throw new ValidationException_1.ValidationException(node.getLine(), "NOT_STXT_SCHEMA", `Se espera schema(${Schema_1.Schema.SCHEMA_NAMESPACE}) y es ${nodeName}(${namespaceSchema})`);
    }
    // Obtenemos description
    const descrip = node.getChild("description")?.getText();
    const schema = new Schema_1.Schema(node.getValue(), node.getLine(), descrip);
    // Para validar
    const allNames = new Set(); // Para validar que existan los childs
    // Obtenemos los nodos
    for (const n of node.getChildrenByName("node")) {
        const schNode = createFrom(n, schema.getNamespace());
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
                const childNorm = schChild.getNormalizedName?.();
                if (!childNorm) {
                    throw new RuntimeException_1.RuntimeException("CHILD_DEFINITION_API_MISMATCH", "ChildDefinition.getNormalizedName() is missing in TypeScript version. Add it to ChildDefinition.");
                }
                if (!allNames.has(childNorm)) {
                    throw new ValidationException_1.ValidationException(0, "CHILD_NOT_DEFINED", `Child ${childNorm} not defined in ${schema.getNamespace()}`);
                }
            }
        }
    }
    return schema;
}
function createFrom(n, namespace) {
    const name = n.getValue();
    let type = "INLINE";
    const typeNode = n.getChild("type");
    if (typeNode) {
        type = typeNode.getValue();
    }
    const description = n.getChild("description")?.getText();
    const result = new NodeDefinition_1.NodeDefinition(name, type, n.getLine(), description);
    const children = n.getChild("children");
    if (children) {
        for (const child of children.getChildrenByName("child")) {
            putChildToSchemaNode(result, child, namespace);
        }
    }
    // Miramos values
    let valuesNodes = n.getChildrenByName("values");
    if (valuesNodes && valuesNodes.length > 0) {
        if (type !== "ENUM") {
            throw new ValidationException_1.ValidationException(n.getLine(), "VALUES_ONLY_SUPPORTED_BY_ENUM", `Values only supported for type ENUM, not for type ${type}`);
        }
        if (valuesNodes.length > 1) {
            throw new RuntimeException_1.RuntimeException("INVALID_SIZE_VALUES", `Unexpected number of values: ${valuesNodes.length}`);
        }
        const valuesNode = valuesNodes[0];
        const values = valuesNode.getChildrenByName("value");
        for (const v of values) {
            result.addValue(v.getValue(), v.getLine());
        }
        // Para la comprobación final de ENUM
        valuesNodes = values;
    }
    // Miramos enum
    if (type === "ENUM" && (!valuesNodes || valuesNodes.length === 0)) {
        throw new ValidationException_1.ValidationException(n.getLine(), "VALUES_EMPTY_FOR_ENUM", "ENUM Type must include values");
    }
    return result;
}
function putChildToSchemaNode(schemaNode, child, defNamespace) {
    // Obtenemos name y namespace
    const ns = NameNamespaceParser_1.NameNamespaceParser.parse(child.getValue(), defNamespace, child.getLine(), child.getValue());
    const name = ns.getName();
    const namespace = ns.getNamespace();
    const schemaChild = new ChildDefinition_1.ChildDefinition(name, namespace, getInteger(child, "min"), getInteger(child, "max"), child.getLine());
    schemaNode.addChildDefinition(schemaChild);
}
function getInteger(node, name) {
    const n = node.getChild(name);
    if (!n) {
        return null;
    }
    const raw = n.getValue();
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
        throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_INTEGER", `Integer not valid: ${raw}`);
    }
    return parsed;
}
//# sourceMappingURL=SchemaParser.js.map