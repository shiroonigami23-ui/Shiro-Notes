// =================================================================
// CRYPTOGRAPHY UTILITIES
// =================================================================
const SALT = "shiro-notes-unique-salt-value";
const KEY_SIZE = 256 / 32;
const ITERATIONS = 1000;

function hashPassword(password) {
    const key = CryptoJS.PBKDF2(password, SALT, {
        keySize: KEY_SIZE,
        iterations: ITERATIONS
    });
    return key.toString();
}

function encryptData(text, password) {
    if (text === null || text === undefined) text = '';
    return CryptoJS.AES.encrypt(text, password).toString();
}

function decryptData(ciphertext, password) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, password);
    try {
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    } catch (e) {
        console.error("Decryption failed:", e);
        return null;
    }
}
