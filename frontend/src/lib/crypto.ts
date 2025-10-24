import nacl from "tweetnacl";

// === Key management ===
export function getOrCreateX25519(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  const existing = localStorage.getItem("we3_x25519");
  if (existing) {
    try {
      const { pub, sec } = JSON.parse(existing);
      return { 
        publicKey: new Uint8Array(pub), 
        secretKey: new Uint8Array(sec) 
      };
    } catch (error) {
      console.warn("Failed to parse stored keys, generating new ones:", error);
    }
  }
  
  const kp = nacl.box.keyPair(); // X25519 keys (32 bytes)
  localStorage.setItem("we3_x25519", JSON.stringify({ 
    pub: Array.from(kp.publicKey), 
    sec: Array.from(kp.secretKey) 
  }));
  return kp;
}

export function pubkeyToBytes32(pub: Uint8Array): `0x${string}` {
  return ("0x" + Buffer.from(pub).toString("hex")) as `0x${string}`;
}

// === Derive AES-GCM key via HKDF(SHA-256) ===
async function deriveAesKey(sharedSecret: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw", 
    sharedSecret.buffer as ArrayBuffer, 
    "HKDF", 
    false, 
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { 
      name: "HKDF", 
      hash: "SHA-256", 
      salt: salt.buffer as ArrayBuffer, 
      info: new Uint8Array([]).buffer as ArrayBuffer 
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  salt: string;
}

export async function encryptMessage(
  plaintext: string, 
  senderSecretKey: Uint8Array, 
  recipientPubKey: Uint8Array
): Promise<EncryptedMessage> {
  const shared = nacl.scalarMult(senderSecretKey, recipientPubKey); // 32 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await deriveAesKey(shared, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data));
  
  return { 
    ciphertext: Buffer.from(ciphertext).toString("base64"), 
    iv: Buffer.from(iv).toString("base64"), 
    salt: Buffer.from(salt).toString("base64") 
  };
}

export async function decryptMessage(
  encrypted: EncryptedMessage,
  recipientSecretKey: Uint8Array, 
  senderPubKey: Uint8Array
): Promise<string> {
  const { ciphertext, iv, salt } = encrypted;
  const shared = nacl.scalarMult(recipientSecretKey, senderPubKey);
  const saltBytes = Uint8Array.from(Buffer.from(salt, "base64"));
  const aesKey = await deriveAesKey(shared, saltBytes);
  const ivBytes = Uint8Array.from(Buffer.from(iv, "base64"));
  const cipherBytes = Uint8Array.from(Buffer.from(ciphertext, "base64"));
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, aesKey, cipherBytes);
  return new TextDecoder().decode(new Uint8Array(plainBuf));
}
