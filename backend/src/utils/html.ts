import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'blockquote', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'rel'],
  }) as string;
}

export function simpleMarkdownToHtml(md: string): string {
  // Use marked to parse markdown
  const rawHtml = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(rawHtml);
}
