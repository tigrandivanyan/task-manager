export const dynamic = 'force-dynamic';

export function GET() {
  let refreshInterval;
  let pingInterval;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Send a refresh ping every 30 seconds
      refreshInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${Date.now()}\n\n`));
        } catch {
          clearInterval(refreshInterval);
          clearInterval(pingInterval);
        }
      }, 30000);

      // Keep-alive comment every 20 seconds to prevent proxy timeouts
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(refreshInterval);
          clearInterval(pingInterval);
        }
      }, 20000);
    },
    cancel() {
      clearInterval(refreshInterval);
      clearInterval(pingInterval);
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
