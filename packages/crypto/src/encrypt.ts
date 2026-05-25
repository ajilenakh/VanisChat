import { arrayBufferToBase64 } from "./utils";

/**
 * Encrypt a plaintext string using AES-GCM with the given key.
 * Returns base64-encoded ciphertext and IV (both needed for decryption).
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}
