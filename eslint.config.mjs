import typescriptEslint from "typescript-eslint";

export default typescriptEslint.config(
	{ ignores: ["out/**"] },
	...typescriptEslint.configs.recommended,
	{
		files: ["**/*.ts"],
		rules: {
			"@typescript-eslint/naming-convention": ["error", {
				selector: "import",
				format: ["camelCase", "PascalCase"],
			}],
			"no-irregular-whitespace": ["error", { skipStrings: true, skipTemplates: true, skipComments: true }],
			"@typescript-eslint/no-empty-function": ["error", { allow: ["private-constructors"] }],
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],

			curly: "error",
			eqeqeq: "error",
			"no-throw-literal": "error",
			semi: "error",
			indent: ["error", "tab", { SwitchCase: 1 }],
		},
	},
);
