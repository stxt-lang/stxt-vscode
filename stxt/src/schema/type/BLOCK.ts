// type/BLOCK.ts

import { Node } from "../../core/Node";
import { ParseException } from "../../exceptions/ParseException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

export const BLOCK: Type = {
  getName(): string {
    return "BLOCK";
  },

  validate(ndef: NodeDefinition, n: Node): void {
    if (n.getValue().length > 0) {
      throw new ParseException(
        n.getLine(),
        "NOT_ALLOWED_VALUE",
        `Not allowed inline text in node ${n.getQualifiedName()}`
      );
    }
  },
};
