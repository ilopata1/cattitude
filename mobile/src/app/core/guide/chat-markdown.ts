/** Escape, then allow a small markdown subset. Model HTML cannot run. */
export function chatMarkdownHtml(source: string): string {
  let text = escapeHtml(source).replace(/\r\n/g, '\n');
  text = text.replace(/```([\s\S]*?)```/g, (_match, code: string) => `<pre><code>${code.trim()}</code></pre>`);
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`);
  const parts = text.split(/\n{2,}/).map((part) => part.replace(/\n/g, '<br>'));
  return parts.map((part) => (part.startsWith('<ul>') || part.startsWith('<pre>') ? part : `<p>${part}</p>`)).join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
