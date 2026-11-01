import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Plus, RotateCcw, Send, X } from 'lucide-react';
import { CHAT_MAX_LENGTH, useChatbot } from '../../hooks/useChatbot';
import './chatbot.css';

const SUGGESTIONS = [
  'What projects has this developer completed?',
  'What technologies does this developer use?',
  'Tell me about this developer’s education.',
  'Explain LangChain in simple terms.'
];
const ChatMarkdown = lazy(() => import('./ChatMarkdown'));

function useMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 600px)').matches || false);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 600px)');
    if (!query) return undefined;
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile;
}

function Sources({ sources }) {
  if (!sources?.length) return null;
  return <details className="portfolio-chat-sources">
    <summary>{sources.length === 1 ? '1 source' : `${sources.length} sources`}</summary>
    <ul>{sources.map((source, index) => <li key={`${source.document}-${index}`}>
      {source.category.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())}
    </li>)}</ul>
  </details>;
}

function ChatMessage({ message }) {
  return <li className={`portfolio-chat-message portfolio-chat-message--${message.role}`}>
    {message.role === 'assistant' && <span className="portfolio-chat-message-avatar" aria-hidden="true"><Bot size={16} /></span>}
    <div className="portfolio-chat-message-body">
      {message.role === 'assistant' ? <Suspense fallback={<p>{message.content}</p>}><ChatMarkdown>{message.content}</ChatMarkdown></Suspense> : <p>{message.content}</p>}
      {message.status === 'failed' && <span className="portfolio-chat-message-failed">Not sent</span>}
      {message.role === 'assistant' && <Sources sources={message.sources} />}
    </div>
  </li>;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const mobile = useMobile();
  const launcherRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const { messages, loading, error, retryMessage, sendMessage, retry, newConversation } = useChatbot();

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (!mobile || event.key !== 'Tab') return;
      const focusable = [...panelRef.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled), summary, a[href]')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; launcherRef.current?.focus(); };
  }, [open, mobile]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [open, messages, loading]);

  const submit = () => {
    const message = draft.trim();
    if (!message || loading || message.length > CHAT_MAX_LENGTH) return;
    setDraft('');
    sendMessage(message);
  };

  const reset = () => { newConversation(); setDraft(''); inputRef.current?.focus(); };

  return <div className="portfolio-chat-root">
    <button ref={launcherRef} className="portfolio-chat-launcher" type="button" aria-label={open ? 'Close AI assistant' : 'Open AI assistant'} aria-haspopup="dialog" aria-expanded={open} aria-controls="portfolio-chat-window" onClick={() => setOpen(value => !value)}>
      {open ? <X size={24} aria-hidden="true" /> : <MessageCircle size={24} aria-hidden="true" />}
      <span className="portfolio-chat-launcher-label">Ask AI</span>
    </button>

    <section ref={panelRef} id="portfolio-chat-window" className={`portfolio-chat-window${open ? ' is-open' : ''}`} role="dialog" aria-modal={mobile || undefined} aria-labelledby="portfolio-chat-title" aria-hidden={!open} inert={!open}>
      <header className="portfolio-chat-header">
        <span className="portfolio-chat-header-icon" aria-hidden="true"><Bot size={21} /></span>
        <div className="portfolio-chat-heading"><h2 id="portfolio-chat-title">Portfolio AI Assistant</h2><p>Ask about projects, skills, and technology</p></div>
        <button type="button" className="portfolio-chat-icon-button" onClick={reset} aria-label="Start a new conversation" title="New conversation"><Plus size={19} aria-hidden="true" /></button>
        <button type="button" className="portfolio-chat-icon-button" onClick={() => setOpen(false)} aria-label="Close AI assistant" title="Close"><X size={19} aria-hidden="true" /></button>
      </header>

      <div className="portfolio-chat-scroll" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions" aria-busy={loading}>
        {messages.length === 0 && <div className="portfolio-chat-welcome">
          <span className="portfolio-chat-welcome-icon" aria-hidden="true"><Bot size={27} /></span>
          <h3>Curious about my work?</h3>
          <p>Ask about projects, skills, education, or a technical topic.</p>
          <span className="portfolio-chat-suggestion-label">Try a question</span>
          <div className="portfolio-chat-suggestions">{SUGGESTIONS.map(question => <button key={question} type="button" disabled={loading} onClick={() => sendMessage(question)}>{question}</button>)}</div>
        </div>}
        {messages.length > 0 && <ol className="portfolio-chat-messages">{messages.map(message => <ChatMessage key={message.id} message={message} />)}</ol>}
        {loading && <div className="portfolio-chat-typing" role="status"><span aria-hidden="true" className="portfolio-chat-dots"><i /><i /><i /></span>Assistant is thinking…</div>}
        {error && <div className="portfolio-chat-error" role="alert"><p>{error.message}</p><div>
          {retryMessage && <button type="button" onClick={retry} disabled={loading}><RotateCcw size={14} aria-hidden="true" /> Retry</button>}
          {error.expired && <button type="button" onClick={reset}>Start new conversation</button>}
        </div></div>}
        <div ref={endRef} />
      </div>

      <form className="portfolio-chat-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
        <label htmlFor="portfolio-chat-input" className="portfolio-chat-sr-only">Your message</label>
        <textarea id="portfolio-chat-input" ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} rows={2} placeholder="Ask a question…" disabled={loading} aria-describedby="portfolio-chat-count" />
        <button className="portfolio-chat-send" type="submit" disabled={loading || !draft.trim() || draft.trim().length > CHAT_MAX_LENGTH} aria-label="Send message"><Send size={18} aria-hidden="true" /></button>
        <span id="portfolio-chat-count" className={`portfolio-chat-count${draft.length > CHAT_MAX_LENGTH ? ' is-over' : ''}`}>{draft.length}/{CHAT_MAX_LENGTH}{draft.length > CHAT_MAX_LENGTH ? ' — too long' : ''}</span>
      </form>
    </section>
  </div>;
}
