import { describe, it, expect } from "vitest";
import { deriveKey, encrypt, decrypt, generateSalt } from "../index";

describe("crypto full flow", () => {
  it("generateSalt produces 16 random bytes", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it("generateSalt produces different values each call", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toEqual(salt2);
  });

  it("encrypt and decrypt round-trip successfully", async () => {
    const salt = generateSalt();
    const key = await deriveKey("my-password", salt);
    const plaintext = "Hello, encrypted world!";
    const { ciphertext, iv } = await encrypt(plaintext, key);
    const decrypted = await decrypt({ ciphertext, iv }, key);
    expect(decrypted).toBe(plaintext);
  });

  it("same password + salt produces same key (deterministic derivation)", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("password", salt);
    const key2 = await deriveKey("password", salt);
    // Both keys should successfully encrypt and decrypt the same message
    const { ciphertext, iv } = await encrypt("consistent", key1);
    const decrypted = await decrypt({ ciphertext, iv }, key2);
    expect(decrypted).toBe("consistent");
  });

  it("different password produces different ciphertext", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("alpha", salt);
    const key2 = await deriveKey("beta", salt);
    const { ciphertext: c1 } = await encrypt("secret", key1);
    const { ciphertext: c2 } = await encrypt("secret", key2);
    expect(c1).not.toBe(c2);
  });

  it("decrypt with wrong key throws OperationError", async () => {
    const salt = generateSalt();
    const correctKey = await deriveKey("correct", salt);
    const wrongKey = await deriveKey("wrong", salt);
    const { ciphertext, iv } = await encrypt("protected", correctKey);
    await expect(decrypt({ ciphertext, iv }, wrongKey)).rejects.toThrow();
  });

  it("decrypt with tampered ciphertext throws OperationError", async () => {
    const salt = generateSalt();
    const key = await deriveKey("safe", salt);
    const { ciphertext, iv } = await encrypt("tamper me", key);
    // Corrupt the ciphertext
    const chars = ciphertext.split("");
    chars[0] = chars[0] === "a" ? "b" : "a";
    const tampered = chars.join("");
    await expect(decrypt({ ciphertext: tampered, iv }, key)).rejects.toThrow();
  });

  it("encrypt produces different ciphertext each time (different IV)", async () => {
    const salt = generateSalt();
    const key = await deriveKey("unique", salt);
    const { ciphertext: c1 } = await encrypt("same message", key);
    const { ciphertext: c2 } = await encrypt("same message", key);
    expect(c1).not.toBe(c2); // IV randomization → different output
  });
});
