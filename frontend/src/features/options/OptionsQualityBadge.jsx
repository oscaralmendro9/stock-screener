import { Badge } from '@/ui/badge';

const QUALITY_META = {
  available: { label: 'Available', tone: 'accent' },
  building_history: { label: 'Building history', tone: 'neutral' },
  insufficient_quality: { label: 'Limited quality', tone: 'warning' },
  unavailable: { label: 'Unavailable', tone: 'neutral' },
  failed: { label: 'Unavailable', tone: 'loss' },
};

const humanize = (value) => String(value || '').replaceAll('_', ' ');

// The reasons ride along as hidden text for screen readers and as a hover title.
export default function OptionsQualityBadge({ state, reasonCodes = [] }) {
  const meta = QUALITY_META[state] || QUALITY_META.unavailable;
  const reasons = reasonCodes.map(humanize).join(', ');

  return (
    <Badge tone={meta.tone} title={reasons || meta.label} className="whitespace-nowrap">
      {meta.label}
      {reasons && <span className="sr-only">: {reasons}</span>}
    </Badge>
  );
}
