const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg'
};

function getEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

function mimeFromPath(path) {
  const last = path.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXT[last] || 'application/octet-stream';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = getEnv('GITHUB_STORAGE_TOKEN');
    const owner = getEnv('GITHUB_STORAGE_OWNER');
    const repo = getEnv('GITHUB_STORAGE_REPO');
    const branch = (process.env.GITHUB_STORAGE_BRANCH || 'main').trim();

    const path = String(req.query.path || '');
    if (!path || path.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
    const ghRes = await fetch(ghUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'shiro-notes-storage'
      }
    });

    if (!ghRes.ok) {
      const text = await ghRes.text();
      return res.status(404).json({ error: 'Asset not found', details: text.slice(0, 240) });
    }

    const json = await ghRes.json();
    const raw = Buffer.from((json.content || '').replace(/\n/g, ''), 'base64');
    res.setHeader('Content-Type', mimeFromPath(path));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.status(200).send(raw);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Asset fetch failed' });
  }
};

