import * as nacl from "tweetnacl";

// Store keypair in localStorage: { pub: number[], sec: number[] }
export function getOrCreateX25519(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  if (typeof window === 'undefined') {
    // Return a temporary keypair for SSR
    const kp = nacl.box.keyPair();
    return { publicKey: kp.publicKey, secretKey: kp.secretKey };
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
  const baseKey = await crypto.subtle.importKey("raw", sharedSecret.buffer as ArrayBuffer, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, info: new Uint8Array([]) },
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
  try {
    // Validate inputs
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid plaintext: must be a non-empty string');
    }
    
    if (!senderSecretKey || senderSecretKey.length !== 32) {
      throw new Error('Invalid sender secret key: must be 32 bytes');
    }
    
    if (!recipientPublicKey || recipientPublicKey.length !== 32) {
      throw new Error('Invalid recipient public key: must be 32 bytes');
    }

    // Check if we're in a secure context (required for crypto.subtle)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error('Encryption requires a secure context (HTTPS)');
    }

    // Derive shared secret via X25519 scalar multiplication
    const shared = nacl.scalarMult(senderSecretKey, recipientPublicKey);
    
    if (!shared || shared.length !== 32) {
      throw new Error('Failed to derive shared secret');
    }

    // Generate cryptographically secure random values
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV size
    
    // Derive AES-GCM key using HKDF
    const aesKey = await deriveAesKey(shared, salt);
    
    // Encrypt the plaintext
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      plaintextBytes
    );
    
    const ciphertext = new Uint8Array(ciphertextBuffer);
    
    // Return base64-encoded values for JSON serialization
    return {
      ciphertext: Buffer.from(ciphertext).toString("base64"),
      iv: Buffer.from(iv).toString("base64"),
      salt: Buffer.from(salt).toString("base64"),
    };
    
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Decrypt from sender
export async function decryptFromSender(
  cipherB64: string, 
  ivB64: string, 
  saltB64: string, 
  recipientSecretKey: Uint8Array, 
  senderPublicKey: Uint8Array
): Promise<string> {
  try {
    // Validate inputs
    if (!cipherB64 || typeof cipherB64 !== 'string') {
      throw new Error('Invalid ciphertext: must be a non-empty base64 string');
    }
    
    if (!ivB64 || typeof ivB64 !== 'string') {
      throw new Error('Invalid IV: must be a non-empty base64 string');
    }
    
    if (!saltB64 || typeof saltB64 !== 'string') {
      throw new Error('Invalid salt: must be a non-empty base64 string');
    }
    
    if (!recipientSecretKey || recipientSecretKey.length !== 32) {
      throw new Error('Invalid recipient secret key: must be 32 bytes');
    }
    
    if (!senderPublicKey || senderPublicKey.length !== 32) {
      throw new Error('Invalid sender public key: must be 32 bytes');
    }

    // Check if we're in a secure context
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error('Decryption requires a secure context (HTTPS)');
    }

    // Derive shared secret
    const shared = nacl.scalarMult(recipientSecretKey, senderPublicKey);
    
    if (!shared || shared.length !== 32) {
      throw new Error('Failed to derive shared secret');
    }

    // Decode base64 values
    let salt: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array;
    
    try {
      salt = Uint8Array.from(Buffer.from(saltB64, "base64"));
      iv = Uint8Array.from(Buffer.from(ivB64, "base64"));
      ciphertext = Uint8Array.from(Buffer.from(cipherB64, "base64"));
    } catch (error) {
      throw new Error('Failed to decode base64 data: invalid encoding');
    }

    // Validate decoded lengths
    if (salt.length !== 16) {
      throw new Error('Invalid salt length: expected 16 bytes');
    }
    
    if (iv.length !== 12) {
      throw new Error('Invalid IV length: expected 12 bytes');
    }
    
    if (ciphertext.length === 0) {
      throw new Error('Invalid ciphertext: empty data');
    }

    // Derive AES key
    const aesKey = await deriveAesKey(shared, salt);
    
    // Decrypt
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      aesKey,
      new Uint8Array(ciphertext)
    );
    
    // Decode to string
    const decoder = new TextDecoder('utf-8');
    const plaintext = decoder.decode(new Uint8Array(plaintextBuffer));
    
    if (!plaintext) {
      throw new Error('Decryption resulted in empty plaintext');
    }
    
    return plaintext;
    
  } catch (error) {
    console.error('Decryption failed:', error);
    
    // Don't expose the exact error in production for security
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to decrypt message: invalid data or keys');
    } else {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
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
  if (typeof window === 'undefined') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
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
    const message = "Hello, this is a test message! 🔐";
    
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

// Advanced crypto tests
export async function runCryptoTestSuite(): Promise<{
  basicEncryption: boolean;
  unicodeSupport: boolean;
  largeMessage: boolean;
  emptyMessage: boolean;
  keyValidation: boolean;
  performanceTest: number; // milliseconds
}> {
  const results = {
    basicEncryption: false,
    unicodeSupport: false,
    largeMessage: false,
    emptyMessage: false,
    keyValidation: false,
    performanceTest: 0
  };

  try {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    // Basic encryption test
    try {
      const basicMessage = "Hello World!";
      const encrypted = await encryptForRecipient(basicMessage, alice.secretKey, bob.publicKey);
      const decrypted = await decryptFromSender(encrypted.ciphertext, encrypted.iv, encrypted.salt, bob.secretKey, alice.publicKey);
      results.basicEncryption = basicMessage === decrypted;
    } catch {
      // Test failed
    }

    // Unicode support test
    try {
      const unicodeMessage = "Hello 🌍! Спасибо! 中文 العربية";
      const encrypted = await encryptForRecipient(unicodeMessage, alice.secretKey, bob.publicKey);
      const decrypted = await decryptFromSender(encrypted.ciphertext, encrypted.iv, encrypted.salt, bob.secretKey, alice.publicKey);
      results.unicodeSupport = unicodeMessage === decrypted;
    } catch {
      // Test failed
    }

    // Large message test
    try {
      const largeMessage = "A".repeat(10000); // 10KB message
      const encrypted = await encryptForRecipient(largeMessage, alice.secretKey, bob.publicKey);
      const decrypted = await decryptFromSender(encrypted.ciphertext, encrypted.iv, encrypted.salt, bob.secretKey, alice.publicKey);
      results.largeMessage = largeMessage === decrypted;
    } catch {
      // Test failed
    }

    // Empty message handling
    try {
      await encryptForRecipient("", alice.secretKey, bob.publicKey);
      results.emptyMessage = false; // Should fail
    } catch {
      results.emptyMessage = true; // Should reject empty messages
    }

    // Key validation test
    try {
      const invalidKey = new Uint8Array(16); // Wrong size
      await encryptForRecipient("test", invalidKey, bob.publicKey);
      results.keyValidation = false; // Should fail
    } catch {
      results.keyValidation = true; // Should reject invalid keys
    }

    // Performance test
    const start = Date.now();
    const testMessage = "Performance test message";
    for (let i = 0; i < 10; i++) {
      const encrypted = await encryptForRecipient(testMessage, alice.secretKey, bob.publicKey);
      await decryptFromSender(encrypted.ciphertext, encrypted.iv, encrypted.salt, bob.secretKey, alice.publicKey);
    }
    results.performanceTest = Date.now() - start;

  } catch (error) {
    console.error("Crypto test suite failed:", error);
  }

  return results;
}

// Secure key comparison (constant time to prevent timing attacks)
export function secureKeyCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

// Key strength validation
export function validateKeyStrength(publicKey: Uint8Array): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (publicKey.length !== 32) {
    issues.push('Key must be exactly 32 bytes');
  }
  
  // Check for weak keys (all zeros, all ones, etc.)
  const allZeros = publicKey.every(byte => byte === 0);
  const allOnes = publicKey.every(byte => byte === 255);
  
  if (allZeros) {
    issues.push('Key cannot be all zeros');
  }
  
  if (allOnes) {
    issues.push('Key cannot be all ones');
  }
  
  // Check for low entropy (simplified check)
  const uniqueBytes = new Set(publicKey).size;
  if (uniqueBytes < 8) {
    issues.push('Key appears to have low entropy');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Secure random string generation for testing
export function generateSecureRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomBytes, byte => chars[byte % chars.length]).join('');
}
