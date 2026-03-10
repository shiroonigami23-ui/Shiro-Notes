const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

const apiHandlers = {
  '/api/github-upload': require('./api/github-upload'),
  '/api/github-asset': require('./api/github-asset')
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf'
};

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()');
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, code, payload) {
  res.statusCode = code;
  setSecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function safeResolveStatic(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\0/g, '');
  const relative = clean === '/' ? '/index.html' : clean;
  const normalized = path.normalize(relative).replace(/^(\.\.[\\/])+/, '');
  const absolute = path.resolve(ROOT, `.${normalized}`);
  if (!absolute.startsWith(ROOT)) {
    return null;
  }
  return absolute;
}

function serveStatic(req, res, pathname) {
  let filePath = safeResolveStatic(pathname);
  if (!filePath) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: 'Not found' });
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.statusCode = 200;
  setSecurityHeaders(res);
  res.setHeader('Content-Type', mime);
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (ext === '.webmanifest' || ext === '.json' || ext === '.js' || ext === '.css') {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
  fs.createReadStream(filePath).pipe(res);
}

async function requestHandler(req, res) {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const urlObj = new URL(req.url, `http://${host}`);
    const pathname = urlObj.pathname;

    if (apiHandlers[pathname]) {
      req.query = Object.fromEntries(urlObj.searchParams.entries());
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        req.body = await parseJsonBody(req);
      } else {
        req.body = {};
      }
      return apiHandlers[pathname](req, res);
    }

    return serveStatic(req, res, pathname);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
}

loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

http.createServer(requestHandler).listen(PORT, () => {
  console.log(`Shiro Notes running on http://localhost:${PORT}`);
});
