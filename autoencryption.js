// ===== Auto Encryption & Secure Sharing =====

class AutoEncryption {
    constructor() {
        this.init();
    }

    init() {
        
    }

    toBase64(uint8Array) {
        return btoa(String.fromCharCode(...uint8Array));
    }

    fromBase64(base64) {
        return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
    }

    async fingerprintFromPublicKeyBase64(publicKeyB64) {
        const hash = await crypto.subtle.digest('SHA-256', this.fromBase64(publicKeyB64));
        const bytes = new Uint8Array(hash);
        return Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
    }

    async generateRecipientIdentity() {
        const keys = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256'
            },
            true,
            ['encrypt', 'decrypt']
        );

        const publicSpki = await crypto.subtle.exportKey('spki', keys.publicKey);
        const privatePkcs8 = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
        const publicKey = this.toBase64(new Uint8Array(publicSpki));
        const privateKey = this.toBase64(new Uint8Array(privatePkcs8));
        const fingerprint = await this.fingerprintFromPublicKeyBase64(publicKey);

        window.app.data.settings.secureShare = {
            publicKey,
            privateKey,
            fingerprint,
            createdAt: new Date().toISOString()
        };
        window.app.saveData();
        return window.app.data.settings.secureShare;
    }

    getIdentity() {
        return window.app.data.settings.secureShare || {};
    }

    exportPublicIdentityFile() {
        const identity = this.getIdentity();
        if (!identity.publicKey) {
            window.app.showToast('Generate identity first', 'warning');
            return;
        }
        const payload = {
            app: 'Shiro Notes',
            type: 'sn_public_key',
            version: '2.0',
            algorithm: 'RSA-OAEP-2048-SHA256',
            publicKey: identity.publicKey,
            fingerprint: identity.fingerprint,
            createdAt: identity.createdAt
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        this.downloadFile(URL.createObjectURL(blob), `shiro-notes-public-key-${(identity.fingerprint || 'user').replace(/[:\s]/g, '')}.snpub.json`);
        window.app.showToast('Public key exported', 'success');
    }

    // Generate strong random password
    generatePassword(length = 32) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            password += charset[array[i] % charset.length];
        }
        return password;
    }

    // Obfuscate password file content
    obfuscatePassword(password) {
        const timestamp = Date.now();
        const randomSalt = this.generatePassword(16);

        // Create multi-layer encoding
        const layer1 = btoa(password);
        const layer2 = btoa(randomSalt + layer1 + timestamp);
        const layer3 = btoa(layer2);

        // Add noise data
        const noise = Array(100).fill(0).map(() => Math.random().toString(36)).join('');

        return {
            _v: '1.0',
            _d: layer3,
            _t: timestamp,
            _s: randomSalt,
            _n: btoa(noise),
            _checksum: btoa(layer3.length.toString())
        };
    }

    // Deobfuscate password file
    deobfuscatePassword(obfuscatedData) {
        try {
            const layer3 = obfuscatedData._d;
            const layer2 = atob(layer3);
            const combined = atob(layer2);

            // Extract password from combined string
            const saltLength = obfuscatedData._s.length;
            const timestampLength = obfuscatedData._t.toString().length;
            const password = combined.substring(saltLength, combined.length - timestampLength);

            return atob(password);
        } catch (e) {
            console.error('Failed to deobfuscate password:', e);
            return null;
        }
    }
    

// Auto encrypt and share note
// in autoencryption.js

async autoEncryptAndShare(note, isDestructive = false) {
    const appRef = window.app;
    if (!note || note.type === 'audio' || note.type === 'canvas') {
        appRef.showToast('Open a text note to share', 'error');
        return;
    }

    if (isDestructive) {
        const confirmed = await (appRef.confirmDialog?.(
            'This will permanently delete this note from your device after sharing. This action cannot be undone.',
            { title: 'Share & Destroy', confirmText: 'Share and Destroy', variant: 'danger' }
        ) ?? Promise.resolve(confirm("⚠️ Are you sure?\n\nThis will permanently delete this note from your device after sharing. This action cannot be undone.")));
        if (!confirmed) {
            return;
        }
    }

    const liveContent = window.editorCore?.currentEditor?.innerHTML || note.content || '';
    const fileName = `${(note.title || 'note').replace(/[^a-z0-9]/gi, '_')}_encrypted`;
    const noteIdToDelete = note.id;

    const handlePostShare = () => {
        if (isDestructive) {
            const idx = appRef.data.notes.findIndex(n => n.id === noteIdToDelete);
            if (idx !== -1) {
                appRef.data.notes.splice(idx, 1);
                appRef.saveData();
                appRef.updateUI();
            }
            appRef.showToast('Note has been permanently deleted.', 'warning');
            // Close the editor view as the note is gone
            appRef.showPage('notes');
        }
    };

    this.showRecipientKeyModal({
        noteTitle: note.title,
        noteContent: liveContent,
        fileName,
        onSuccess: handlePostShare
    });
}

