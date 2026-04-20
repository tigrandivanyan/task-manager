import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { signToken, setTokenCookie } from '@/lib/auth';
import User from '@/lib/models/User';

export async function POST(req) {
  await connectDB();
  const { username, password } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const user = await User.findOne({ username: username.toLowerCase().trim() });
  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const token = signToken({ userId: user._id.toString(), username: user.username });
  const res = NextResponse.json({ username: user.username });
  setTokenCookie(res, token);
  return res;
}
