import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { address } = await req.json().catch(() => ({}));
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  return NextResponse.json({ message: 'Friend request sent (stub)', friendship: { id: 'stub', address } });
}

export const runtime = 'nodejs';
