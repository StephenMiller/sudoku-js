import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4173);
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relative);

  if (!resolved.startsWith(ROOT)) {
    return null;
  }

  return resolved;
}

const server = http.createServer(async (request, response) => {
  const filePath = resolveRequestPath(request.url || '/');

  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    const actualPath = fileStat.isDirectory()
      ? path.join(filePath, 'index.html')
      : filePath;

    const content = await readFile(actualPath);
    const extension = path.extname(actualPath);

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Sudoku web app running at http://localhost:${PORT}`);
});
