import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Card } from '@/ui/card';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';

import CotPositioningChart from './CotPositioningChart';
import CotSummaryStrip from './CotSummaryStrip';
import { latestFocalSummary, priceStateLabel } from './cotPresentation';

const RANGES = [['1y', '1Y'], ['3y', '3Y'], ['5y', '5Y']];
const MODES = [['net', 'Net'], ['long_short', 'Long & Short']];

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex self-start rounded-md border border-border p-0.5 md:self-end">
      {options.map(([optionValue, optionLabel]) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          onClick={() => { if (value !== optionValue) onChange(optionValue); }}
          className={cn(
            'h-9 cursor-pointer rounded-sm px-3 text-xs font-semibold whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7',
            value === optionValue ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
          )}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

function CotSkeleton() {
  const block = 'rounded-md bg-surface-subtle motion-safe:animate-pulse';
  return (
    <Card role="status" className="tw flex flex-col gap-3 p-4">
      <span className="sr-only">Loading COT positioning</span>
      <div className={`${block} h-6 w-48`} />
      <div className={`${block} h-4 w-96 max-w-full`} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`${block} h-12`} />)}
      </div>
      <div className={`${block} h-[370px]`} />
    </Card>
  );
}

const CotPositioningView = ({
  catalog = null,
  history = null,
  selectedSlug = 'sp-500',
  range = '1y',
  onSelectInstrument = () => {},
  onRangeChange = () => {},
  isLoading = false,
  error = null,
}) => {
  const [mode, setMode] = useState('net');
  const [participant, setParticipant] = useState(null);
  const [visibleParticipants, setVisibleParticipants] = useState([]);
  const currentParticipants = history?.weeks?.[0]?.positions || [];

  useEffect(() => {
    const nextParticipants = history?.weeks?.[0]?.positions || [];
    if (!nextParticipants.length) return;
    setParticipant((current) => (
      nextParticipants.some((item) => item.participant === current)
        ? current
        : history.focal_participant
    ));
    setVisibleParticipants(nextParticipants.map((item) => item.participant));
  }, [history]); // Reset controls when the selected market changes.

  const grouped = useMemo(() => {
    const groups = new Map();
    (catalog?.instruments || []).forEach((instrument) => {
      const values = groups.get(instrument.category) || [];
      values.push(instrument);
      groups.set(instrument.category, values);
    });
    return [...groups.entries()];
  }, [catalog]);
  const summary = latestFocalSummary(catalog, history);

  if (isLoading) return <CotSkeleton />;
  if (error) return <Notice tone="error" className="tw">Unable to load COT positioning.</Notice>;
  if (!catalog || !history?.weeks?.length) return <Notice tone="info" className="tw">No COT history is available.</Notice>;

  const toggleParticipant = (value) => setVisibleParticipants((current) => (
    current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  ));

  return (
    <Card className="tw flex min-w-0 flex-col gap-4 p-3 md:p-4">
      <div>
        <h2 className="text-lg font-semibold">COT Positioning</h2>
        <p className="text-sm text-muted-foreground">
          Weekly CFTC futures positioning with long, short, net, and three-year percentile context.
        </p>
      </div>
      {history.publication.stale && (
        <Notice tone="warning">COT publication is stale; the last valid publication remains active.</Notice>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <NativeSelect
          label="Market"
          ariaLabel="COT instrument"
          value={selectedSlug}
          onChange={onSelectInstrument}
          className="md:w-60"
        >
          {grouped.map(([category, instruments]) => (
            <optgroup key={category} label={category.replaceAll('_', ' ')}>
              {instruments.map((instrument) => <option key={instrument.slug} value={instrument.slug}>{instrument.display_name}</option>)}
            </optgroup>
          ))}
        </NativeSelect>
        <Segmented label="COT history range" options={RANGES} value={range} onChange={onRangeChange} />
        <Segmented label="COT chart mode" options={MODES} value={mode} onChange={setMode} />
        {mode === 'long_short' && (
          <NativeSelect
            label="Participant"
            ariaLabel="CFTC participant"
            value={participant || ''}
            onChange={setParticipant}
            className="md:w-56"
          >
            {currentParticipants.map((item) => <option key={item.participant} value={item.participant}>{item.label}</option>)}
          </NativeSelect>
        )}
      </div>
      <CotSummaryStrip summary={summary} />
      <p className="text-sm text-muted-foreground">
        {priceStateLabel(history.price_mapping_kind, history.price_coverage_state)}
      </p>
      {history.price_mapping_kind === 'unavailable' && history.tradingview_url && (
        <a
          href={history.tradingview_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-start text-sm text-accent hover:underline"
        >
          View contract on TradingView
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      )}
      <CotPositioningChart
        history={history}
        mode={mode}
        participant={participant || history.focal_participant}
        visibleParticipants={visibleParticipants}
        onToggleParticipant={toggleParticipant}
      />
      <p className="text-xs text-muted-foreground tabular-nums">
        Source: CFTC {history.source_dataset_id} · Report {history.publication.report_date} · Retrieved {new Date(history.publication.retrieved_at).toLocaleString()}
      </p>
    </Card>
  );
};

export default CotPositioningView;
