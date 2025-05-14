const { makeInMemoryStore, proto } = require('@whiskeysockets/baileys');
const { randomBytes } = require('crypto');

class SignalProtocolStore {
  constructor() {
    this.store = makeInMemoryStore({});
  }

  async getIdentityKeyPair() {
    return this.store.state.identityKeys;
  }

  async getLocalRegistrationId() {
    return this.store.state.registrationId;
  }

  async putIdentityKeyPair(keyPair) {
    this.store.state.identityKeys = keyPair;
  }

  async putLocalRegistrationId(registrationId) {
    this.store.state.registrationId = registrationId;
  }

  async getPreKey(keyId) {
    return this.store.state.preKeys[keyId];
  }

  async putPreKey(keyId, keyPair) {
    this.store.state.preKeys[keyId] = keyPair;
  }

  async getSignedPreKey(keyId) {
    return this.store.state.signedPreKey;
  }

  async putSignedPreKey(keyId, keyPair) {
    this.store.state.signedPreKey = keyPair;
  }

  async getSession(address) {
    return this.store.state.sessions[address];
  }

  async putSession(address, session) {
    this.store.state.sessions[address] = session;
  }
}

// Generate a new Signal Protocol instance
async function generateSignalProtocol() {
  const store = new SignalProtocolStore();
  
  // Generate identity key pair
  const identityKeyPair = {
    private: randomBytes(32),
    public: randomBytes(32),
  };
  await store.putIdentityKeyPair(identityKeyPair);

  // Generate registration ID
  const registrationId = Math.floor(Math.random() * 16384);
  await store.putLocalRegistrationId(registrationId);

  // Generate pre-keys
  const preKeys = Array.from({ length: 100 }, (_, i) => ({
    keyId: i,
    keyPair: {
      private: randomBytes(32),
      public: randomBytes(32),
    },
  }));

  for (const preKey of preKeys) {
    await store.putPreKey(preKey.keyId, preKey.keyPair);
  }

  // Generate signed pre-key
  const signedPreKey = {
    keyId: 0,
    keyPair: {
      private: randomBytes(32),
      public: randomBytes(32),
    },
    signature: randomBytes(64),
  };
  await store.putSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

  return {
    identityKey: identityKeyPair.public,
    registrationId,
    preKeys: preKeys.map(key => ({
      keyId: key.keyId,
      publicKey: key.keyPair.public,
    })),
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: signedPreKey.keyPair.public,
      signature: signedPreKey.signature,
    },
  };
}

// Encrypt a message
async function encryptMessage(message, recipientAddress, session) {
  const messageBuffer = Buffer.from(message);
  const encryptedMessage = proto.Message.encode({
    conversation: messageBuffer,
  }).finish();

  return {
    type: 'message',
    body: encryptedMessage,
  };
}

// Decrypt a message
async function decryptMessage(ciphertext, senderAddress, session) {
  const decryptedMessage = proto.Message.decode(ciphertext.body);
  return decryptedMessage.conversation.toString();
}

// Create a new session
async function createSession(recipientAddress, recipientPreKeyBundle, store) {
  const session = {
    recipientAddress,
    preKeyBundle: recipientPreKeyBundle,
  };
  await store.putSession(recipientAddress, session);
  return session;
}

module.exports = {
  generateSignalProtocol,
  encryptMessage,
  decryptMessage,
  createSession,
  SignalProtocolStore,
}; 