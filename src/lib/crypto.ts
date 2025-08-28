import nacl from "tweetnacl";

// Store keypair in localStorage: { pub: number[], sec: number[] }
export function getOrCreateX25519(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  if (typeof window === 'undefined') {
    throw new Error("Crypto operations can only be performed in the browser");
  }

  const raw = localStorage.getItem("we3_x25519");
  if (raw) {
    try {
      const { pub, sec } = JSON.parse(raw);
      return { 
        publicKey: new Uint8Array(pub), 
        secretKey: new Uint8Array(sec) 
      };
    } catch (error) {
      console.warn("Invalid stored keypair, generating new one:", error);
      localStorage.removeItem("we3_x25519");
    }
  }
  
  const kp = nacl.box.keyPair(); // returns {publicKey: Uint8Array(32), secretKey: Uint8Array(32)}
  localStorage.setItem("we3_x25519", JSON.stringify({ 
    pub: Array.from(kp.publicKey), 
    sec: Array.from(kp.secretKey) 
  }));
  
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

// Convert Uint8Array -> hex 0x...
export function toHex0x(u8: Uint8Array): string {
  return "0x" + Buffer.from(u8).toString("hex");
}

export function fromHex0x(h: string): Uint8Array {
  if (h.startsWith("0x")) h = h.slice(2);
  return new Uint8Array(Buffer.from(h, "hex"));
}

// Derive AES key via HKDF(SHA-256)
async function deriveAesKey(sharedSecret: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: new Uint8Array([]) },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt plaintext for recipient
export async function encryptForRecipient(
  plaintext: string, 
  senderSecretKey: Uint8Array, 
  recipientPublicKey: Uint8Array
): Promise<{
  ciphertext: string;
  iv: string;
  salt: string;
}> {
  // shared secret via scalarMult
  const shared = nacl.scalarMult(senderSecretKey, recipientPublicKey); // Uint8Array(32)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await deriveAesKey(shared, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, enc));
  
  return {
    ciphertext: Buffer.from(ct).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    salt: Buffer.from(salt).toString("base64"),
  };
}

// Decrypt from sender
export async function decryptFromSender(
  cipherB64: string, 
  ivB64: string, 
  saltB64: string, 
  recipientSecretKey: Uint8Array, 
  senderPublicKey: Uint8Array
): Promise<string> {
  const shared = nacl.scalarMult(recipientSecretKey, senderPublicKey);
  const salt = Uint8Array.from(Buffer.from(saltB64, "base64"));
  const aesKey = await deriveAesKey(shared, salt);
  const iv = Uint8Array.from(Buffer.from(ivB64, "base64"));
  const cipher = Uint8Array.from(Buffer.from(cipherB64, "base64"));
  
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, cipher);
  return new TextDecoder().decode(new Uint8Array(plainBuf));
}

// Generate a new keypair (for testing or new users)
export function generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  return nacl.box.keyPair();
}

// Clear stored keypair (for logout)
export function clearStoredKeyPair(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem("we3_x25519");
  }
}

// Get public key as hex string for blockchain storage
export function getPublicKeyHex(): string {
  const { publicKey } = getOrCreateX25519();
  return toHex0x(publicKey);
}

// Validate if a string is a valid hex-encoded public key
export function isValidPublicKeyHex(hex: string): boolean {
  try {
    const bytes = fromHex0x(hex);
    return bytes.length === 32; // X25519 public keys are 32 bytes
  } catch {
    return false;
  }
}

// Convert bytes32 to Uint8Array (for blockchain data)
export function bytes32ToUint8Array(bytes32: string): Uint8Array {
  return fromHex0x(bytes32);
}

// Convert Uint8Array to bytes32 (for blockchain storage)
export function uint8ArrayToBytes32(arr: Uint8Array): string {
  if (arr.length !== 32) {
    throw new Error("Array must be exactly 32 bytes");
  }
  return toHex0x(arr);
}

// Test encryption/decryption roundtrip
export async function testCrypto(): Promise<boolean> {
  try {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const message = "Hello, this is a test message!";
    
    // Alice encrypts for Bob
    const encrypted = await encryptForRecipient(message, alice.secretKey, bob.publicKey);
    
    // Bob decrypts from Alice
    const decrypted = await decryptFromSender(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.salt,
      bob.secretKey,
      alice.publicKey
    );
    
    return message === decrypted;
  } catch (error) {
    console.error("Crypto test failed:", error);
    return false;
  }
}
