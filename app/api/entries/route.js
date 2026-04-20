import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { serialize } from '@/lib/serialize';
import Entry from '@/lib/models/Entry';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const entries = await Entry.find({ userId: session.userId });
  return NextResponse.json(entries.map(serialize));
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { taskId, date, startHour, endHour } = await req.json();
  const entry = await Entry.create({ userId: session.userId, taskId, date, startHour, endHour });
  return NextResponse.json(serialize(entry), { status: 201 });
}
