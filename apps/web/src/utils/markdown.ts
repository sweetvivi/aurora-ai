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

/**
 * 把 Markdown 压成纯文本，用于画布节点这类不支持富文本、也不该暴露语法的位置。
 *
 * 文案生成返回的「**核心主张**」「### 关键词」直接塞进节点会很难看，复制出去也带记号；
 * 这里只去掉排版记号，保留换行与列表层级。
 */
export function stripMarkdown(source: string): string {
  return (
    source
      .replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, '$1')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/!\[[^\]]*]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/^\s{0,3}[-*+]\s+/gm, '· ')
      .replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, '')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')
      .replace(/__([^_\n]+)__/g, '$1')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
      .replace(/~~([^~\n]+)~~/g, '$1')
      // 流式输出到一半时可能停在一对记号的中间，收尾再把孤立记号清掉。
      .replace(/[*_]{1,3}(?=\s|$)/gm, '')
      .replace(/^[*_]{1,3}(?=\S)/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
