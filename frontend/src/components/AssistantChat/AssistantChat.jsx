import { useMemo, useState } from 'react';
import { ListPlus, Plus, SendHorizontal, X } from 'lucide-react';

import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { useAssistantChat } from '../../contexts/AssistantChatContext';
import AssistantMessageList from './AssistantMessageList';
import AssistantWatchlistDialog from './AssistantWatchlistDialog';

const STOPWORDS = new Set([
  'THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT', 'FROM', 'YOUR', 'THEME', 'THEMES',
  'BREADTH', 'WATCH', 'WATCHLIST', 'BUY', 'SELL', 'HOLD', 'RISK', 'RISKS', 'JSON',
  'HTTP', 'MARKET', 'STAGE', 'SCORE', 'SCORES', 'USES', 'RS', 'EPS', 'AI',
]);

function extractTickerCandidates(content) {
  const matches = content?.match(/\b[A-Z]{2,5}\b/g) || [];
  return [...new Set(matches.filter((symbol) => !STOPWORDS.has(symbol)))].slice(0, 12);
}

function AssistantChat({ mode = 'page', onClose = null }) {
  const {
    assistantHealth,
    conversationTitle,
    displayedMessages,
    isLoadingConversation,
    isStreaming,
    sendMessage,
    startNewConversation,
  } = useAssistantChat();
  const [input, setInput] = useState('');
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);

  const latestAssistantSymbols = useMemo(() => {
    const latestAssistantMessage = [...displayedMessages]
      .reverse()
      .find((message) => message.role === 'assistant' && !message.isStreaming && !message.isError);
    return extractTickerCandidates(latestAssistantMessage?.content || '');
  }, [displayedMessages]);

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return;
    const content = input;
    setInput('');
    await sendMessage(content);
  };

  const handleKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await handleSubmit();
    }
  };

  return (
    <section
      aria-label="Assistant"
      className={cn(
        'tw flex h-full flex-col overflow-hidden bg-surface text-foreground',
        mode === 'page' ? 'min-h-[70vh] rounded-lg border border-border' : 'min-h-full',
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Assistant</h2>
          <p className="truncate text-[11px] text-muted-foreground">{conversationTitle || 'Assistant'}</p>
        </div>

        <span
          className={cn(
            'inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2 text-[11px]',
            assistantHealth.available ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', assistantHealth.available ? 'bg-gain' : 'bg-disabled-foreground')} />
          {assistantHealth.available ? 'Hermes online' : 'Hermes offline'}
        </span>
        <Button variant="ghost" size="icon" aria-label="Start new conversation" title="Start new conversation" onClick={() => startNewConversation()}>
          <Plus aria-hidden="true" />
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon" aria-label="Close assistant" title="Close assistant" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>

      {!assistantHealth.available && (
        <div className="px-4 pt-4">
          <Notice tone="warning">
            {assistantHealth.detail || 'The assistant runtime is not currently available.'}
          </Notice>
        </div>
      )}

      <AssistantMessageList
        messages={displayedMessages}
        isLoading={isLoadingConversation || isStreaming}
      />

      <div className="border-t border-border p-4">
        {latestAssistantSymbols.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setWatchlistDialogOpen(true)}>
              <ListPlus aria-hidden="true" />
              Add tickers to watchlist
            </Button>
            <span className="text-[11px] text-muted-foreground">{latestAssistantSymbols.join(', ')}</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            aria-label="Message the assistant"
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about scans, themes, breadth, symbols, or compare internal signals with current web context."
            disabled={!assistantHealth.available || isStreaming}
            className="max-h-40 min-h-16 w-full flex-1 resize-y rounded-md border border-border bg-surface px-3 py-2 font-[inherit] text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || !assistantHealth.available || isStreaming}
            className="min-w-[110px]"
          >
            Send
            <SendHorizontal aria-hidden="true" />
          </Button>
        </div>
      </div>

      <AssistantWatchlistDialog
        open={watchlistDialogOpen}
        symbols={latestAssistantSymbols}
        onClose={() => setWatchlistDialogOpen(false)}
      />
    </section>
  );
}

export default AssistantChat;
