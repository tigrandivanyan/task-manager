import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { signToken, setTokenCookie } from '@/lib/auth';
import User from '@/lib/models/User';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';

const SEED_PROJECTS = [
  { name: 'Design System', color: '#8b5cf6', emoji: '✦' },
  { name: 'Frontend Dev',  color: '#f59e0b', emoji: '⬡' },
  { name: 'Marketing',     color: '#10b981', emoji: '◈' },
];

const SEED_TASKS = [
  { title: 'Token audit',          description: 'Review all design tokens across components', priority: 1, projectIdx: 0 },
  { title: 'Component lib update', description: 'Bump versions, fix deprecations',            priority: 2, projectIdx: 0 },
  { title: 'Fix nav bug',          description: 'Nav menu closes unexpectedly on hover',       priority: 1, projectIdx: 1 },
  { title: 'API integration',      description: 'Connect to new REST endpoints',              priority: 3, projectIdx: 1 },
  { title: 'Write Q2 blog post',   description: 'Product update and roadmap teaser',          priority: 2, projectIdx: 2 },
];

export async function POST(req) {
  await connectDB();
  const { username, password } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
  }

  const existing = await User.findOne({ username: username.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username: username.toLowerCase().trim(), passwordHash });

  // Seed sample data for new user
  const projects = await Project.insertMany(
    SEED_PROJECTS.map(p => ({ ...p, userId: user._id }))
  );
  await Task.insertMany(
    SEED_TASKS.map(t => ({
      userId: user._id,
      projectId: projects[t.projectIdx]._id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      attachments: [],
    }))
  );

  const token = signToken({ userId: user._id.toString(), username: user.username });
  const res = NextResponse.json({ username: user.username });
  setTokenCookie(res, token);
  return res;
}
