import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { cn } from '@/lib/cn';
import { getThemeMentions } from '../../api/themes';
import TranslatedText from '../common/TranslatedText';
import { Pill, Spinner } from '../../features/themes/themeUi';
import { linkClass, thClass, tdClass } from '../../features/themes/themeClasses';

// Sentiment tone mapping
const SENTIMENT_TONE = { bullish: 'gain', bearish: 'loss' };

// Confidence tone
const confidenceClass = (confidence) => {
  if (confidence >= 0.8) return 'text-gain';
  if (confidence >= 0.5) return 'text-warning';
  return 'text-muted-foreground';
};

// Source type label
const sourceTypeLabels = {
  substack: 'Substack',
  twitter: 'Twitter',
  news: 'News',
  reddit: 'Reddit',
};

const attachmentStatusLabels = {
  pending: 'Attachments processing',
  processing: 'Attachments processing',
  complete: 'Attachments ready',
  partial: 'Attachments partially prepared',
  failed: 'Attachments unavailable',
};

function getSafeExternalUrl(url) {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? parsedUrl.href
      : null;
  } catch {
    return null;
  }
}

export function AttachmentEvidence({ status, attachments }) {
  if (!status || status === 'none') return null;

  return (
    <div className="mt-1.5">
      <Pill tone={status === 'failed' ? 'warning' : 'muted'} className={cn('h-5', attachments?.length && 'mb-1')}>
        {attachmentStatusLabels[status] || 'Attachment status unavailable'}
      </Pill>
      {attachments?.map((attachment) => {
        const safeUrl = getSafeExternalUrl(attachment.url);
        const attachmentLabel = attachment.kind === 'image' ? 'Image attachment' : 'Linked article';
        return (
          <div key={`${attachment.kind}-${attachment.url}`} className="text-[11px] leading-snug">
            {safeUrl ? (
              <a href={safeUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>{attachmentLabel}</a>
            ) : (
              <span>{attachmentLabel}</span>
            )}
            {attachment.status && attachment.status !== 'complete' && (
              <span className="text-muted-foreground"> ({attachment.status})</span>
            )}
            {attachment.error_code && (
              <span className="block text-muted-foreground">Attachment unavailable: {attachment.error_code}</span>
            )}
            {attachment.warnings?.map((warning) => (
              <span key={warning} className="block text-muted-foreground">Attachment note: {warning}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ThemeSourcesModal({ open, onClose, themeId, themeName }) {
  const { data: mentionsData, isLoading, error } = useQuery({
    queryKey: ['themeMentions', themeId],
    queryFn: () => getThemeMentions(themeId),
    enabled: open && !!themeId,
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title={`News Sources: ${themeName}`}
        size="xl"
        className="sm:min-h-[60vh]"
        footer={<DialogClose asChild><Button variant="ghost" size="sm">Close</Button></DialogClose>}
      >
        {isLoading && (
          <div className="flex justify-center p-10"><Spinner label="Loading sources" /></div>
        )}

        {error && (
          <p role="alert" className="text-loss">Error loading sources: {error.message}</p>
        )}

        {mentionsData && mentionsData.mentions?.length > 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Found {mentionsData.total_count} news items mentioning this theme
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={cn(thClass(), 'min-w-[250px]')}>Title</th>
                    <th scope="col" className={cn(thClass(), 'min-w-[300px]')}>Excerpt</th>
                    <th scope="col" className={cn(thClass('center'), 'min-w-[100px]')}>Source</th>
                    <th scope="col" className={cn(thClass(), 'min-w-[100px]')}>Author</th>
                    <th scope="col" className={cn(thClass('center'), 'min-w-[90px]')}>Sentiment</th>
                    <th scope="col" className={cn(thClass('center'), 'min-w-[90px]')}>Confidence</th>
                    <th scope="col" className={cn(thClass(), 'min-w-[100px]')}>Date</th>
                    <th scope="col" className={cn(thClass(), 'min-w-[120px]')}>Tickers</th>
                  </tr>
                </thead>
                <tbody>
                  {mentionsData.mentions.map((mention) => (
                    <tr key={mention.mention_id} className="align-top hover:bg-surface-subtle">
                      <td className={tdClass}>
                        <span className="flex items-start gap-1">
                          <span className="max-w-[230px] truncate font-medium">{mention.content_title || 'Untitled'}</span>
                          {mention.content_url && (
                            <a
                              href={mention.content_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open original"
                              title="Open original"
                              className="grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <ExternalLink aria-hidden="true" className="size-4" />
                            </a>
                          )}
                        </span>
                      </td>

                      <td className={tdClass}>
                        {mention.claim_support?.theme === 'inferred' && (
                          <span className="block text-[11px] text-muted-foreground">Theme inferred from source context</span>
                        )}
                        {mention.development && (
                          <p className="mb-1.5 text-sm"><strong>Development: </strong>{mention.development}</p>
                        )}
                        <AttachmentEvidence status={mention.attachment_status} attachments={mention.attachments} />
                        <TranslatedText
                          originalText={mention.excerpt}
                          translatedText={mention.translated_excerpt}
                          sourceLanguage={mention.source_language}
                          translationMetadata={mention.translation_metadata}
                          textClassName="line-clamp-3 max-w-[280px] text-muted-foreground"
                        />
                      </td>

                      <td className={cn(tdClass, 'text-center')}>
                        <Pill tone="muted">{sourceTypeLabels[mention.source_type] || mention.source_type}</Pill>
                        {mention.source_name && (
                          <span className="block text-[11px] text-muted-foreground">{mention.source_name}</span>
                        )}
                      </td>

                      <td className={tdClass}>{mention.author || '-'}</td>

                      <td className={cn(tdClass, 'text-center')}>
                        {mention.sentiment ? (
                          <Pill tone={SENTIMENT_TONE[mention.sentiment] || 'muted'} className="capitalize">{mention.sentiment}</Pill>
                        ) : '-'}
                      </td>

                      <td className={cn(tdClass, 'text-center font-medium tabular-nums', confidenceClass(mention.confidence))}>
                        {mention.confidence ? `${(mention.confidence * 100).toFixed(0)}%` : '-'}
                      </td>

                      <td className={cn(tdClass, 'text-[11px] text-muted-foreground')}>{formatDate(mention.published_at)}</td>

                      <td className={tdClass}>
                        <span className="flex flex-wrap gap-1">
                          {mention.tickers?.slice(0, 3).map((ticker) => (
                            <Pill key={ticker} tone="muted" className="h-5">{ticker}</Pill>
                          ))}
                          {mention.tickers?.length > 3 && (
                            <Pill tone="muted" className="h-5">{`+${mention.tickers.length - 3}`}</Pill>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {mentionsData && mentionsData.mentions?.length === 0 && (
          <p className="p-6 text-center text-muted-foreground">No news sources found for this theme.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ThemeSourcesModal;