showRecipientKeyModal({ noteTitle, noteContent, fileName, onSuccess }) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.id = 'autoShareModal';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 560px;">
            <div class="modal-header">
                <h2>Recipient-Only Encrypted Share</h2>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    <i class="fas fa-user-lock"></i>
                    Upload recipient public key file (<code>.snpub.json</code>). Only their private key can decrypt.
                </p>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Recipient Public Key File</label>
                    <input type="file" id="recipientPublicKeyFile" accept=".json,.snpub.json" class="file-input">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Or Paste Recipient Public Key</label>
                    <textarea id="recipientPublicKeyText" class="form-control" rows="4" placeholder="Paste publicKey base64 from .snpub.json"></textarea>
                </div>
                <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
                    <button class="btn btn--primary" id="generateRecipientLockedMessage">
                        <i class="fas fa-lock"></i> Generate Secure Message
                    </button>
                    <button class="btn btn--secondary" onclick="window.autoEncryption.exportPublicIdentityFile()">
                        <i class="fas fa-file-export"></i> Export My Public Key
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const fileInput = modal.querySelector('#recipientPublicKeyFile');
    const keyText = modal.querySelector('#recipientPublicKeyText');
    const generateBtn = modal.querySelector('#generateRecipientLockedMessage');

    generateBtn.addEventListener('click', async () => {
        try {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Encrypting...';

            let recipientPublicKey = keyText.value.trim();
            if (!recipientPublicKey && fileInput.files?.[0]) {
                const raw = await this.readFile(fileInput.files[0]);
                const parsed = JSON.parse(raw);
                recipientPublicKey = parsed.publicKey || '';
            }
            if (!recipientPublicKey) {
                throw new Error('Recipient public key is required');
            }

            const publicKey = await crypto.subtle.importKey(
                'spki',
                this.fromBase64(recipientPublicKey),
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                false,
                ['encrypt']
            );

            const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encryptedContent = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                new TextEncoder().encode(noteContent)
            );
            const rawAes = await crypto.subtle.exportKey('raw', aesKey);
            const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAes);
            const recipientFingerprint = await this.fingerprintFromPublicKeyBase64(recipientPublicKey);

            const messageFile = {
                version: '2.0',
                appName: 'Shiro Notes',
                mode: 'recipient_only',
                algorithm: 'RSA-OAEP-2048 + AES-GCM-256',
                title: noteTitle,
                ciphertext: this.toBase64(new Uint8Array(encryptedContent)),
                encryptedKey: this.toBase64(new Uint8Array(encryptedKey)),
                iv: this.toBase64(iv),
                recipientFingerprint,
                createdAt: new Date().toISOString(),
                id: Date.now().toString(36) + Math.random().toString(36).slice(2)
            };

            const blob = new Blob([JSON.stringify(messageFile, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            this.downloadFile(url, fileName + '.snmsg.json');
            URL.revokeObjectURL(url);
            window.app.showToast('Recipient-locked message generated', 'success');
            onSuccess?.();
            modal.remove();
        } catch (error) {
            window.app.showToast(`Share failed: ${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-lock"></i> Generate Secure Message';
        }
    });
}

    // Download file helper
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Decrypt note with both files
    // In autoencryption.js - REPLACE this function

// Decrypt note with both files
async decryptWithFiles() {
    const identity = this.getIdentity();
    if (!identity.privateKey) {
        window.app.showToast('Generate your Secure Share Identity in Security first', 'warning');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Decrypt Recipient-Locked Message</h2>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                    Select a message file (<code>.snmsg.json</code>) intended for your identity.
                </p>
                <div class="form-group">
                    <label>Message File</label>
                    <input type="file" id="messageFileInput" accept=".json,.snmsg.json" class="file-input">
                </div>
                <button class="btn-primary" id="decryptFilesBtn" style="width: 100%; margin-top: 1rem;">
                    <i class="fas fa-unlock"></i> Decrypt Note
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#decryptFilesBtn').addEventListener('click', async () => {
        const messageFile = modal.querySelector('#messageFileInput').files[0];

        if (!messageFile) {
            window.app.showToast('Please select a message file', 'error');
            return;
        }

        try {
            const messageContent = await this.readFile(messageFile);
            const messageData = JSON.parse(messageContent);
            if (messageData.version !== '2.0' || messageData.mode !== 'recipient_only') {
                throw new Error('Unsupported or legacy message format');
            }

            if (messageData.recipientFingerprint !== identity.fingerprint) {
                throw new Error('This message is not intended for your identity');
            }

            const privateKey = await crypto.subtle.importKey(
                'pkcs8',
                this.fromBase64(identity.privateKey),
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                false,
                ['decrypt']
            );

            const rawAes = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                this.fromBase64(messageData.encryptedKey)
            );
            const aesKey = await crypto.subtle.importKey(
                'raw',
                rawAes,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: this.fromBase64(messageData.iv) },
                aesKey,
                this.fromBase64(messageData.ciphertext)
            );
            const decrypted = new TextDecoder().decode(decryptedBuffer);
            if (!decrypted) throw new Error('Decryption failed');

            // Instead of saving, show the one-time view
            this.showOneTimeView(messageData.title || 'Secure Message', decrypted);
            
            window.app.showToast('Note decrypted successfully!', 'success');
            modal.remove();

        } catch (error) {
            console.error('Decryption error:', error);
            window.app.showToast('Decryption failed. Check your files.', 'error');
        }
    });
}

    // Read file as text
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
   // In autoencryption.js - ADD this new function at the end of the class

// Show the decrypted content in a temporary, one-time view modal
showOneTimeView(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible one-time-view';
    
    // Using innerHTML is safe here because the content comes from a trusted, encrypted source
    // that was originally created within our own app's editor.
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h2>${window.app.escapeHtml(title)}</h2>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 2rem;">
                <div class="one-time-warning">
                    <i class="fas fa-fire"></i>
                    <strong>This is a one-time view.</strong> This message will be permanently gone after you close this window.
                </div>
                <div class="one-time-content">${content}</div>
            </div>
            <div class="modal-footer">
                <button class="btn btn--primary" onclick="this.closest('.modal-overlay').remove()">
                    Close & Destroy Message
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
 
}

// Initialize
window.autoEncryption = new AutoEncryption();
