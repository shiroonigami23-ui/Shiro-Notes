// Security Module for Shiro Notes
class SecurityModule {
  constructor(app) {
    this.app = app;
    this.crypto = window.crypto;
    this.textEncoder = new TextEncoder();
    this.textDecoder = new TextDecoder();
  }

  // Passcode Management
  // In security.js
// --- ADD THESE NEW FUNCTIONS FOR MASTER PASSWORD MANAGEMENT ---

setupMasterPassword() {
    const isChanging = !!this.app.data.settings.masterPasswordHash;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content encryption-dialog">
        <div class="modal-header">
          <h3>${isChanging ? 'Change' : 'Set'} Master Password</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          ${isChanging ? `
          <div class="form-group">
              <label>Current Master Password</label>
              <input type="password" id="currentPassword" placeholder="Enter current password">
          </div>` : ''}
          <div class="form-group">
              <label>New Master Password</label>
              <input type="password" id="encryptionPassword" placeholder="Enter a strong password">
          </div>
          <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" id="confirmPassword" placeholder="Confirm your password">
              <div class="password-match" id="passwordMatch"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn--primary" id="encryptBtn" onclick="securityModule.saveMasterPassword()">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);

    // Reuse validation logic from crypto.js
    if (window.cryptoModule) {
        cryptoModule.setupEncryptionValidation();
    }
}


async saveMasterPassword() {
    const saveButton = document.getElementById('encryptBtn');

    try {
        const isChanging = !!this.app.data.settings.masterPasswordHash;
        const currentPass = isChanging ? document.getElementById('currentPassword').value : null;
        const newPass = document.getElementById('encryptionPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        if (newPass.length < 8 || newPass !== confirmPass) {
            this.app.showToast('Passwords must match and be at least 8 characters long.', 'error');
            return;
        }

        if (isChanging) {
            const currentHash = this.app.data.settings.masterPasswordHash;
            const enteredHash = await cryptoModule.hash(currentPass);
            if (currentHash !== enteredHash) {
                this.app.showToast('The current password you entered is incorrect.', 'error');
                return;
            }
        }
        
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const newHash = await cryptoModule.hash(newPass);
        this.app.data.settings.masterPasswordHash = newHash;
        this.app.saveData();

        document.querySelector('.modal-overlay').remove();
        this.app.showToast('Master Password updated successfully!', 'success');
        this.app.loadPageContent('security'); // Refresh the page

    } catch (error) {
        console.error("Failed to save master password:", error);
        this.app.showToast(`An error occurred: ${error.message}`, 'error');
        
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Save';
        }
    }
}


  // Password Generator
  generatePassword() {
    const modal = this.createPasswordGeneratorModal();
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
    
    // Generate initial password
    this.generateNewPassword();
  }

  createPasswordGeneratorModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content password-generator">
        <div class="modal-header">
          <h3>Password Generator</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="password-display">
            <input type="text" id="generatedPassword" readonly>
            <div class="password-actions">
              <button class="btn btn--sm" onclick="securityModule.copyPassword()" title="Copy">
                <i class="fas fa-copy"></i>
              </button>
              <button class="btn btn--sm" onclick="securityModule.generateNewPassword()" title="Regenerate">
                <i class="fas fa-sync"></i>
              </button>
            </div>
          </div>
          
          <div class="password-options">
            <div class="option-group">
              <label>Length: <span id="lengthValue">12</span></label>
              <input type="range" id="passwordLength" min="6" max="32" value="12" onchange="document.getElementById('lengthValue').textContent = this.value; securityModule.generateNewPassword()">
            </div>
            
            <div class="checkbox-group">
              <label><input type="checkbox" id="includeUppercase" checked onchange="securityModule.generateNewPassword()"> Uppercase (A-Z)</label>
              <label><input type="checkbox" id="includeLowercase" checked onchange="securityModule.generateNewPassword()"> Lowercase (a-z)</label>
              <label><input type="checkbox" id="includeNumbers" checked onchange="securityModule.generateNewPassword()"> Numbers (0-9)</label>
              <label><input type="checkbox" id="includeSymbols" checked onchange="securityModule.generateNewPassword()"> Symbols (!@#$)</label>
            </div>
          </div>
          
          <div class="password-strength-meter">
            <div class="strength-label">Strength:</div>
            <div class="strength-bar">
              <div class="strength-fill" id="strengthFill"></div>
            </div>
            <div class="strength-text" id="strengthText">Strong</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          <button class="btn btn--primary" onclick="securityModule.copyPassword(); this.closest('.modal-overlay').remove();">Copy &amp; Close</button>
        </div>
      </div>
    `;

    return modal;
  }

  generateNewPassword() {
    const length = parseInt(document.getElementById('passwordLength').value);
    const includeUppercase = document.getElementById('includeUppercase').checked;
    const includeLowercase = document.getElementById('includeLowercase').checked;
    const includeNumbers = document.getElementById('includeNumbers').checked;
    const includeSymbols = document.getElementById('includeSymbols').checked;

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset === '') {
      charset = 'abcdefghijklmnopqrstuvwxyz';
    }

    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    document.getElementById('generatedPassword').value = password;
    this.updatePasswordStrength(password);
  }

  updatePasswordStrength(password) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthFill || !strengthText) return;

    let score = 0;
    
    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    const percentage = (score / 7) * 100;
    strengthFill.style.width = percentage + '%';

    if (score <= 2) {
      strengthFill.className = 'strength-fill weak';
      strengthText.textContent = 'Weak';
    } else if (score <= 4) {
      strengthFill.className = 'strength-fill moderate';
      strengthText.textContent = 'Moderate';
    } else {
      strengthFill.className = 'strength-fill strong';
      strengthText.textContent = 'Strong';
    }
  }

  async copyPassword() {
    const password = document.getElementById('generatedPassword').value;
    try {
      await navigator.clipboard.writeText(password);
      this.app.showToast('Password copied to clipboard', 'success');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = password;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.app.showToast('Password copied to clipboard', 'success');
    }
  }

  // Encryption/Decryption
  async encryptText(text, password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      // Generate a key from the password
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      // Generate a random salt
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );
      
      // Combine salt, iv, and encrypted data
      const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      result.set(salt);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      // Return as base64 string
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  async decryptText(encryptedText, password) {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Decode from base64
      const data = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)));
      
      // Extract salt, iv, and encrypted data
      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const encrypted = data.slice(28);
      
      // Generate key from password
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
      
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  // Security Dashboard
  showSecurityDashboard() {
    const modal = this.createSecurityDashboardModal();
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
  }

  createSecurityDashboardModal() {
    const encryptedCount = this.app.getEncryptedItemsCount();
    const hasPasscode = !!this.app.data.settings.passcode;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content security-dashboard">
        <div class="modal-header">
          <h3><i class="fas fa-shield-alt"></i> Security Dashboard</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="security-stats">
            <div class="security-stat">
              <div class="stat-icon ${hasPasscode ? 'secure' : 'warning'}">
                <i class="fas fa-${hasPasscode ? 'lock' : 'unlock'}"></i>
              </div>
              <div class="stat-content">
                <h4>App Lock</h4>
                <p>${hasPasscode ? 'Enabled' : 'Not Set'}</p>
              </div>
            </div>
            
            <div class="security-stat">
              <div class="stat-icon secure">
                <i class="fas fa-encrypt"></i>
              </div>
              <div class="stat-content">
                <h4>Encrypted Items</h4>
                <p>${encryptedCount} items</p>
              </div>
            </div>
            
            <div class="security-stat">
              <div class="stat-icon ${this.app.data.settings.autoLock ? 'secure' : 'warning'}">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-content">
                <h4>Auto-lock</h4>
                <p>${this.app.data.settings.autoLock ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>
          
          <div class="security-recommendations">
            <h4>Security Recommendations</h4>
            <div class="recommendations-list">
              ${!hasPasscode ? '<div class="recommendation warning"><i class="fas fa-exclamation-triangle"></i> Set up app passcode</div>' : ''}
              ${!this.app.data.settings.autoLock ? '<div class="recommendation warning"><i class="fas fa-info-circle"></i> Enable auto-lock for better security</div>' : ''}
              ${encryptedCount === 0 ? '<div class="recommendation info"><i class="fas fa-lightbulb"></i> Consider encrypting sensitive content</div>' : ''}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          <button class="btn btn--primary" onclick="this.closest('.modal-overlay').remove(); app.showPage('security')">Security Settings</button>
        </div>
      </div>
    `;

    return modal;
  }

  // Biometric authentication (placeholder for future implementation)
  async requestBiometricAuth() {
    // This would integrate with WebAuthn API for real biometric authentication
    this.app.showToast('Biometric authentication not available in demo', 'info');
    return false;
  }

  // Data integrity checks
  verifyDataIntegrity() {
    try {
      const dataStr = JSON.stringify(this.app.data);
      const hash = this.generateDataHash(dataStr);
      
      const storedHash = localStorage.getItem('shiroNotesDataHash');
      if (storedHash && storedHash !== hash) {
        this.app.showToast('Data integrity check failed', 'warning');
        return false;
      }
      
      localStorage.setItem('shiroNotesDataHash', hash);
      return true;
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return false;
    }
  }

  generateDataHash(data) {
    // Simple hash function for data integrity
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}

