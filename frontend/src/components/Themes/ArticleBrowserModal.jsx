import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/ui/button';
import { Dialog, DialogContent } from '@/ui/dialog';
import { cn } from '@/lib/cn';
import { getContentItems, exportContentItems } from '../../api/themes';
import TranslatedText from '../common/TranslatedText';
import { Pager, Pill, Select, SortHeader, Spinner } from '../../features/themes/themeUi';
import { linkClass, tdClass, thClass } from '../../features/themes/themeClasses';

function TitleCell({ item }) {
  const originalDisplay =
    item.title
    || (item.content
      ? item.content.slice(0, 100) + (item.content.length > 100 ? '...' : '')
      : 'Untitled');
  const titleNode = (
    <span className="flex items-start">
      <TranslatedText
        originalText={originalDisplay}
        translatedText={item.translated_title || null}
        sourceLanguage={item.source_language}
        translationMetadata={item.translation_metadata}
        textClassName={cn('line-clamp-2', item.url && 'font-medium text-accent')}
      />
      {item.url && <ExternalLink aria-hidden="true" className="mt-1 ml-1 size-3 shrink-0 text-accent" />}
    </span>
  );
  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {titleNode}
    </a>
  ) : (
    titleNode
  );
}

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'substack', label: 'Substack' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'news', label: 'News' },
  { value: 'reddit', label: 'Reddit' },
];

const SENTIMENT_OPTIONS = [
  { value: '', label: 'All Sentiments' },
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
  { value: 'neutral', label: 'Neutral' },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const SENTIMENT_TONE = { bullish: 'gain', bearish: 'loss' };
const PROCESSING_TONE = { processed: 'gain', failed_retryable: 'warning', failed_terminal: 'loss' };

function ArticleBrowserModal({ open, onClose, pipeline }) {
  // State for filters and pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState('published_at');
  const [order, setOrder] = useState('desc');
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build query params
  const queryParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    source_type: sourceType || undefined,
    sentiment: sentiment || undefined,
    pipeline: pipeline || undefined,
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    sort_by: orderBy,
    sort_order: order,
  }), [debouncedSearch, sourceType, sentiment, pipeline, rowsPerPage, page, orderBy, order]);

  // Fetch content items
  const { data, isLoading, error } = useQuery({
    queryKey: ['contentItems', pipeline, queryParams],
    queryFn: () => getContentItems(queryParams),
    enabled: open,
    keepPreviousData: true,
  });

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const exportParams = {
        search: debouncedSearch || undefined,
        source_type: sourceType || undefined,
        sentiment: sentiment || undefined,
        pipeline: pipeline || undefined,
        sort_by: orderBy,
        sort_order: order,
      };
      const blob = await exportContentItems(exportParams);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `theme_articles_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export articles. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const sortHeader = (field, label) => (
    <SortHeader label={label} active={orderBy === field} order={order} onSort={() => handleSort(field)} />
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title="Browse Articles" size="xl" className="sm:h-[90vh]">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          {data && <Pill tone="muted" className="tabular-nums">{`${data.total} items`}</Pill>}
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={!data?.total || exporting}>
            {exporting ? <Spinner label="Exporting" className="size-4" /> : <Download aria-hidden="true" />}
            {exporting ? 'Exporting...' : 'CSV'}
          </Button>
          <label className="relative flex min-w-[280px] flex-col gap-0.5">
            <span className="sr-only">Search articles</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search title, source, or ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-surface pr-2.5 pl-8 font-[inherit] text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-8"
            />
          </label>
          <Select label="Source Type" value={sourceType} onChange={(value) => { setSourceType(value); setPage(0); }} className="w-36">
            {SOURCE_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
          <Select label="Sentiment" value={sentiment} onChange={(value) => { setSentiment(value); setPage(0); }} className="w-36">
            {SENTIMENT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
        </div>

        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center"><Spinner label="Loading articles" /></div>
        ) : error ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <p role="alert" className="text-loss">Error loading articles: {error.message}</p>
          </div>
        ) : (
          <>
            <div className="max-h-[calc(90vh-280px)] overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {sortHeader('title', 'Title')}
                    {sortHeader('source_name', 'Source')}
                    <th scope="col" className={cn(thClass(), 'min-w-20')}>Type</th>
                    {sortHeader('published_at', 'Published')}
                    <th scope="col" className={cn(thClass(), 'min-w-[120px]')}>Status</th>
                    <th scope="col" className={cn(thClass(), 'min-w-[180px]')}>Themes</th>
                    <th scope="col" className={cn(thClass(), 'min-w-20')}>Sentiment</th>
                    <th scope="col" className={cn(thClass(), 'min-w-[150px]')}>Tickers</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items?.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-surface-subtle">
                      <td className={cn(tdClass, 'min-w-[250px]')}>
                        <div className="max-w-[300px]">
                          <TitleCell item={item} />
                          {item.author && <span className="text-[11px] text-muted-foreground">by {item.author}</span>}
                        </div>
                      </td>
                      <td className={cn(tdClass, 'min-w-[100px]')}><span className="block max-w-[120px] truncate">{item.source_name || '-'}</span></td>
                      <td className={tdClass}><Pill tone="muted" className="h-5">{item.source_type}</Pill></td>
                      <td className={cn(tdClass, 'text-[11px] tabular-nums')}>{formatDate(item.published_at)}</td>
                      <td className={tdClass}>
                        {item.processing_status ? (
                          <Pill tone={PROCESSING_TONE[item.processing_status] || 'muted'} className="h-5 capitalize">
                            {item.processing_status.replaceAll('_', ' ')}
                          </Pill>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className={tdClass}>
                        <span className="flex flex-wrap gap-1">
                          {item.themes.slice(0, 3).map((theme) => (
                            <Pill key={theme.id} title={theme.name} className="h-5">
                              {theme.name.length > 15 ? `${theme.name.slice(0, 15)}...` : theme.name}
                            </Pill>
                          ))}
                          {item.themes.length > 3 && (
                            <Pill tone="muted" className="h-5" title={item.themes.slice(3).map(t => t.name).join(', ')}>
                              {`+${item.themes.length - 3}`}
                            </Pill>
                          )}
                        </span>
                      </td>
                      <td className={tdClass}>
                        {item.primary_sentiment ? (
                          <Pill tone={SENTIMENT_TONE[item.primary_sentiment] || 'muted'} className="h-5 capitalize">{item.primary_sentiment}</Pill>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className={tdClass}>
                        <span className="flex flex-wrap gap-0.5">
                          {item.tickers.slice(0, 4).map((ticker) => (
                            <Pill key={ticker} className="h-[18px] font-semibold">{ticker}</Pill>
                          ))}
                          {item.tickers.length > 4 && (
                            <Pill tone="muted" className="h-[18px]" title={item.tickers.slice(4).join(', ')}>{`+${item.tickers.length - 4}`}</Pill>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data?.items?.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">No articles found matching your filters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Rows per page:
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  className="h-8 cursor-pointer rounded-md border border-border bg-surface px-1.5 font-[inherit] text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <Pager page={page} pageSize={rowsPerPage} total={data?.total || 0} onPage={setPage} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ArticleBrowserModal;
