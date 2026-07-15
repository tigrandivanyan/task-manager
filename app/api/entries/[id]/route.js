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

  // The auto-expiry checker marks overdue entries 'pending' from whatever the
  // client last saw locally, which can be stale (backgrounded tab, another
  // device, a slow timer). Guard this specific transition atomically so a
  // stale client can never clobber an entry someone already resolved
  // ('done'/'failed') back to 'pending'.
  const query = { _id: id, userId: session.userId };
  if (body.status === 'pending') query.status = null;

  const entry = await Entry.findOneAndUpdate(query, { $set: body }, { new: true });
  if (!entry) {
    // Distinguish "doesn't exist" from "guard blocked a stale pending write"
    // so the stale write fails silently instead of surfacing as an error.
    const stillExists = await Entry.exists({ _id: id, userId: session.userId });
    if (stillExists) return NextResponse.json(await Entry.findById(id).then(serialize));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
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
