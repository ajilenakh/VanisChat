/**
 * Convert an ArrayBuffer to a base64-encoded string.
 * Uses browser/Web Crypto API-compatible approach.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert a base64-encoded string back to an ArrayBuffer.
 */
/**
 * Convert a hex-encoded string to a Uint8Array.
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) throw new Error('Invalid hex string');
  return new Uint8Array(match.map((byte) => Number.parseInt(byte, 16)));
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}
