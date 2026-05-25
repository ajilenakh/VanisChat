import { decrypt, deriveKey } from '@vanischat/crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCryptoKeyResult {
  key: CryptoKey | null;
  ready: boolean;
  decryptMessage: (content: string, iv: string) => Promise<string | null>;
}

/**
 * Derive an AES-GCM key from a password and salt.
 * Returns a memoized decrypt callback once the key is ready.
 */
export function useCryptoKey(password: string | null, salt: string | null): UseCryptoKeyResult {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    if (!password || !salt) {
      setKey(null);
      keyRef.current = null;
      return;
    }

    const saltBytes = new Uint8Array(
      salt.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)),
    );

    let cancelled = false;
    deriveKey(password, saltBytes).then((k) => {
      if (!cancelled) {
        setKey(k);
        keyRef.current = k;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [password, salt]);

  const decryptMessage = useCallback(
    async (content: string, iv: string): Promise<string | null> => {
      const k = keyRef.current;
      if (!k) return null;
      try {
        return await decrypt({ ciphertext: content, iv }, k);
      } catch {
        return null;
      }
    },
    [],
  );

  return { key, ready: key !== null, decryptMessage };
}
