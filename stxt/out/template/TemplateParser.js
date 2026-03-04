"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformTemplateNodeToSchema = transformTemplateNodeToSchema;
const Parser_1 = require("../core/Parser");
const ValidationException_1 = require("../exceptions/ValidationException");
const ChildDefinition_1 = require("../schema/ChildDefinition");
const NodeDefinition_1 = require("../schema/NodeDefinition");
const Schema_1 = require("../schema/Schema");
const StringUtils_1 = require("../core/StringUtils");
const ChildLineParser_1 = require("./ChildLineParser");
const ParseException_1 = require("../exceptions/ParseException");
function transformTemplateNodeToSchema(node) {
    // Insertamos namespace
    const result = new Schema_1.Schema(node.getValue(), node.getLine(), undefined);
    // Buscamos nodo structure
    const structure = node.getChild("structure");
    if (!structure) {
        throw new ValidationException_1.ValidationException(node.getLine(), "TEMPLATE_STRUCTURE_REQUIRED", "Template must define 'Structure >>'");
    }
    const text = structure.getText();
    const offset = structure.getLine();
    // Creamos un parser simple
    const parser = new Parser_1.Parser();
    // Parseamos para los nodos
    let nodes = [];
    try {
        nodes = parser.parse(text);
    }
    catch (e) {
        if (e instanceof ParseException_1.ParseException) {
            throw new ParseException_1.ParseException(e.line + offset, e.code, e.message);
        }
        throw e;
    }
    // Vamos iterando todos los nodos insertando
    for (const n of nodes) {
        addToSchema(result, n, offset);
    }
    // Buscamos descripciones
    const description = node.getChild("description");
    if (description) {
        const text = description.getText();
        let nodes = [];
        try {
            nodes = parser.parse(text);
        }
        catch (e) {
            if (e instanceof ParseException_1.ParseException) {
                throw new ParseException_1.ParseException(e.line + description.getLine(), e.code, e.message);
            }
            throw e;
        }
        addDescriptions(result, nodes, description.getLine());
    }
    // Retornamos resultado
    return result;
}
function addToSchema(schema, node, offset) {
    // Obtenemos nombre qualificado
    let namespace = node.getNamespace();
    const name = node.getName();
    // Miramos datos
    let cl = ChildLineParser_1.ChildLineParser.parse(node.getValue(), node.getLine() + offset);
    if (!namespace || namespace === "") {
        namespace = schema.getNamespace();
    }
    if (namespace !== schema.getNamespace()) {
        // Validamos type vacío
        const type = cl.getType();
        if (type != null && type.trim().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine() + offset, "TYPE_DEFINITION_NOT_ALLOWED", "Not allowed type definition in external namespaces");
        }
        // No hacemos nada con creación de nodos que no son de @stxt.template!!
        return;
    }
    // Miramos si es nuevo y añadimos en listado
    let schemaNode = schema.getNodeDefinition(name);
    if (!schemaNode) {
        // Nuevo
        const type = cl.getType() == null ? "INLINE" : cl.getType();
        schemaNode = new NodeDefinition_1.NodeDefinition(node.getName(), type, node.getLine() + offset, undefined);
        schema.addNodeDefinition(schemaNode);
        const values = cl.getValues();
        if (values) {
            if (type !== "ENUM") {
                throw new ValidationException_1.ValidationException(node.getLine() + offset, "VALUES_NOT_IN_ENUM", `Values only allowed with type ENUM`);
            }
            for (const v of values) {
                schemaNode.addValue(v, node.getLine() + offset);
            }
        }
    }
    else {
        let type = cl.getType();
        if (!type || !type.startsWith("@")) {
            throw new ValidationException_1.ValidationException(node.getLine() + offset, "NODE_DEFINED_MULTIPLE_TIMES", `Multiple node reference must start with @: ${node.getName()}`);
        }
        type = type.substring(1);
        type = StringUtils_1.StringUtils.normalize(type);
        if (type === node.getNormalizedName()) {
            return; // OK Definition
        }
        throw new ValidationException_1.ValidationException(node.getLine() + offset, "NODE_REFERENCE_NOT_VALID", `Reference must be '@${node.getName()}', not '${type}'`);
    }
    // Una vez ya existe, si tiene hijos los intentamos crear.
    const childrenNode = node.getChildren();
    // Insertamos childs
    for (const child of childrenNode) {
        cl = ChildLineParser_1.ChildLineParser.parse(child.getValue(), child.getLine() + offset);
        const childName = child.getName();
        let childNamespace = child.getNamespace();
        if (!childNamespace || childNamespace === "") {
            childNamespace = schema.getNamespace();
        }
        const schChild = new ChildDefinition_1.ChildDefinition(childName, childNamespace, cl.getMin(), cl.getMax(), child.getLine() + offset);
        schemaNode.addChildDefinition(schChild);
        addToSchema(schema, child, offset);
    }
}
function addDescriptions(schema, nodes, offset) {
    nodes.forEach((node) => {
        // Obtenemos namespace
        let namespace = node.getNamespace();
        if (!namespace || namespace === "") {
            namespace = schema.getNamespace();
        }
        // Validamos no external description
        if (namespace !== schema.getNamespace()) {
            throw new ValidationException_1.ValidationException(node.getLine() + offset, "EXTERNAL_DESCRIPTION_NOT_ALLOWED", "Not allowed description in external namespaces");
        }
        // Validamos sin hijos
        if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine() + offset, "CHILDREN_DESCRIPTION_NOT_ALLOWED", "Not allowed children in description");
        }
        // Buscamos nodo de esquema
        const nodeDef = schema.getNodeDefinition(node.getName());
        if (!nodeDef) {
            throw new ValidationException_1.ValidationException(node.getLine() + offset, "NODE_NOT_FOUND", `Not found node with name: ${node.getName()}`);
        }
        nodeDef.setDescription(node.getText());
    });
}
//# sourceMappingURL=TemplateParser.js.map