import { useMemo, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Link as LinkIcon, User } from 'lucide-react';

import ReactMarkdown from 'react-markdown';

import { cn } from '@/lib/cn';

const EMPTY_ARRAY = [];

function processContentWithCitations(content, references) {
  if (!content || !references?.length) {
    return content || '';
  }

  const referenceMap = new Map();
  references.forEach((reference) => {
    if (reference.reference_number == null) {
      return;
    }
    referenceMap.set(reference.reference_number, reference);
  });

  return content.replace(/\[(\d+)\]/g, (match, number) => {
    const reference = referenceMap.get(Number(number));
    if (!reference?.url) {
      return match;
    }
    const title = (reference.title || `Source ${number}`).replace(/"/g, "'");
    return `[[${number}]](${reference.url} "${title}")`;
  });
}

// Markdown body: element styles through arbitrary variants (no preflight yet).
const MARKDOWN = cn(
  'text-sm leading-relaxed',
  '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1',
  '[&_code]:rounded-sm [&_code]:bg-background [&_code]:px-1 [&_code]:text-[0.85em]',
  '[&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-background [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_strong]:font-semibold [&_a[href]]:font-medium [&_a[href]]:text-accent [&_a[href]]:no-underline [&_a[href]:hover]:underline',
);
const PRE = 'mt-1 overflow-auto rounded-sm bg-surface-subtle p-1 font-mono text-[11px] whitespace-pre';

function Disclosure({ open, onToggle, icon, label, children }) {
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <div className="mt-2 w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-8 cursor-pointer items-center gap-1 rounded-sm text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {icon}
        {label}
        <Chevron aria-hidden="true" className="size-4" />
      </button>
      {open && <div className="mt-1 flex flex-col gap-1.5">{children}</div>}
    </div>
  );
}

function AssistantMessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const isUser = message.role === 'user';
  const isStreaming = Boolean(message.isStreaming);
  const references = message.source_references ?? message.sourceReferences ?? EMPTY_ARRAY;
  const toolCalls = message.tool_calls ?? message.toolCalls ?? EMPTY_ARRAY;
  const processedContent = useMemo(
    () => processContentWithCitations(message.content, references),
    [message.content, references],
  );

  return (
    <div className={cn('flex max-w-[88%] flex-col', isUser ? 'items-end self-end' : 'items-start self-start')}>
      <div className={cn('mb-1 flex items-center gap-2', isUser && 'flex-row-reverse')}>
        <span className="grid size-7 place-items-center rounded-full bg-surface-subtle text-muted-foreground">
          {isUser ? <User aria-hidden="true" className="size-4" /> : <Bot aria-hidden="true" className="size-4" />}
        </span>
        <span className="text-[11px] text-muted-foreground">{isUser ? 'You' : 'Assistant'}</span>
      </div>

      <div
        className={cn(
          'max-w-full rounded-lg border p-4 break-words',
          isUser
            ? 'border-border bg-surface-subtle text-foreground'
            : message.isError
              ? 'border-loss/40 bg-loss/10 text-foreground'
              : 'border-border bg-surface text-foreground',
        )}
      >
        {isStreaming && !message.content ? (
          <div role="status" className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="inline-block size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
            Thinking...
          </div>
        ) : (
          <div className={MARKDOWN}>
            <ReactMarkdown>{processedContent}</ReactMarkdown>
          </div>
        )}

        {isStreaming && message.content && (
          <span aria-hidden="true" className="ml-1 inline-block h-4 w-2 bg-accent motion-safe:animate-pulse" />
        )}
      </div>

      {!isUser && toolCalls.length > 0 && (
        <Disclosure open={showTools} onToggle={() => setShowTools((previous) => !previous)} label={`Tool activity (${toolCalls.length})`}>
          {toolCalls.map((toolCall, index) => (
            <div key={`${toolCall.tool}-${index}`} className="rounded-md border border-border p-2">
              <p className="text-[11px] font-semibold">{toolCall.tool}</p>
              {toolCall.args && <pre className={cn(PRE, 'max-h-[120px]')}>{JSON.stringify(toolCall.args, null, 2)}</pre>}
              {toolCall.result && <pre className={cn(PRE, 'max-h-[150px]')}>{JSON.stringify(toolCall.result, null, 2)}</pre>}
            </div>
          ))}
        </Disclosure>
      )}

      {!isUser && references.length > 0 && (
        <Disclosure
          open={showSources}
          onToggle={() => setShowSources((previous) => !previous)}
          icon={<LinkIcon aria-hidden="true" className="size-4" />}
          label={`Sources (${references.length})`}
        >
          {references.map((reference, index) => (
            <div key={`${reference.url}-${index}`} className="flex gap-2 rounded-md border border-border p-2">
              <span className="shrink-0 text-[11px] font-semibold tabular-nums">
                [{reference.reference_number || index + 1}]
              </span>
              <div className="min-w-0">
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-accent no-underline hover:underline"
                >
                  {reference.title}
                </a>
                {(reference.section || reference.snippet) && (
                  <p className="mt-0.5 text-[11px] whitespace-pre-wrap text-muted-foreground">
                    {[reference.section, reference.snippet].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </Disclosure>
      )}
    </div>
  );
}

export default AssistantMessageBubble;
