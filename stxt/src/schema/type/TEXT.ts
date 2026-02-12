// type/TEXT.ts

import { Node } from "../../core/Node";
import { ValidationException } from "../../exceptions/ValidationException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

export const TEXT: Type = {
  getName(): string {
    return "TEXT";
  },

  validate(ndef: NodeDefinition, n: Node): void {
    if (n.getChildren().length > 0) {
      throw new ValidationException(
        n.getLine(),
        "NOT_ALLOWED_CHILDREN_TEXT",
        `Not allowed children nodes in node ${n.getQualifiedName()}`
      );
    }
  },
};