// Initialize security module
const securityModule = new SecurityModule(app);
window.securityModule = securityModule;

// Add security-related CSS
const securityStyles = `
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-normal);
}

.modal-overlay.visible {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  transform: scale(0.9) translateY(-20px);
  transition: transform var(--transition-normal);
}

.modal-overlay.visible .modal-content {
  transform: scale(1) translateY(0);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-card-border);
}

.modal-body {
  padding: var(--space-6);
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-card-border);
}

.passcode-input input {
  width: 100%;
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  font-size: var(--font-size-lg);
  text-align: center;
  letter-spacing: 2px;
}

.password-display {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.password-display input {
  flex: 1;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  font-family: monospace;
  background-color: var(--color-background);
}

.password-actions {
  display: flex;
  gap: var(--space-1);
}

.password-options {
  margin-bottom: var(--space-6);
}

.option-group {
  margin-bottom: var(--space-4);
}

.option-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: normal;
  cursor: pointer;
}

.password-strength-meter {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.strength-bar {
  flex: 1;
  height: 6px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width var(--transition-normal);
}

.strength-fill.weak {
  background-color: var(--color-error);
}

.strength-fill.moderate {
  background-color: var(--color-warning);
}

.strength-fill.strong {
  background-color: var(--color-success);
}

.strength-weak {
  color: var(--color-error);
}

.strength-strong {
  color: var(--color-success);
}

.security-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.security-stat {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-background);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}

.stat-icon.secure {
  background-color: var(--color-bg-3);
  color: var(--color-success);
}

.stat-icon.warning {
  background-color: var(--color-bg-4);
  color: var(--color-error);
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.recommendation {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
}

.recommendation.warning {
  background-color: rgba(var(--color-error-rgb, 239, 68, 68), 0.1);
  color: var(--color-error);
}

.recommendation.info {
  background-color: rgba(var(--color-teal-500-rgb, 33, 128, 141), 0.1);
  color: var(--color-primary);
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = securityStyles;
document.head.appendChild(styleSheet);
