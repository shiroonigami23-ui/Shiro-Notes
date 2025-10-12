// ===== Encryption & Decryption =====

class CryptoManager {
    constructor() {
        this.setupPasswordStrength();
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('encryptPassword');
        if (!passwordInput) return;

        passwordInput.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });
    }

    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;

        let strength = 0;
        let feedback = '';

        if (password.length === 0) {
            strengthBar.style.width = '0%';
            strengthBar.style.backgroundColor = 'var(--danger)';
            strengthText.textContent = 'Enter a strong password';
            return;
        }

        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        const width = (strength / 5) * 100;
        strengthBar.style.width = width + '%';

        if (strength <= 2) {
            strengthBar.style.backgroundColor = 'var(--danger)';
            feedback = 'Weak password';
        } else if (strength <= 3) {
            strengthBar.style.backgroundColor = 'var(--warning)';
            feedback = 'Moderate password';
        } else {
            strengthBar.style.backgroundColor = 'var(--success)';
            feedback = 'Strong password';
        }

        strengthText.textContent = feedback;
    }

    encryptText(text, password) {
        try {
            const encrypted = CryptoJS.AES.encrypt(text, password).toString();
            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    decryptText(encryptedText, password) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedText, password).toString(CryptoJS.enc.Utf8);
            return decrypted || null;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    generateShareableMessage(text, password) {
        const encrypted = this.encryptText(text, password);
        if (!encrypted) return null;

        const message = btoa(JSON.stringify({
            encrypted: encrypted,
            timestamp: new Date().toISOString(),
            app: 'Shiro Notes'
        }));

        return message;
    }

    decryptShareableMessage(message, password) {
        try {
            const data = JSON.parse(atob(message));
            return this.decryptText(data.encrypted, password);
        } catch (error) {
            console.error('Invalid message format:', error);
            return null;
        }
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                app.showToast('Copied to clipboard', 'success');
            }).catch(() => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            app.showToast('Copied to clipboard', 'success');
        } catch (error) {
            app.showToast('Failed to copy', 'error');
        }
        
        document.body.removeChild(textarea);
    }
}

// Initialize crypto manager
const cryptoManager = new CryptoManager();
