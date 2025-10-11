// =================================================================
// CRYPTOGRAPHY UTILITIES
// =================================================================

const SALT = "shiro-notes-unique-salt-value";
const KEY_SIZE = 256 / 32;
const ITERATIONS = 1000;

// PBKDF2 Hashing for the master password (unchanged)
function hashPassword(password) {
    const key = CryptoJS.PBDF2(password, SALT, {
        keySize: KEY_SIZE,
        iterations: ITERATIONS
    });
    return key.toString();
}

// [NEW] AES Encryption function
// This takes plain text and a password, and returns an encrypted string.
function encryptData(text, password) {
    if (text === null || text === undefined) text = '';
    return CryptoJS.AES.encrypt(text, password).toString();
}

// [NEW] AES Decryption function
// This takes an encrypted string and a password, and returns the original plain text.
function decryptData(ciphertext, password) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, password);
    try {
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    } catch (e) {
        console.error("Decryption failed:", e);
        return null; // Return null if decryption fails (e.g., wrong password)
    }
}
