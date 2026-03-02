import { Node } from "../core/Node";
import { Parser } from "../core/Parser";
import { ValidationException } from "../exceptions/ValidationException";

import { ChildDefinition } from "../schema/ChildDefinition";
import { NodeDefinition } from "../schema/NodeDefinition";
import { Schema } from "../schema/Schema";

import { StringUtils } from "../core/StringUtils";

import { ChildLineParser } from "./ChildLineParser";
import { ChildLine } from "./ChildLine";

export class TemplateParser {
	static transformNodeToSchema(node: Node): Schema {
		// Insertamos namespace
		const result = new Schema(node.getValue(), node.getLine(), undefined);

		// Buscamos nodo structure
		const structure = node.getChild("structure");
		if (!structure) {
			throw new ValidationException(
				node.getLine(),
				"TEMPLATE_STRUCTURE_REQUIRED",
				"Template must define 'Structure >>'"
			);
		}

		const text = structure.getText();
		const offset = structure.getLine();

		// Parseamos para los nodos
		const nodes: Node[] = new Parser().parse(text).getNodes();

		// Vamos iterando todos los nodos insertando
		for (const n of nodes) {
			this.addToSchema(result, n, offset);
		}

		// Retornamos resultado
		return result;
	}

	private static addToSchema(schema: Schema, node: Node, offset: number): void {
		// Obtenemos nombre qualificado
		const namespace = node.getNamespace();
		const name = node.getName();

		// Miramos datos
		let cl: ChildLine = ChildLineParser.parse(node.getValue(), node.getLine() + offset);

		if (namespace.length === 0) {
			throw new ValidationException(node.getLine() + offset, "EMPTY_NAMESPACE", "Not allowed empty namespaces");
		}

		if (namespace !== schema.getNamespace()) {
			// Validamos type vacío
			const type = cl.getType();
			if (type != null && type.trim().length > 0) {
				throw new ValidationException(node.getLine() + offset,"TYPE_DEFINITION_NOT_ALLOWED","Not allowed type definition in external namespaces");
			}

			// No hacemos nada con creación de nodos que no son de @stxt.template!!
			return;
		}

		// Miramos si es nuevo y añadimos en listado
		let schemaNode = schema.getNodeDefinition(name);

		if (!schemaNode) {
			// Nuevo
			const type = cl.getType() == null ? "INLINE" : cl.getType()!;
			schemaNode = new NodeDefinition(node.getName(), type, node.getLine() + offset, undefined);
			schema.addNodeDefinition(schemaNode);

			const values = cl.getValues();
			if (values) {
				for (const v of values) {
					schemaNode.addValue(v);
				}
			}
		} else {
			let type = cl.getType();
			if (!type || !type.startsWith("@")) {
				throw new ValidationException(node.getLine() + offset,"NODE_DEFINED_MULTIPLE_TIMES",`Multiple node reference must start with @: ${node.getName()}`);
			}

			type = type.substring(1);
			type = StringUtils.normalize(type);

			if (type === node.getNormalizedName()) {
				return; // OK Definition
			} 

			throw new ValidationException(node.getLine() + offset,"NODE_REFERENCE_NOT_VALID",`Reference must be '@${node.getName()}', not '${type}'`);
		}

		// Una vez ya existe, si tiene hijos los intentamos crear.
		const childrenNode = node.getChildren();

		// Insertamos childs
		for (const child of childrenNode) {
			cl = ChildLineParser.parse(child.getValue(), child.getLine() + offset);

			const childName = child.getName();
			const childNamespace = child.getNamespace();

			const schChild = new ChildDefinition(childName,	childNamespace,	cl.getMin(), cl.getMax(), child.getLine() + offset);
			schemaNode.addChildDefinition(schChild);

			this.addToSchema(schema, child, offset);
		}
	}
}