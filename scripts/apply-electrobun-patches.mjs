import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const patchRoot = join(projectRoot, 'patches', 'electrobun');
const packageRoot = join(projectRoot, 'node_modules', 'electrobun');
const windowsCorePatchRoot = join(patchRoot, 'win-core');
const windowsRuntimeRoot = join(packageRoot, 'dist-win-x64');

if (!existsSync(packageRoot)) {
	console.log('[electrobun-patches] node_modules/electrobun not found, skipping');
	process.exit(0);
}

if (!existsSync(patchRoot)) {
	console.log('[electrobun-patches] patches/electrobun not found, skipping');
	process.exit(0);
}

cpSync(patchRoot, packageRoot, {
	force: true,
	recursive: true,
});

if (existsSync(windowsCorePatchRoot) && existsSync(windowsRuntimeRoot)) {
	cpSync(windowsCorePatchRoot, windowsRuntimeRoot, {
		force: true,
		recursive: true,
	});
	console.log('[electrobun-patches] Applied local Electrobun Windows runtime patches');
}

console.log('[electrobun-patches] Applied local Electrobun source patches');
