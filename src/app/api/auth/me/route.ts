import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const getSecret = () => {
  const env = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
  return env || crypto.randomBytes(32).toString('hex');
};

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

export async function GET(req: NextRequest) {
  const header = req.headers.get('authorization');
  const cookieToken = req.cookies.get('auth_token')?.value;
  const bearer = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : null;
  const token = bearer || cookieToken;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const address = payload.sub as string;
  return NextResponse.json({
    user: {
      id: address,
      address,
      username: '',
      bio: '',
      avatar: '',
      publicKey: '',
      isRegistered: false,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    },
  });
}

export const runtime = 'nodejs';
