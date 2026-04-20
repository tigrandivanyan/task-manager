import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { filename } = await params;

  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // File already gone — not an error
  }

  return NextResponse.json({ ok: true });
}
