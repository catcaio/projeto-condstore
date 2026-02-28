import crypto from 'crypto';

/**
 * Derives a 32-byte master key from the environment variable SECRETS_MASTER_KEY.
 * The environment variable should ideally be a 32-byte hex string (64 characters)
 * or a 32-byte base64 string.
 * If shorter, it derives a SHA-256 hash to ensure 32 bytes length.
 */
function getMasterKeyBuffer(): Buffer {
    const envKey = process.env.SECRETS_MASTER_KEY;
    if (!envKey) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SECRETS_MASTER_KEY is required in production');
        }
        // Fallback solely for local/test dev without breaking configs if missing.
        return crypto.createHash('sha256').update('local_dev_fallback_secret_must_not_use_in_prod').digest();
    }

    // If it's pure hex of length 64, it's 32 bytes
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
        return Buffer.from(envKey, 'hex');
    }

    // Otherwise, hash it to ensure 32 bytes
    return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Assumes envelope encryption at rest. Never logs output.
 * @param plaintext The secret to encrypt
 * @returns The encrypted string (base64 encoded ivory + authTag + ciphertext)
 */
export function encryptSecret(plaintext: string): string {
    if (!plaintext) return '';
    const key = getMasterKeyBuffer();
    // 12 bytes IV is standard for GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag().toString('base64');
    const encodedIv = iv.toString('base64');

    // Return format: iv:authTag:encrypted payload
    return `${encodedIv}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted secret string.
 * @param encryptedString The composed encrypted string (iv:authTag:payload)
 * @returns The decrypted plaintext
 */
export function decryptSecret(encryptedString: string): string {
    if (!encryptedString) return '';

    const key = getMasterKeyBuffer();
    const parts = encryptedString.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted secret format');
    }

    const [encodedIv, encodedAuthTag, ciphertext] = parts;

    if (!encodedIv || !encodedAuthTag || !ciphertext) {
        throw new Error('Invalid encrypted secret format parts');
    }

    const iv = Buffer.from(encodedIv, 'base64');
    const authTag = Buffer.from(encodedAuthTag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
