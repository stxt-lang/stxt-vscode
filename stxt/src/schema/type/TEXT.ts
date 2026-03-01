// type/TEXT.ts

import { Node } from "../../core/Node";
import { ParseException } from "../../exceptions/ParseException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

export const TEXT: Type = {
  getName(): string {
    return "TEXT";
  },

  validate(ndef: NodeDefinition, n: Node): void {
    if (n.getChildren().length > 0) {
      throw new ParseException(
        n.getLine(),
        "NOT_ALLOWED_CHILDREN_TEXT",
        `Not allowed children nodes in node ${n.getQualifiedName()}`
      );
    }
  },
};
