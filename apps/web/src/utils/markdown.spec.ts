import { describe, expect, it } from 'vitest';
import { CODE_COPY_BUTTON_CLASS, readCodeBlockText, renderSafeMarkdown } from './markdown';

describe('safe markdown rendering', () => {
  it('renders structured markdown and adds code copy controls', () => {
    const html = renderSafeMarkdown(
      ['## 标题', '', '- 第一项', '- 第二项', '', '```ts', 'const answer = 42;', '```'].join('\n'),
    );
    const document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const button = document.querySelector<HTMLButtonElement>(`.${CODE_COPY_BUTTON_CLASS}`);

    expect(document.querySelector('h2')?.textContent).toBe('标题');
    expect(document.querySelectorAll('li')).toHaveLength(2);
    expect(button?.textContent).toBe('复制');
    expect(readCodeBlockText(document.body, button as HTMLButtonElement)).toContain(
      'const answer = 42;',
    );
  });

  it('removes scripts, unsafe attributes and javascript links', () => {
    const html = renderSafeMarkdown(
      [
        '<script>window.__unsafe = true</script>',
        '<img src="x" onerror="window.__unsafe = true">',
        '[危险链接](javascript:alert(1))',
        '<a href="javascript:alert(2)" onclick="window.__unsafe = true">危险 HTML 链接</a>',
      ].join('\n'),
    );
    const document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<img');
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('marks external links as safe new-tab links', () => {
    const html = renderSafeMarkdown('[OpenAI](https://openai.com)');
    const document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const link = document.querySelector('a');

    expect(link?.getAttribute('href')).toBe('https://openai.com');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.getAttribute('target')).toBe('_blank');
  });
});
