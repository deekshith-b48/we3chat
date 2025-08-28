import { NextResponse } from 'next/server';

export async function GET() {
  // Return empty friend list to keep UI working
  return NextResponse.json({ friends: [] });
}

export const runtime = 'nodejs';
