import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { serialize } from '@/lib/serialize';
import Task from '@/lib/models/Task';

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const allowed = {};
  if (body.title       !== undefined) allowed.title       = body.title;
  if (body.description !== undefined) allowed.description = body.description;
  if (body.priority    !== undefined) allowed.priority    = body.priority;
  const task = await Task.findOneAndUpdate(
    { _id: id, userId: session.userId },
    { $set: allowed },
    { new: true }
  );
  return NextResponse.json(serialize(task));
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  await Task.deleteOne({ _id: id, userId: session.userId });
  return NextResponse.json({ ok: true });
}
