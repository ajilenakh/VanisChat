export { deriveKey } from "./derive-key";
export { encrypt } from "./encrypt";
export { decrypt } from "./decrypt";
export { arrayBufferToBase64, base64ToArrayBuffer } from "./utils";

/**
 * Generate 16 random bytes for use as a PBKDF2 salt.
 * Use a fresh salt per room (stored in room metadata, not secret).
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
