import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { serialize } from '@/lib/serialize';
import Project from '@/lib/models/Project';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const projects = await Project.find({ userId: session.userId });
  return NextResponse.json(projects.map(serialize));
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { name, color, emoji } = await req.json();
  const project = await Project.create({ userId: session.userId, name, color, emoji });
  return NextResponse.json(serialize(project), { status: 201 });
}
