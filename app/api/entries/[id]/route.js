import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { serialize } from '@/lib/serialize';
import Entry from '@/lib/models/Entry';

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const entry = await Entry.findOneAndUpdate(
    { _id: id, userId: session.userId },
    { $set: body },
    { new: true }
  );
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(entry));
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  await Entry.deleteOne({ _id: id, userId: session.userId });
  return NextResponse.json({ ok: true });
}
