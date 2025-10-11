// =================================================================
// CRYPTOGRAPHY UTILITIES
// =================================================================
// These functions are now globally available for other scripts to use.

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
