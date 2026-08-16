import Module from 'module';
import vscodeStub from './stub/vscode';

/**
 * Hook that mocha loads with `--require` before anything else (see `.mocharc.json`).
 *
 * The code under `src/` does `require('vscode')`, a module that only exists inside the
 * editor process. That resolution is intercepted here and the stub is returned, so the
 * providers can run in plain Node. Everything else resolves normally.
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
