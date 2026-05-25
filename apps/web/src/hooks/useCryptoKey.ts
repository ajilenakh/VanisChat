import { deriveKey } from '@vanischat/crypto';
import { useMemo } from 'react';

/**
 * Derive an AES-GCM key from a password and salt.
 * Memoized — only re-derives when password or salt changes.
 */
export function useCryptoKey(password: string, salt: string) {
  return useMemo(() => {
    if (!password || !salt) return null;

    const saltBytes = new Uint8Array(
      salt.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)),
    );

    let key: CryptoKey | null = null;
    const promise = deriveKey(password, saltBytes).then((k) => {
      key = k;
      return k;
    });

    return {
      key,
      promise,
      ready: key !== null,
    };
  }, [password, salt]);
}
