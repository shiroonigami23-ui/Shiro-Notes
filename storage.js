// GitHub-backed asset storage with local fallback.
class StorageModule {
    constructor(app) {
        this.app = app;
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result || '';
                const base64 = String(result).split(',')[1] || '';
                if (!base64) return reject(new Error('Failed to encode file'));
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(blob);
        });
    }

    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(blob);
        });
    }

    async uploadFile(fileOrBlob, options = {}) {
        const folder = options.folder || 'uploads';
        const filename = options.filename || fileOrBlob.name || `file_${Date.now()}.bin`;
        const mimeType = fileOrBlob.type || options.mimeType || 'application/octet-stream';

        try {
            const base64 = await this.blobToBase64(fileOrBlob);
            const response = await fetch('/api/github-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, mimeType, base64, folder })
            });

            if (!response.ok) {
                throw new Error(`Upload failed (${response.status})`);
            }

            const result = await response.json();
            if (!result?.url) {
                throw new Error('Upload response missing url');
            }
            return {
                provider: 'github',
                url: result.url,
                path: result.path || null
            };
        } catch (error) {
            // Silent secure fallback: keep UX working without leaking sensitive details.
            const localDataUrl = await this.blobToDataUrl(fileOrBlob);
            return {
                provider: 'local',
                url: localDataUrl,
                path: null,
                fallback: true
            };
        }
    }
}

if (window.app) {
    window.storageModule = new StorageModule(window.app);
}

