import { describe, it, expect } from "vitest";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../utils";

describe("base64 utils", () => {
  it("arrayBufferToBase64 converts an ArrayBuffer to a base64 string", () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
    const result = arrayBufferToBase64(input);
    expect(result).toBe("SGVsbG8=");
  });

  it("base64ToArrayBuffer converts a base64 string back to ArrayBuffer", () => {
    const result = base64ToArrayBuffer("SGVsbG8=");
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("round-trip produces the same data", () => {
    const original = new Uint8Array([255, 0, 128, 64, 32, 16, 8, 4, 2, 1])
      .buffer;
    const b64 = arrayBufferToBase64(original);
    const decoded = base64ToArrayBuffer(b64);
    expect(new Uint8Array(decoded)).toEqual(new Uint8Array(original));
  });

  it("handles empty buffer", () => {
    const input = new Uint8Array([]).buffer;
    const result = arrayBufferToBase64(input);
    expect(result).toBe("");
    const decoded = base64ToArrayBuffer(result);
    expect(decoded.byteLength).toBe(0);
  });
});
