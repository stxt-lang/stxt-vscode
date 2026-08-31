import { InlineNode, Node, StringUtils, Schema, NodeDefinition, ChildDefinition } from '@stxt-lang/core';
import { getSchemas, SchemaLoaderExtension } from './SchemaLoader';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { log } from './Log';

const schemaLoader: SchemaLoaderExtension = new SchemaLoaderExtension();

export function findSuggestionsByParent(parent: InlineNode, prefix: string): CompletionItem[] {
	log.trace(`Looking up the schema for ${parent.getQualifiedName()}.`);
	const schema = schemaLoader.getSchema(parent.getNamespace());

	if (!schema) {
		return [];
	}

	const nodeDef = schema.getNodeDefinition(parent.getName());
	if (!nodeDef) {
		return [];
	}

	const children = nodeDef.getChildren();
	const result: CompletionItem[] = [];
	const normalizedPrefix = StringUtils.normalize(prefix);

	for (const [childName, childDef] of children.entries()) {
		if (normalizedPrefix.length > 0 && !StringUtils.normalize(childDef.getName()).startsWith(normalizedPrefix)) {
			continue;
		}

		// A child of the parent's own namespace is inserted without repeating it
		const item = createCompletionItem(childDef.getName(), childDef.getNamespace(),
			isBlockText(childDef), childDef.getNamespace() !== parent.getNamespace());
		item.detail = childName;

		const actualChildren: Node[] = parent.getChildrenByName(childDef.getName(), childDef.getNamespace());
		const maxChildren = childDef.getMax() ?? -1;
		if (maxChildren < 0 || actualChildren.length < maxChildren) {
			result.push(item);
		}
	}

	return result;
}

export function findRootLevelSuggestions(prefix: string): CompletionItem[] {
	const result: CompletionItem[] = [];
	const seen = new Set<string>();
	const normalizedPrefix = StringUtils.normalize(prefix);

	for (const schema of getSchemas()) {
		for (const nodeDef of getRootNodeDefinitions(schema)) {
			if (normalizedPrefix.length > 0 && !nodeDef.getCanonicalName().startsWith(normalizedPrefix)) {
				continue;
			}

			const key = `${schema.getNamespace()}:${nodeDef.getCanonicalName()}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);

			result.push(createCompletionItem(nodeDef.getName(), schema.getNamespace(), isBlockTextNode(nodeDef), true));
		}
	}

	return result;
}

function getRootNodeDefinitions(schema: Schema): NodeDefinition[] {
	const referencedLocalChildren = new Set<string>();

	for (const nodeDef of schema.getNodes().values()) {
		for (const childDef of nodeDef.getChildren().values()) {
			if (childDef.getNamespace() === schema.getNamespace()) {
				referencedLocalChildren.add(childDef.getCanonicalName());
			}
		}
	}

	const roots: NodeDefinition[] = [];
	for (const nodeDef of schema.getNodes().values()) {
		if (!referencedLocalChildren.has(nodeDef.getCanonicalName())) {
			roots.push(nodeDef);
		}
	}

	if (roots.length > 0) {
		return roots;
	}

	// Fallback when the roots cannot be inferred.
	return Array.from(schema.getNodes().values());
}

/**
 * A completion item that inserts the node line: `Name: ` or `Name >>` with a fresh indented
 * line, with the namespace in parentheses when `withNamespace` asks for it (an empty
 * namespace is never written).
 */
function createCompletionItem(name: string, namespace: string, isText: boolean, withNamespace: boolean): CompletionItem {
	const item = new CompletionItem(name, isText ? CompletionItemKind.Module : CompletionItemKind.EnumMember);
	const includeNamespace = namespace.length > 0 && withNamespace;

	if (includeNamespace) {
		if (isText) {
			item.insertText = `${name} (${namespace})>>\n\t`;
		} else {
			item.insertText = `${name} (${namespace}): `;
		}
	} else {
		if (isText) {
			item.insertText = `${name} >>\n\t`;
		} else {
			item.insertText = `${name}: `;
		}
	}

	item.detail = includeNamespace ? `${namespace}:${StringUtils.normalize(name)}` : StringUtils.normalize(name);
	return item;
}

function isBlockTextNode(nodeDef: NodeDefinition): boolean {
	const type = nodeDef.getType();
	return type === "TEXT" || type === "BLOCK";
}

function isBlockText(childDef: ChildDefinition): boolean {
	try {
		 const schema = schemaLoader.getSchema(childDef.getNamespace());
		 if (!schema) {
			return false;
		 }

		 const nodeDef = schema.getNodeDefinition(childDef.getName());
		 if (!nodeDef) { 
			return false;
		 }
		 
		 return isBlockTextNode(nodeDef);
	} catch {
		return false;
	}
}

export function findEnumValues(node: Node, prefix: string): CompletionItem[] {
	log.trace(`Looking up the ENUM values of ${node.getQualifiedName()}.`);


	const schema = schemaLoader.getSchema(node.getNamespace());
	if (!schema) {
		return [];
	}

	const nodeDef = schema.getNodeDefinition(node.getName());
	if (!nodeDef) {
		return [];
	}

	// Offer values only if the type is ENUM
	if (nodeDef.getType() !== 'ENUM') {
		return [];
	}

	const values = nodeDef.getValues();
	const result: CompletionItem[] = [];
	const normalizedPrefix = StringUtils.normalize(prefix);

	for (const value of values) {
		// Keep the values that start with the prefix
		if (normalizedPrefix.length > 0 && !StringUtils.normalize(value).startsWith(normalizedPrefix)) {
			continue;
		}

		const item = new CompletionItem(value, CompletionItemKind.EnumMember);
		item.insertText = value;
		item.detail = `ENUM value for ${node.getName()}`;
		result.push(item);
	}

	return result;
}
