import { formatCotNumber, formatCotPercent } from './cotPresentation';

const SummaryValue = ({ label, value }) => (
  <div className="min-w-0 rounded-md border border-border px-3 py-2">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold tabular-nums">{value}</p>
  </div>
);

const CotSummaryStrip = ({ summary }) => {
  if (!summary) return null;
  const percentile = summary.percentileStatus === 'available'
    ? formatCotPercent(summary.percentile3y, 0)
    : 'Insufficient 3Y history';
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
      <SummaryValue label="Report Date" value={summary.reportDate} />
      <SummaryValue label={`${summary.focalLabel} Long`} value={formatCotNumber(summary.long)} />
      <SummaryValue label={`${summary.focalLabel} Short`} value={formatCotNumber(summary.short)} />
      <SummaryValue label={`${summary.focalLabel} Net`} value={formatCotNumber(summary.net)} />
      <SummaryValue label="3Y Percentile" value={percentile} />
      <SummaryValue label="Tuesday-to-Tuesday Price Change" value={formatCotPercent(summary.priceChangePct)} />
    </div>
  );
};

export default CotSummaryStrip;
