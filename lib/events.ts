type Listener = (data: string) => void;
const listeners = new Map<string /*datasetId*/, Set<Listener>>();

export function broadcastDataset(datasetId: string, payload: unknown) {
  const set = listeners.get(datasetId);
  if (!set) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  set.forEach(fn => fn(data));
}

export function subscribeDataset(datasetId: string, listener: Listener) {
  const set = listeners.get(datasetId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(datasetId, set);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(datasetId);
  };
}

export function sseStream(register: (send: (data: string) => void) => () => void) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));
      const unsub = register(send);
      // heartbeat
      const hb = setInterval(() => send(`: ping\n\n`), 15000);
      controller.enqueue(encoder.encode(`: connected\n\n`));
      return () => { clearInterval(hb); unsub(); };
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    }
  });
}
