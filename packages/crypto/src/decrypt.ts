import { base64ToArrayBuffer } from "./utils";

/**
 * Decrypt an AES-GCM encrypted payload using the given key.
 * Takes the base64 ciphertext and IV returned by encrypt().
 * Throws if the key is wrong or data was tampered with.
 */
export async function decrypt(
  payload: { ciphertext: string; iv: string },
  key: CryptoKey,
): Promise<string> {
  const { ciphertext, iv } = payload;
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}
