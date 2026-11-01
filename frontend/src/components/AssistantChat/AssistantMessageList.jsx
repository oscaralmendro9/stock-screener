import { useEffect, useRef } from 'react';
import AssistantMessageBubble from './AssistantMessageBubble';

const SUGGESTIONS = [
  'What are the strongest current scan candidates?',
  'Which themes are accelerating right now?',
  'How does market breadth look?',
  'Compare StockScreenClaude signals with current web context for NVDA.',
];

function AssistantMessageList({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      bottomRef.current.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="mb-2 text-muted-foreground">Start a conversation with the assistant</p>
        <p className="max-w-[440px] text-sm text-muted-foreground">
          It can use StockScreenClaude scan outputs, themes, breadth, watchlists, and wider web context in one response.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion} className="rounded-lg bg-surface-subtle px-4 py-2 text-[13px]">
              &quot;{suggestion}&quot;
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4" aria-live="polite">
      {messages.map((message) => (
        <AssistantMessageBubble key={message.id} message={message} />
      ))}

      {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
        <div role="status" className="flex items-center gap-2 pl-2 text-[11px] text-muted-foreground">
          <span aria-hidden="true" className="inline-block size-4 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
          Thinking...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default AssistantMessageList;
