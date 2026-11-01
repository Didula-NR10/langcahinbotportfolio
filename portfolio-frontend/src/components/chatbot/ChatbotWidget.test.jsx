// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotWidget from './ChatbotWidget';
import { ChatApiError, sendChat } from '../../services/chatApi';

vi.mock('../../services/chatApi', async importOriginal => {
  const original = await importOriginal();
  return { ...original, sendChat: vi.fn() };
});

const SESSION = 'b'.repeat(43);
const answer = (text = 'A helpful answer.', sources = []) => ({ answer: text, sessionId: SESSION, mode: sources.length ? 'direct_context' : 'general', sources });

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

async function openChat(user) {
  await user.click(screen.getByRole('button', { name: 'Open AI assistant' }));
}

describe('ChatbotWidget', () => {
  it('opens, shows suggestions, and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<ChatbotWidget />);
    await openChat(user);
    expect(screen.getByText('Curious about my work?')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Open AI assistant' })).toBeTruthy();
  });

  it('sends a suggestion to the API and shows answer and sources', async () => {
    const user = userEvent.setup();
    sendChat.mockResolvedValue(answer('Built a weather app.', [{ document: 'projects.md', category: 'projects' }]));
    render(<ChatbotWidget />);
    await openChat(user);
    await user.click(screen.getByRole('button', { name: 'What projects has this developer completed?' }));
    await waitFor(() => expect(screen.getByText('Built a weather app.')).toBeTruthy());
    expect(sendChat).toHaveBeenCalledWith('What projects has this developer completed?', null, expect.any(Object));
    await user.click(screen.getByText('1 source'));
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('keeps the returned session ID for follow-up questions', async () => {
    const user = userEvent.setup();
    sendChat.mockResolvedValueOnce(answer()).mockResolvedValueOnce(answer('A second answer.'));
    render(<ChatbotWidget />);
    await openChat(user);
    const input = screen.getByRole('textbox', { name: 'Your message' });
    await user.type(input, 'Explain Python{enter}');
    await waitFor(() => expect(screen.getByText('A helpful answer.')).toBeTruthy());
    await user.type(input, 'How is it used?{enter}');
    await waitFor(() => expect(screen.getByText('A second answer.')).toBeTruthy());
    expect(sendChat.mock.calls[1][1]).toBe(SESSION);
  });

  it('keeps Shift+Enter as a newline and rejects empty or oversized input', async () => {
    const user = userEvent.setup();
    sendChat.mockResolvedValue(answer());
    render(<ChatbotWidget />);
    await openChat(user);
    const input = screen.getByRole('textbox', { name: 'Your message' });
    expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(true);
    await user.type(input, 'Hello{shift>}{enter}{/shift}world');
    expect(sendChat).not.toHaveBeenCalled();
    expect(input.value).toContain('\n');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false, nativeEvent: { isComposing: false } });
    await waitFor(() => expect(sendChat).toHaveBeenCalledWith('Hello\nworld', null, expect.any(Object)));
    await waitFor(() => expect(screen.getByText('A helpful answer.')).toBeTruthy());
    fireEvent.change(input, { target: { value: 'x'.repeat(2001) } });
    expect(screen.getByText(/too long/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(true);
  });

  it('shows loading and prevents duplicate submissions', async () => {
    const user = userEvent.setup();
    let finish;
    sendChat.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<ChatbotWidget />);
    await openChat(user);
    await user.type(screen.getByRole('textbox', { name: 'Your message' }), 'Hello{enter}');
    expect(screen.getByText('Assistant is thinking…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(true);
    expect(sendChat).toHaveBeenCalledTimes(1);
    finish(answer());
    await waitFor(() => expect(screen.getByText('A helpful answer.')).toBeTruthy());
  });

  it('retries failures without duplicating the user message', async () => {
    const user = userEvent.setup();
    sendChat.mockRejectedValueOnce(new ChatApiError('Connection failed.', 'NETWORK_ERROR')).mockResolvedValueOnce(answer());
    render(<ChatbotWidget />);
    await openChat(user);
    await user.type(screen.getByRole('textbox', { name: 'Your message' }), 'Hello{enter}');
    await waitFor(() => expect(screen.getByText('Connection failed.')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText('A helpful answer.')).toBeTruthy());
    expect(screen.getAllByText('Hello')).toHaveLength(1);
    expect(sendChat).toHaveBeenCalledTimes(2);
  });

  it('offers a reset when the backend session expires', async () => {
    const user = userEvent.setup();
    sendChat.mockRejectedValue(new ChatApiError('This conversation has ended.', 'SESSION_EXPIRED', 404));
    render(<ChatbotWidget />);
    await openChat(user);
    await user.type(screen.getByRole('textbox', { name: 'Your message' }), 'Hello{enter}');
    await waitFor(() => expect(screen.getByText('This conversation has ended.')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Start new conversation' }));
    expect(screen.getByText('Curious about my work?')).toBeTruthy();
  });

  it('discards a pending response after starting a new conversation', async () => {
    const user = userEvent.setup();
    let finish;
    sendChat.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<ChatbotWidget />);
    await openChat(user);
    await user.type(screen.getByRole('textbox', { name: 'Your message' }), 'Hello{enter}');
    await user.click(screen.getByRole('button', { name: 'Start a new conversation' }));
    finish(answer('Old answer'));
    expect(screen.getByText('Curious about my work?')).toBeTruthy();
    expect(screen.queryByText('Old answer')).toBeNull();
  });

  it('renders code safely and offers a copy button', async () => {
    const user = userEvent.setup();
    sendChat.mockResolvedValue(answer('<script>alert(1)</script>\n\n```js\nconst x = 1;\n```'));
    render(<ChatbotWidget />);
    await openChat(user);
    await user.type(screen.getByRole('textbox', { name: 'Your message' }), 'Show code{enter}');
    await waitFor(() => expect(screen.getByText('const x = 1;')).toBeTruthy());
    expect(document.querySelector('.portfolio-chat-markdown script')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
  });
});
