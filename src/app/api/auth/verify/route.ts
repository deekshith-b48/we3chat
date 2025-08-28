import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import crypto from 'crypto';

const getSecret = () => {
  const env = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
  return env || crypto.randomBytes(32).toString('hex');
};

function signToken(payload: Record<string, any>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const body = enc(payload);
  const head = enc(header);
  const data = `${head}.${body}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): Record<string, any> | null {
  try {
    const [head, body, sig] = token.split('.');
    const data = `${head}.${body}`;
    const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();
    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    const nonceCookie = req.cookies.get('siwe_nonce')?.value;
    const siwe = new SiweMessage(message);
    const fields = await siwe.verify({ signature, nonce: nonceCookie });

    if (!fields || !fields.data) {
      return NextResponse.json({ error: 'Invalid SIWE message' }, { status: 400 });
    }

    const address = fields.data.address;
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 7; // 7 days
    const token = signToken({ sub: address.toLowerCase(), iat: now, exp });

    const user = {
      id: address.toLowerCase(),
      address,
      username: '',
      bio: '',
      avatar: '',
      publicKey: '',
      isRegistered: false,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    const res = NextResponse.json({ token, user });
    res.cookies.set('auth_token', token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
    res.cookies.set('siwe_nonce', '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Verification failed' }, { status: 400 });
  }
}

export const runtime = 'nodejs';
