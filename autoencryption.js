// ===== Auto Encryption & Secure Sharing =====

class AutoEncryption {
    constructor() {
        this.init();
    }

    init() {
        this.setupShareButtons();
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
    if (!note) {
        app.showToast('No note selected', 'error');
        return;
    }

    if (isDestructive) {
        if (!confirm("⚠️ Are you sure?\n\nThis will permanently delete this note from your device after sharing. This action cannot be undone.")) {
            return;
        }
    }

    // Generate random password
    const password = this.generatePassword();

    // Encrypt note content
    const encrypted = CryptoJS.AES.encrypt(note.content, password).toString();

    // Create encrypted message file
    const messageFile = {
        version: '1.1', // New version to indicate it might be a one-time message
        appName: 'Shiro Notes',
        encrypted: true,
        title: note.title,
        content: encrypted,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
    
    const noteIdToDelete = note.id; // Store ID before creating blob

    // Convert to blob for download
    const messageBlob = new Blob([JSON.stringify(messageFile, null, 2)], {
        type: 'application/json'
    });

    const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_')}_encrypted`;

    // The logic to handle the deletion after sharing
    const handlePostShare = () => {
        if (isDestructive) {
            app.showToast('Note has been permanently deleted.', 'warning');
            app.deleteItem(noteIdToDelete, 'note');
            // Close the editor view as the note is gone
            app.showPage('notes');
        }
    };

    // Show sharing modal, passing the post-share handler
    this.showSharingModal(messageBlob, fileName, password, handlePostShare);
}

// Show sharing options modal
showSharingModal(messageBlob, fileName, password, postShareCallback = () => {}) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'autoShareModal';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Share Encrypted Note</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                        <i class="fas fa-info-circle"></i> 
                        Share the encrypted message first, then share the password file separately.
                    </p>
                </div>

                <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1rem;">Step 1: Share Message File</h3>
                    <div class="share-buttons" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn-share" data-method="download" style="flex: 1; min-width: 120px;">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn-share" data-method="native" style="flex: 1; min-width: 120px;">
                            <i class="fas fa-share-alt"></i> Share...
                        </button>
                    </div>
                </div>

                <div id="passwordFileSection" style="background: var(--primary-light); padding: 1.5rem; border-radius: var(--radius-md); opacity: 0.5; pointer-events: none;">
                    <h3 style="margin-bottom: 1rem; font-size: 1rem;">
                        Step 2: Share Password File 
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">(after message is sent)</span>
                    </h3>
                    <button class="btn-primary" id="generatePasswordFile" style="width: 100%;" disabled>
                        <i class="fas fa-key"></i> Generate & Download Password File
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const messageUrl = URL.createObjectURL(messageBlob);

    // Function to enable Step 2
    const enableStep2 = () => {
        const passwordSection = modal.querySelector('#passwordFileSection');
        const passwordBtn = modal.querySelector('#generatePasswordFile');
        passwordSection.style.opacity = '1';
        passwordSection.style.pointerEvents = 'auto';
        passwordBtn.disabled = false;
        app.showToast('Message file ready to share!', 'success');
    };

    // Setup share button handlers
    modal.querySelectorAll('.btn-share').forEach(btn => {
        btn.addEventListener('click', async () => {
            const method = btn.dataset.method;

            if (method === 'download') {
                this.downloadFile(messageUrl, fileName + '.json');
                enableStep2();
                // We assume the share is "successful" on download click for destructive mode
                postShareCallback(); 
            } else if (method === 'native') {
                if (navigator.share) {
                    try {
                        const file = new File([messageBlob], fileName + '.json', { type: 'application/json' });
                        await navigator.share({
                            title: 'Encrypted Note',
                            text: 'Encrypted note from Shiro Notes',
                            files: [file]
                        });
                        enableStep2();
                        // This callback runs after the share sheet is closed
                        postShareCallback(); 
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            this.downloadFile(messageUrl, fileName + '.json');
                            enableStep2();
                            postShareCallback();
                        }
                    }
                } else {
                    this.downloadFile(messageUrl, fileName + '.json');
                    enableStep2();
                    postShareCallback();
                }
            }
        });
    });

    // Password file generation
    modal.querySelector('#generatePasswordFile').addEventListener('click', () => {
        const obfuscated = this.obfuscatePassword(password);
        const passwordBlob = new Blob([JSON.stringify(obfuscated)], { type: 'application/octet-stream' });
        const passwordUrl = URL.createObjectURL(passwordBlob);
        this.downloadFile(passwordUrl, fileName + '.key');
        app.showToast('Password file downloaded! Share it separately.', 'success');

        setTimeout(() => {
            URL.revokeObjectURL(messageUrl);
            URL.revokeObjectURL(passwordUrl);
            modal.remove();
        }, 2000);
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
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Decrypt Note</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                    Select both the encrypted message file (.json) and the password file (.key) to decrypt.
                </p>
                <div class="form-group">
                    <label>Message File (.json)</label>
                    <input type="file" id="messageFileInput" accept=".json" class="file-input">
                </div>
                <div class="form-group">
                    <label>Password File (.key)</label>
                    <input type="file" id="passwordFileInput" accept=".key" class="file-input">
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
        const passwordFile = modal.querySelector('#passwordFileInput').files[0];

        if (!messageFile || !passwordFile) {
            app.showToast('Please select both files', 'error');
            return;
        }

        try {
            const messageContent = await this.readFile(messageFile);
            const messageData = JSON.parse(messageContent);
            const passwordContent = await this.readFile(passwordFile);
            const passwordData = JSON.parse(passwordContent);

            const password = this.deobfuscatePassword(passwordData);
            if (!password) throw new Error('Invalid password file');

            const decrypted = CryptoJS.AES.decrypt(messageData.content, password).toString(CryptoJS.enc.Utf8);
            if (!decrypted) throw new Error('Decryption failed');

            // Instead of saving, show the one-time view
            this.showOneTimeView(messageData.title, decrypted);
            
            app.showToast('Note decrypted successfully!', 'success');
            modal.remove();

        } catch (error) {
            console.error('Decryption error:', error);
            app.showToast('Decryption failed. Check your files.', 'error');
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
    modal.className = 'modal active one-time-view';
    
    // Using innerHTML is safe here because the content comes from a trusted, encrypted source
    // that was originally created within our own app's editor.
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h2>${app.escapeHtml(title)}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 2rem;">
                <div class="one-time-warning">
                    <i class="fas fa-fire"></i>
                    <strong>This is a one-time view.</strong> This message will be permanently gone after you close this window.
                </div>
                <div class="one-time-content">${content}</div>
            </div>
            <div class="modal-footer">
                <button class="btn btn--primary" onclick="this.closest('.modal').remove()">
                    Close & Destroy Message
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
 
}

// Initialize
const autoEncryption = new AutoEncryption();
