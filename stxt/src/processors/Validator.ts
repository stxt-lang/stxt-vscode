import { Node } from "../core/Node";
import { ValidationException } from "../exceptions/ValidationException";

export interface Validator {
	validate(n: Node): ValidationException[];
}
