import { decrypt, deriveKey, hexToUint8Array } from '@vanischat/crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCryptoKeyResult {
  key: CryptoKey | null;
  ready: boolean;
  decryptMessage: (content: string, iv: string) => Promise<string | null>;
}

export function useCryptoKey(password: string | null, salt: string | null): UseCryptoKeyResult {
  const keyRef = useRef<CryptoKey | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!password || !salt) {
      keyRef.current = null;
      forceUpdate((n) => n + 1);
      return;
    }

    const saltBytes = hexToUint8Array(salt);
    let cancelled = false;
    deriveKey(password, saltBytes).then((k) => {
      if (!cancelled) {
        keyRef.current = k;
        forceUpdate((n) => n + 1);
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

  return { key: keyRef.current, ready: keyRef.current !== null, decryptMessage };
}
