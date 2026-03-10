const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function getEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

function safeSegment(input) {
  return String(input || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .filter(Boolean)
    .join('/');
}

function safeFilename(name) {
  const clean = safeSegment(name || 'file.bin');
  return clean.includes('/') ? clean.split('/').pop() : clean;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = getEnv('GITHUB_STORAGE_TOKEN');
    const owner = getEnv('GITHUB_STORAGE_OWNER');
    const repo = getEnv('GITHUB_STORAGE_REPO');
    const branch = (process.env.GITHUB_STORAGE_BRANCH || 'main').trim();
    const baseDir = safeSegment(process.env.GITHUB_STORAGE_BASE_DIR || 'storage');

    const { filename, mimeType, base64, folder } = req.body || {};
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'Missing base64 payload' });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: 'File too large' });
    }

    const safeFolder = safeSegment(folder || 'uploads');
    const cleanName = safeFilename(filename || `file_${Date.now()}.bin`);
    const key = `${baseDir}/${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${cleanName}`;

    const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(key)}`;
    const payload = {
      message: `upload: ${key}`,
      content: buffer.toString('base64'),
      branch
    };

    const ghRes = await fetch(ghUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'shiro-notes-storage'
      },
      body: JSON.stringify(payload)
    });

    if (!ghRes.ok) {
      const text = await ghRes.text();
      return res.status(502).json({ error: 'GitHub upload failed', details: text.slice(0, 400) });
    }

    return res.status(200).json({
      ok: true,
      provider: 'github',
      path: key,
      mimeType: mimeType || 'application/octet-stream',
      url: `/api/github-asset?path=${encodeURIComponent(key)}`
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
};

