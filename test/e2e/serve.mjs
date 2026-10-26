/**
 * A static server for the built fixture — what Playwright's `webServer`
 * starts. Serves `test/e2e/fixture/dist` with the right content types and
 * `index.html` for directories, as any static host would.
 *
 *   node test/e2e/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./fixture/dist/', import.meta.url));
const port = Number(process.argv[2] ?? 4399);

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.json': 'application/json',
};

createServer(async (request, response) => {
	const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname));
	let file = join(root, path);
	if (!file.startsWith(root)) {
		response.writeHead(403).end();
		return;
	}
	try {
		if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
		const body = await readFile(file);
		response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
	} catch {
		response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
	}
}).listen(port, '127.0.0.1', () => console.log(`fixture on http://localhost:${port}`));
