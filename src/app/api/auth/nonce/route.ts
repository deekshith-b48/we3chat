import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function GET(_req: NextRequest) {
  const nonce = generateNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set('siwe_nonce', nonce, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  return res;
}
