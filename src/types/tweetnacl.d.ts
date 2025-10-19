declare module 'tweetnacl' {
  export interface BoxKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export const box: {
    keyPair(): BoxKeyPair;
    keyPairFromSecretKey(secretKey: Uint8Array): BoxKeyPair;
  };

  export function scalarMult(n: Uint8Array, p: Uint8Array): Uint8Array;
  export function randomBytes(length: number): Uint8Array;
  
  export const util: {
    encodeUTF8(str: string): Uint8Array;
    decodeUTF8(arr: Uint8Array): string;
    encodeBase64(arr: Uint8Array): string;
    decodeBase64(str: string): Uint8Array;
  } | undefined;
}
