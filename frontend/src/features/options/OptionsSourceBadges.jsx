import { Badge } from '@/ui/badge';

export default function OptionsSourceBadges({ badges = [], candidateRank, leaderRank }) {
  const isCandidate = badges.includes('candidate');
  const isLeader = badges.includes('leader');
  const label = isCandidate && isLeader ? 'Both' : isCandidate ? 'Candidate' : 'Leader';
  const ranks = [
    candidateRank == null ? null : `C${candidateRank}`,
    leaderRank == null ? null : `L${leaderRank}`,
  ].filter(Boolean).join(' · ');

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Badge tone={isCandidate && isLeader ? 'accent' : 'neutral'}>{label}</Badge>
      <span className="text-xs text-muted-foreground tabular-nums">{ranks}</span>
    </span>
  );
}
