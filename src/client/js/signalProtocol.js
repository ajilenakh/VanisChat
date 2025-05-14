// Signal Protocol Implementation
export async function initializeSignalProtocol(bundle = null) {
    try {
        if (!bundle) {
            // For room creator, generate new keys
            const identityKeyPair = await generateKeyPair();
            const registrationId = Math.floor(Math.random() * 16384);
            const preKeys = await generatePreKeys(10);
            const signedPreKey = await generateSignedPreKey(identityKeyPair.privateKey);

            return {
                identityKey: await exportKeyToBase64(identityKeyPair.publicKey),
                registrationId,
                preKeys: await Promise.all(preKeys.map(async (key) => ({
                    keyId: key.keyId,
                    publicKey: await exportKeyToBase64(key.publicKey),
                }))),
                signedPreKey: {
                    keyId: signedPreKey.keyId,
                    publicKey: await exportKeyToBase64(signedPreKey.publicKey),
                    signature: signedPreKey.signature,
                },
            };
        }

        // For joining participants, use the provided bundle
        return {
            identityKey: bundle.identityKey,
            registrationId: bundle.registrationId,
            preKeys: bundle.preKeys,
            signedPreKey: bundle.signedPreKey,
        };
    } catch (error) {
        console.error('Error initializing Signal Protocol:', error);
        return null;
    }
}

async function generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits']
    );
    return keyPair;
}

async function generatePreKeys(count) {
    const preKeys = [];
    for (let i = 0; i < count; i++) {
        const keyPair = await generateKeyPair();
        preKeys.push({
            keyId: i,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
        });
    }
    return preKeys;
}

async function generateSignedPreKey(identityPrivateKey) {
    const keyPair = await generateKeyPair();
    const signature = await signKey(identityPrivateKey, keyPair.publicKey);
    return {
        keyId: 0,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        signature: new Uint8Array(signature),
    };
}

async function signKey(privateKey, publicKey) {
    const signature = await window.crypto.subtle.sign(
        {
            name: 'ECDSA',
            hash: { name: 'SHA-256' },
        },
        privateKey,
        await window.crypto.subtle.exportKey('raw', publicKey)
    );
    return signature;
}

async function exportKeyToBase64(key) {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function encryptMessage(message, session) {
    // For now, just return the message as is
    return message;
}

export async function decryptMessage(message, session) {
    // For now, just return the message as is
    return message;
} 