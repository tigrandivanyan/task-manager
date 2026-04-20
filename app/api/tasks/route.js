import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { serialize } from '@/lib/serialize';
import Task from '@/lib/models/Task';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const tasks = await Task.find({ userId: session.userId });
  return NextResponse.json(tasks.map(serialize));
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { projectId, title, description, priority, attachments } = await req.json();
  const task = await Task.create({
    userId: session.userId, projectId, title, description, priority, attachments,
  });
  return NextResponse.json(serialize(task), { status: 201 });
}
