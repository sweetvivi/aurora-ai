import DOMPurify from 'dompurify';
import { Marked } from 'marked';

const markdown = new Marked({
  breaks: true,
  gfm: true,
});

const ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
];

const ALLOWED_ATTRIBUTES = ['aria-label', 'class', 'href', 'rel', 'target', 'title'];

export const CODE_COPY_BUTTON_CLASS = 'markdown-code-copy';

export function renderSafeMarkdown(source: string): string {
  const rendered = markdown.parse(source) as string;
  const safeHtml = DOMPurify.sanitize(rendered, {
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOWED_TAGS,
    FORBID_TAGS: ['button', 'form', 'iframe', 'input', 'math', 'script', 'select', 'style', 'svg'],
  });
  const document = new DOMParser().parseFromString(`<body>${safeHtml}</body>`, 'text/html');

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    anchor.setAttribute('rel', 'noopener noreferrer');
    anchor.setAttribute('target', '_blank');
  }

  for (const preformatted of document.querySelectorAll('pre')) {
    const button = document.createElement('button');

    button.setAttribute('aria-label', '复制代码');
    button.className = CODE_COPY_BUTTON_CLASS;
    button.textContent = '复制';
    button.type = 'button';
    preformatted.prepend(button);
  }

  return document.body.innerHTML;
}

export function readCodeBlockText(container: Element, button: Element): string {
  const preformatted = button.closest('pre');

  if (!preformatted || !container.contains(preformatted)) {
    return '';
  }

  return preformatted.querySelector('code')?.textContent ?? preformatted.textContent ?? '';
}
