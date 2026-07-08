import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { subscribe } from '@/lib/changeStreamHub';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  await connectDB();

  const encoder = new TextEncoder();
  let unsubscribe;
  let pingInterval;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Pushed the moment MongoDB's change stream reports a write for this user
      unsubscribe = subscribe(session.userId, () => {
        try {
          controller.enqueue(encoder.encode(`data: ${Date.now()}\n\n`));
        } catch {
          unsubscribe?.();
        }
      });

      // Keep-alive comment every 20 seconds to prevent proxy timeouts
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(pingInterval);
        }
      }, 20000);
    },
    cancel() {
      clearInterval(pingInterval);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
