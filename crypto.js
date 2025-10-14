// Cryptography Module for Shiro Notes
class CryptoModule {
  constructor(app) {
    this.app = app;
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  // Enhanced AES-256-GCM encryption
  async encrypt(plaintext, password, metadata = {}) {
    try {
      // Generate salt for PBKDF2
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      // Generate IV for AES-GCM
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Import password as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        this.encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive encryption key using PBKDF2
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
      
      // Prepare data to encrypt
      const data = {
        content: plaintext,
        metadata: metadata,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      const encodedData = this.encoder.encode(JSON.stringify(data));
      
      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      );
      
      // Combine salt, iv, and encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
      
      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
      
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Enhanced AES-256-GCM decryption
  async decrypt(encryptedData, password) {
    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(c => c.charCodeAt(0))
      );
      
      // Extract components
      const salt = combined.slice(0, 32);
      const iv = combined.slice(32, 44);
      const encrypted = combined.slice(44);
      
      // Import password as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        this.encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive decryption key
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
      
      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
      
      // Parse decrypted JSON
      const decodedData = this.decoder.decode(decryptedData);
      const parsedData = JSON.parse(decodedData);
      
      return parsedData.content;
      
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  // Hash function for passwords and checksums
  async hash(data, algorithm = 'SHA-256') {
    try {
      const encoded = this.encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest(algorithm, encoded);
      const hashArray = new Uint8Array(hashBuffer);
      return btoa(String.fromCharCode(...hashArray));
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }

  // Generate cryptographically secure random password
  generateSecurePassword(length = 16, options = {}) {
    const defaults = {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeSimilar: true
    };
    
    const settings = { ...defaults, ...options };
    
    let charset = '';
    if (settings.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (settings.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (settings.numbers) charset += '0123456789';
    if (settings.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Remove similar looking characters if requested
    if (settings.excludeSimilar) {
      charset = charset.replace(/[0O1lI]/g, '');
    }
    
    if (charset === '') {
      throw new Error('No character types selected for password generation');
    }
    
    // Generate cryptographically secure random password
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }

  // Key stretching for passwords
  async stretchKey(password, salt, iterations = 100000) {
    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        this.encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      
      const bits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      
      return new Uint8Array(bits);
    } catch (error) {
      console.error('Key stretching error:', error);
      throw new Error('Failed to stretch key');
    }
  }

  // Digital signature creation
  async createSignature(data, privateKey) {
    try {
      const encodedData = this.encoder.encode(data);
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        encodedData
      );
      return btoa(String.fromCharCode(...new Uint8Array(signature)));
    } catch (error) {
      console.error('Signature creation error:', error);
      throw new Error('Failed to create digital signature');
    }
  }

  // Digital signature verification
  async verifySignature(data, signature, publicKey) {
    try {
      const encodedData = this.encoder.encode(data);
      const signatureBuffer = new Uint8Array(
        atob(signature).split('').map(c => c.charCodeAt(0))
      );
      
      return await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        publicKey,
        signatureBuffer,
        encodedData
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  // Generate RSA key pair
  async generateKeyPair() {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['sign', 'verify']
      );
      
      return keyPair;
    } catch (error) {
      console.error('Key pair generation error:', error);
      throw new Error('Failed to generate key pair');
    }
  }

  // Export key to base64
  async exportKey(key, format = 'spki') {
    try {
      const exported = await crypto.subtle.exportKey(format, key);
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } catch (error) {
      console.error('Key export error:', error);
      throw new Error('Failed to export key');
    }
  }

  // Import key from base64
  async importKey(keyData, format = 'spki', algorithm = 'RSASSA-PKCS1-v1_5', usages = ['verify']) {
    try {
      const keyBuffer = new Uint8Array(
        atob(keyData).split('').map(c => c.charCodeAt(0))
      );
      
      const key = await crypto.subtle.importKey(
        format,
        keyBuffer,
        {
          name: algorithm,
          hash: 'SHA-256'
        },
        false,
        usages
      );
      
      return key;
    } catch (error) {
      console.error('Key import error:', error);
      throw new Error('Failed to import key');
    }
  }

  // Secure random number generation
  generateSecureRandom(min = 0, max = 1000000) {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValidValue = Math.floor(256 ** bytesNeeded / range) * range - 1;
    
    let randomValue;
    do {
      const randomBytes = crypto.getRandomValues(new Uint8Array(bytesNeeded));
      randomValue = randomBytes.reduce((acc, byte, index) => acc + byte * (256 ** index), 0);
    } while (randomValue > maxValidValue);
    
    return min + (randomValue % range);
  }

  // Generate UUID v4
  generateUUID() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Set version (4) and variant bits
    array[6] = (array[6] & 0x0f) | 0x40;
    array[8] = (array[8] & 0x3f) | 0x80;
    
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Encrypt item (note/book)
  async encryptItem(item, password) {
    try {
      // Create backup of original content
      const originalContent = item.content;
      const metadata = {
        type: item.type || 'text',
        encrypted: true,
        encryptionVersion: '1.0'
      };
      
      // Encrypt the content
      const encryptedContent = await this.encrypt(originalContent, password, metadata);
      
      // Update item
      item.content = encryptedContent;
      item.encrypted = true;
      item.lastModified = new Date().toISOString();
      
      return true;
    } catch (error) {
      console.error('Item encryption error:', error);
      throw error;
    }
  }

  // Decrypt item
  async decryptItem(item, password) {
    try {
      if (!item.encrypted) {
        throw new Error('Item is not encrypted');
      }
      
      // Decrypt the content
      const decryptedContent = await this.decrypt(item.content, password);
      
      // Update item
      item.content = decryptedContent;
      item.encrypted = false;
      item.lastModified = new Date().toISOString();
      
      return true;
    } catch (error) {
      console.error('Item decryption error:', error);
      throw error;
    }
  }

showEncryptionDialog(itemId, itemType) {
    // First, check if a master password is even set.
    if (!this.app.data.settings.masterPasswordHash) {
        this.app.showToast('Please set a Master Password in Security settings before encrypting items.', 'error');
        this.app.showPage('security');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content encryption-dialog">
        <div class="modal-header">
          <h3><i class="fas fa-lock"></i> Encrypt ${itemType}</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="encryption-info">
            <p>This ${itemType} will be encrypted using your Master Password. Please enter it to confirm.</p>
          </div>
          
          <div class="form-group">
            <label>Master Password</label>
            <div class="password-input-group">
              <input type="password" id="encryptionMasterPassword" placeholder="Enter your Master Password">
              <button type="button" class="password-toggle" onclick="cryptoModule.togglePasswordVisibility('encryptionMasterPassword')">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          
          <div class="warning-box">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
              <strong>Remember:</strong> Only your Master Password can decrypt this item.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn--primary" onclick="cryptoModule.performEncryption('${itemId}', '${itemType}')" id="encryptBtn">
            <i class="fas fa-lock"></i> Encrypt ${itemType}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
    
    // Focus on password input
    setTimeout(() => {
        const passInput = document.getElementById('encryptionMasterPassword');
        if(passInput) passInput.focus();
    }, 100);
}


  setupEncryptionValidation() {
    const passwordInput = document.getElementById('encryptionPassword');
    const confirmInput = document.getElementById('confirmPassword');
    const encryptBtn = document.getElementById('encryptBtn');
    
    // If any of the required elements don't exist, exit gracefully.
    if (!passwordInput || !confirmInput || !encryptBtn) {
        return;
    }

    const validateForm = () => {
      const password = passwordInput.value;
      const confirm = confirmInput.value;
      
      this.updatePasswordStrength(password);
      this.updatePasswordMatch(password, confirm);
      
      const isValid = password.length >= 8 && password === confirm;
      encryptBtn.disabled = !isValid;
    };
    
    passwordInput.addEventListener('input', validateForm);
    confirmInput.addEventListener('input', validateForm);

    // Run once on setup to set initial button state
    validateForm();
  }


  updatePasswordStrength(password) {
    const strengthEl = document.getElementById('passwordStrength');
    if (!strengthEl) return; // <-- THIS IS THE FIX!
    
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    if (password.length >= 12) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');
    
    // Update UI
    let className = 'strength-weak';
    let text = 'Weak';
    
    if (score >= 4) {
      className = 'strength-moderate';
      text = 'Moderate';
    }
    
    if (score >= 6) {
      className = 'strength-strong';
      text = 'Strong';
    }
    
    strengthEl.className = `password-strength ${className}`;
    strengthEl.innerHTML = `
      <div class="strength-bar">
        <div class="strength-fill" style="width: ${(score / 6) * 100}%"></div>
      </div>
      <div class="strength-text">${text}</div>
      ${feedback.length > 0 ? `<div class="strength-feedback">${feedback.join(', ')}</div>` : ''}
    `;
  }


  updatePasswordMatch(password, confirm) {
    const matchEl = document.getElementById('passwordMatch');
    if (!matchEl || !confirm) {
      if (matchEl) matchEl.textContent = '';
      return;
    }
    
    if (password === confirm) {
      matchEl.className = 'password-match success';
      matchEl.innerHTML = '<i class="fas fa-check"></i> Passwords match';
    } else {
      matchEl.className = 'password-match error';
      matchEl.innerHTML = '<i class="fas fa-times"></i> Passwords do not match';
    }
  }

  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  }


async performEncryption(itemId, itemType) {
    const password = document.getElementById('encryptionMasterPassword').value;
    const encryptBtn = document.getElementById('encryptBtn');

    if (!password) {
        this.app.showToast('Please enter your Master Password.', 'warning');
        return;
    }
    
    try {
        // Show loading
        encryptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Encrypting...';
        encryptBtn.disabled = true;

        // Verify the entered Master Password is correct
        const enteredHash = await this.hash(password);
        if (enteredHash !== this.app.data.settings.masterPasswordHash) {
            this.app.showToast('Incorrect Master Password.', 'error');
            encryptBtn.innerHTML = `<i class="fas fa-lock"></i> Encrypt ${itemType}`;
            encryptBtn.disabled = false;
            return;
        }
      
        // Find the item
        let item = itemType === 'book'
            ? this.app.data.books.find(b => b.id === itemId)
            : this.app.data.notes.find(n => n.id === itemId);
      
        if (!item) throw new Error('Item not found');
      
        // Encrypt the item using the verified Master Password
        await this.encryptItem(item, password);
      
        // Clear any old password hints from the previous system
        delete item.passwordHint;
      
        // Save data and refresh the UI
        this.app.saveData();
        this.app.loadPageContent(this.app.currentPage);
        this.app.updateStats();
      
        // Close modal
        document.querySelector('.modal-overlay').remove();
        this.app.showToast(`${itemType} encrypted successfully`, 'success');
      
    } catch (error) {
        console.error('Encryption error:', error);
        this.app.showToast('Encryption failed: ' + error.message, 'error');
        encryptBtn.innerHTML = `<i class="fas fa-lock"></i> Encrypt ${itemType}`;
        encryptBtn.disabled = false;
    }
}


  // Show decryption dialog
  showDecryptionDialog(itemId, itemType) {
    const item = itemType === 'book' ? 
      this.app.data.books.find(b => b.id === itemId) :
      this.app.data.notes.find(n => n.id === itemId);
    
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content decryption-dialog">
        <div class="modal-header">
          <h3><i class="fas fa-unlock"></i> Decrypt ${itemType}</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="item-info">
            <h4>${this.app.escapeHtml(item.title)}</h4>
            <p>Enter the password to decrypt this ${itemType}.</p>
            ${item.passwordHint ? `<div class="password-hint"><strong>Hint:</strong> ${this.app.escapeHtml(item.passwordHint)}</div>` : ''}
          </div>
          
          <div class="form-group">
            <label>Decryption Password</label>
            <div class="password-input-group">
              <input type="password" id="decryptionPassword" placeholder="Enter password">
              <button type="button" class="password-toggle" onclick="cryptoModule.togglePasswordVisibility('decryptionPassword')">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          
          <div class="decryption-error hidden" id="decryptionError">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Incorrect password or corrupted data</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn--primary" onclick="cryptoModule.performDecryption('${itemId}', '${itemType}')">
            <i class="fas fa-unlock"></i> Decrypt ${itemType}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
    
    // Focus on password input
    setTimeout(() => document.getElementById('decryptionPassword').focus(), 100);
    
    // Handle Enter key
    document.getElementById('decryptionPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.performDecryption(itemId, itemType);
      }
    });
  }

  // In crypto.js

// --- REPLACE your old performDecryption function with this one ---
async performDecryption(itemId, itemType) {
    const password = document.getElementById('decryptionPassword').value;
    const errorEl = document.getElementById('decryptionError');
    const decryptBtn = document.querySelector('.decryption-dialog .btn--primary');
    
    if (!password) {
      this.app.showToast('Please enter your Master Password', 'warning');
      return;
    }
    
    // Show loading UI
    decryptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    decryptBtn.disabled = true;
    if (errorEl) errorEl.classList.add('hidden');
    
    try {
      // Step 1: Verify the entered password against the stored Master Password hash
      const enteredHash = await this.hash(password);
      if (enteredHash !== this.app.data.settings.masterPasswordHash) {
        throw new Error('Incorrect Master Password');
      }

      // Step 2: Find the item in your app's data
      const item = itemType === 'book'
        ? this.app.data.books.find(b => b.id === itemId)
        : this.app.data.notes.find(n => n.id === itemId);
      
      if (!item) throw new Error('Item not found');
      
      // Step 3: Decrypt the item's content in memory for this session
      await this.decryptItem(item, password);
      
      // Close the decryption dialog
      document.querySelector('.modal-overlay').remove();
      this.app.showToast(`${itemType} decrypted for this session!`, 'success');
      
      // Step 4 (THE FIX): Directly open the editor with the decrypted content.
      // We no longer call app.openNote() which caused the loop.
      if (itemType === 'book') {
        editorModule.editBook(itemId);
      } else {
        editorModule.editNote(itemId);
      }
      
    } catch (error) {
      console.error('Decryption error:', error);
      
      // Show a more helpful error message on the screen
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.querySelector('span').textContent = error.message;
      }
      
      // Reset the button and password field
      decryptBtn.innerHTML = `<i class="fas fa-unlock"></i> Decrypt ${itemType}`;
      decryptBtn.disabled = false;
      const passInput = document.getElementById('decryptionPassword');
      passInput.value = '';
      passInput.focus();
    }
  }



  // Secure message encryption
  async createSecureMessage(message, recipients = []) {
    try {
      // Generate a unique message ID
      const messageId = this.generateUUID();
      
      // Generate a random password for this message
      const messagePassword = this.generateSecurePassword(32);
      
      // Encrypt the message
      const encryptedMessage = await this.encrypt(message, messagePassword, {
        messageId: messageId,
        created: new Date().toISOString(),
        recipients: recipients
      });
      
      // Create shareable link data
      const linkData = {
        id: messageId,
        encrypted: encryptedMessage,
        created: new Date().toISOString(),
        expiresIn: '24h' // Default expiration
      };
      
      // Generate sharing hash
      const shareHash = await this.hash(messagePassword + messageId);
      
      return {
        messageId: messageId,
        shareLink: `#message/${shareHash}`,
        password: messagePassword,
        data: linkData
      };
      
    } catch (error) {
      console.error('Secure message creation error:', error);
      throw error;
    }
  }

  // Data integrity verification
  async verifyDataIntegrity() {
    try {
      const dataString = JSON.stringify(this.app.data);
      const currentHash = await this.hash(dataString);
      
      const storedHash = localStorage.getItem('shiroNotesDataHash');
      
      if (storedHash && storedHash !== currentHash) {
        console.warn('Data integrity check failed - data may have been tampered with');
        return false;
      }
      
      // Update stored hash
      localStorage.setItem('shiroNotesDataHash', currentHash);
      return true;
      
    } catch (error) {
      console.error('Data integrity verification error:', error);
      return false;
    }
  }

  // Secure data export
  async exportSecureBackup(password) {
    try {
      const backupData = {
        version: '1.0',
        exported: new Date().toISOString(),
        data: this.app.data
      };
      
      const encryptedBackup = await this.encrypt(JSON.stringify(backupData), password);
      
      return {
        encrypted: encryptedBackup,
        checksum: await this.hash(encryptedBackup)
      };
      
    } catch (error) {
      console.error('Secure backup export error:', error);
      throw error;
    }
  }

  // Secure data import
  async importSecureBackup(encryptedData, password, checksum) {
    try {
      // Verify checksum
      const calculatedChecksum = await this.hash(encryptedData);
      if (checksum && checksum !== calculatedChecksum) {
        throw new Error('Backup data integrity check failed');
      }
      
      // Decrypt backup
      const decryptedData = await this.decrypt(encryptedData, password);
      const backupData = JSON.parse(decryptedData);
      
      // Validate backup structure
      if (!backupData.version || !backupData.data) {
        throw new Error('Invalid backup format');
      }
      
      return backupData.data;
      
    } catch (error) {
      console.error('Secure backup import error:', error);
      throw error;
    }
  }
}

// Initialize crypto module
const cryptoModule = new CryptoModule(app);
window.cryptoModule = cryptoModule;

// Add crypto-specific styles
const cryptoStyles = `
.encryption-dialog,
.decryption-dialog {
  max-width: 500px;
}

.encryption-info {
  margin-bottom: var(--space-6);
}

.info-box {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-bg-1);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--color-primary);
}

.info-box i {
  color: var(--color-primary);
  font-size: var(--font-size-lg);
  margin-top: var(--space-1);
}

.info-box h4 {
  margin: 0 0 var(--space-1) 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.info-box p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.password-input-group {
  position: relative;
  display: flex;
}

.password-input-group input {
  flex: 1;
  padding-right: var(--space-10);
}

.password-toggle {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
}

.password-toggle:hover {
  color: var(--color-text);
  background-color: var(--color-secondary);
}

.password-strength {
  margin-top: var(--space-2);
}

.strength-bar {
  height: 4px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-2);
}

.strength-fill {
  height: 100%;
  transition: width var(--transition-normal);
}

.strength-weak .strength-fill {
  background-color: var(--color-error);
}

.strength-moderate .strength-fill {
  background-color: var(--color-warning);
}

.strength-strong .strength-fill {
  background-color: var(--color-success);
}

.strength-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.strength-weak .strength-text {
  color: var(--color-error);
}

.strength-moderate .strength-text {
  color: var(--color-warning);
}

.strength-strong .strength-text {
  color: var(--color-success);
}

.strength-feedback {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.password-match {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.password-match.success {
  color: var(--color-success);
}

.password-match.error {
  color: var(--color-error);
}

.encryption-options {
  margin: var(--space-4) 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.warning-box {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: rgba(var(--color-warning-rgb, 168, 75, 47), 0.1);
  border: 1px solid rgba(var(--color-warning-rgb, 168, 75, 47), 0.3);
  border-radius: var(--radius-lg);
  margin-top: var(--space-4);
}

.warning-box i {
  color: var(--color-warning);
  font-size: var(--font-size-lg);
  margin-top: var(--space-1);
}

.item-info {
  margin-bottom: var(--space-6);
}

.item-info h4 {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-lg);
}

.password-hint {
  background-color: var(--color-bg-2);
  padding: var(--space-3);
  border-radius: var(--radius-base);
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
}

.decryption-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background-color: rgba(var(--color-error-rgb, 192, 21, 47), 0.1);
  border: 1px solid rgba(var(--color-error-rgb, 192, 21, 47), 0.3);
  border-radius: var(--radius-base);
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--space-4);
}

.decryption-error i {
  color: var(--color-error);
}

/* Hidden class */
.hidden {
  display: none;
}
`;

// Inject crypto styles
const cryptoStyleSheet = document.createElement('style');
cryptoStyleSheet.textContent = cryptoStyles;
document.head.appendChild(cryptoStyleSheet);
