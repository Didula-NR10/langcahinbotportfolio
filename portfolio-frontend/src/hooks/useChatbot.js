import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatApiError, sendChat } from '../services/chatApi';

const configuredMaxLength = Number(import.meta.env.VITE_CHATBOT_MAX_MESSAGE_LENGTH);
export const CHAT_MAX_LENGTH = Number.isInteger(configuredMaxLength) && configuredMaxLength > 0 ? configuredMaxLength : 2000;

function messageId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export function useChatbot() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryMessage, setRetryMessage] = useState(null);
  const sessionRef = useRef(null);
  const controllerRef = useRef(null);
  const generationRef = useRef(0);
  const sendingRef = useRef(false);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const perform = useCallback(async (content, existingId = null) => {
    const message = content.trim();
    if (sendingRef.current) return false;
    if (!message) {
      setError({ message: 'Enter a question before sending.', expired: false });
      return false;
    }
    if (message.length > CHAT_MAX_LENGTH) {
      setError({ message: `Keep your message under ${CHAT_MAX_LENGTH} characters.`, expired: false });
      return false;
    }

    const id = existingId || messageId();
    const generation = generationRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    sendingRef.current = true;
    setLoading(true);
    setError(null);
    setRetryMessage(null);
    if (existingId) {
      setMessages(current => current.map(item => item.id === existingId ? { ...item, status: 'sending' } : item));
    } else {
      setMessages(current => [...current.filter(item => item.status !== 'failed'), { id, role: 'user', content: message, status: 'sending' }]);
    }

    try {
      const result = await sendChat(message, sessionRef.current, { signal: controller.signal });
      if (generation !== generationRef.current) return false;
      sessionRef.current = result.sessionId;
      setMessages(current => [...current.map(item => item.id === id ? { ...item, status: 'sent' } : item), {
        id: messageId(), role: 'assistant', content: result.answer, sources: result.sources, mode: result.mode
      }]);
      return true;
    } catch (failure) {
      if (generation !== generationRef.current || failure?.name === 'AbortError') return false;
      const apiError = failure instanceof ChatApiError ? failure : new ChatApiError('Something went wrong. Please retry.');
      setMessages(current => current.map(item => item.id === id ? { ...item, status: 'failed' } : item));
      setRetryMessage(apiError.sessionExpired ? null : { id, content: message });
      setError({ message: apiError.message, expired: apiError.sessionExpired });
      return false;
    } finally {
      if (generation === generationRef.current) {
        sendingRef.current = false;
        controllerRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const newConversation = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    sendingRef.current = false;
    sessionRef.current = null;
    setMessages([]);
    setError(null);
    setRetryMessage(null);
    setLoading(false);
  }, []);

  const retry = useCallback(() => {
    if (retryMessage) return perform(retryMessage.content, retryMessage.id);
    return Promise.resolve(false);
  }, [perform, retryMessage]);

  return { messages, loading, error, retryMessage, sendMessage: perform, retry, newConversation };
}
