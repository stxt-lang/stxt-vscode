// Observer.ts

import { Node } from "../core/Node";

export interface Observer {
  onCreate(node: Node): void;
  onFinish(node: Node): void;
}
