import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function textFrom(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textFrom).join('');
  return textFrom(node?.props?.children);
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const code = textFrom(children).replace(/\n$/, '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return <div className="portfolio-chat-code">
    <div className="portfolio-chat-code-bar"><span>Code</span><button type="button" onClick={copy} aria-label={copied ? 'Code copied' : 'Copy code'}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button></div>
    <pre><code>{code}</code></pre>
    <span className="portfolio-chat-sr-only" aria-live="polite">{copied ? 'Code copied to clipboard' : ''}</span>
  </div>;
}

export default function ChatMarkdown({ children }) {
  return <div className="portfolio-chat-markdown">
    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={{
      pre: ({ children: code }) => <CodeBlock>{code}</CodeBlock>,
      a: ({ children: label, href }) => {
        const safe = /^https?:\/\//i.test(href || '');
        return safe ? <a href={href} target="_blank" rel="noopener noreferrer">{label}</a> : <span>{label}</span>;
      }
    }}>{children}</ReactMarkdown>
  </div>;
}
