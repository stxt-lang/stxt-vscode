import Module from 'module';
import vscodeStub from './stub/vscode';

/**
 * Enganche que mocha carga con `--require` antes que nada (ver `.mocharc.json`).
 *
 * El código de `src/` hace `require('vscode')`, un módulo que solo existe dentro del
 * proceso del editor. Aquí se intercepta esa resolución y se devuelve el stub, con lo
 * que los providers se pueden ejecutar en Node puro. Todo lo demás se resuelve normal.
 */

type ModuleLoader = {
	_load(request: string, parent: unknown, isMain: boolean): unknown;
};

const loader = Module as unknown as ModuleLoader;
const originalLoad = loader._load;

loader._load = function (request: string, parent: unknown, isMain: boolean): unknown {
	if (request === 'vscode') {
		return vscodeStub;
	}
	return originalLoad.call(this, request, parent, isMain);
};
