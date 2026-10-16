import { describe, expect, it } from 'vitest';
import { parseServerSentEvents } from './sse-parser';

describe('parseServerSentEvents', () => {
  it('parses split SSE events and ignores non-data lines', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: message\ndata: {"a":1}\n\n'));
        controller.enqueue(encoder.encode('data: {"b":2}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });

    const events: string[] = [];

    for await (const event of parseServerSentEvents(stream)) {
      events.push(event);
    }

    expect(events).toEqual(['{"a":1}', '{"b":2}', '[DONE]']);
  });
});
