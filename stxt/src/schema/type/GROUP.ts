// type/GROUP.ts

import { Node } from "../../core/Node";
import { ParseException } from "../../exceptions/ParseException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

export const GROUP: Type = {
  getName(): string {
    return "GROUP";
  },

  validate(ndef: NodeDefinition, n: Node): void {
    if (n.getValue().length > 0 || n.getTextLines().length > 0) {
      throw new ParseException(
        n.getLine(),
        "INVALID_VALUE",
        `Node '${n.getName()}' has to be empty`
      );
    }
  },
};
