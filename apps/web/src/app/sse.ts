export interface SseEvent {
  data: string;
  event: string;
  id?: string;
}

export interface SseParser {
  feed: (chunk: string) => SseEvent[];
  flush: () => SseEvent[];
}

export function createSseParser(): SseParser {
  let buffer = '';

  return {
    feed(chunk: string): SseEvent[] {
      buffer += chunk.replace(/\r\n/g, '\n');
      const events: SseEvent[] = [];
      let boundary = buffer.indexOf('\n\n');

      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseFrame(frame);

        if (event) {
          events.push(event);
        }

        boundary = buffer.indexOf('\n\n');
      }

      return events;
    },
    flush(): SseEvent[] {
      const frame = buffer.trim();
      buffer = '';

      if (!frame) {
        return [];
      }

      const event = parseFrame(frame);

      return event ? [event] : [];
    },
  };
}

function parseFrame(frame: string): SseEvent | null {
  const dataLines: string[] = [];
  let event = 'message';
  let id: string | undefined;

  for (const line of frame.split('\n')) {
    if (!line || line.startsWith(':')) {
      continue;
    }

    const separator = line.indexOf(':');
    const field = separator >= 0 ? line.slice(0, separator) : line;
    const rawValue = separator >= 0 ? line.slice(separator + 1) : '';
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    if (field === 'data') {
      dataLines.push(value);
    } else if (field === 'event') {
      event = value || 'message';
    } else if (field === 'id') {
      id = value;
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    data: dataLines.join('\n'),
    event,
    id,
  };
}
