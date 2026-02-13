// Validator.ts

import { Node } from "../core/Node";

export interface Validator {
  validate(n: Node): void;
}
