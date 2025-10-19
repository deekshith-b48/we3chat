import { SignJWT, jwtVerify } from 'jose';
import { ENV } from './env.js';

const enc = new TextEncoder();
const secret = enc.encode(ENV.SIWE_JWT_SECRET);

export interface JWTPayload {
  sub: string; // user ID
  email?: string;
  wallet?: string;
  profileId?: string;
  sessionType: 'email' | 'wallet' | 'siwe';
  iat?: number;
  exp?: number;
}

export async function signAppJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>, 
  expiresIn = ENV.SIWE_JWT_EXPIRES
): Promise<string> {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyAppJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function getTokenExpirationTime(payload: JWTPayload): Date | null {
  if (!payload.exp) return null;
  return new Date(payload.exp * 1000);
}

export function getTokenTimeRemaining(payload: JWTPayload): number {
  if (!payload.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
}
