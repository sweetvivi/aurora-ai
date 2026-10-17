import { describe, expect, it } from 'vitest';
import { createSseParser } from './sse';

describe('createSseParser', () => {
  it('parses events split across chunks', () => {
    const parser = createSseParser();

    expect(parser.feed('event: meta\ndata: {"conversationId":')).toEqual([]);
    expect(parser.feed('"conversation-1"}\n\nevent: delta\ndata: {"content":"你')).toEqual([
      {
        data: '{"conversationId":"conversation-1"}',
        event: 'meta',
      },
    ]);
    expect(parser.feed('好"}\n\n')).toEqual([
      {
        data: '{"content":"你好"}',
        event: 'delta',
      },
    ]);
  });

  it('supports comments, CRLF and multi-line data', () => {
    const parser = createSseParser();

    const events = parser.feed(
      ': keep-alive\r\nevent: delta\r\ndata: {"content":"第一行"}\r\n' +
        'data: {"content":"第二行"}\r\nid: 7\r\n\r\n',
    );

    expect(events).toEqual([
      {
        data: '{"content":"第一行"}\n{"content":"第二行"}',
        event: 'delta',
        id: '7',
      },
    ]);
  });

  it('flushes a complete trailing frame', () => {
    const parser = createSseParser();

    expect(parser.feed('event: done\ndata: {"status":"COMPLETED"}')).toEqual([]);
    expect(parser.flush()).toEqual([
      {
        data: '{"status":"COMPLETED"}',
        event: 'done',
      },
    ]);
    expect(parser.flush()).toEqual([]);
  });
});
