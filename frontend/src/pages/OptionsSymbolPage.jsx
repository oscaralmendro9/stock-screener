import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info } from 'lucide-react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/ui/button';

import { getOptionsSymbolDetail } from '../api/optionsAnalytics';
import OptionsSymbolDetailView from '../features/options/OptionsSymbolDetailView';
import { optionsSymbolQueryKey } from '../features/options/optionsContract';

function DetailSkeleton() {
  const block = 'rounded-md bg-surface-subtle motion-safe:animate-pulse';
  return (
    <div className="tw flex flex-col gap-4" aria-busy="true" aria-label="Loading options detail">
      <div className={`${block} h-8 w-56`} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${block} h-28`} />
        <div className={`${block} h-28`} />
        <div className={`${block} h-28`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${block} h-72`} />
        <div className={`${block} h-72`} />
        <div className={`${block} h-72`} />
      </div>
    </div>
  );
}

export default function OptionsSymbolPage() {
  const navigate = useNavigate();
  const { symbol: routeSymbol = '' } = useParams();
  const symbol = routeSymbol.trim().toUpperCase();
  const detailQuery = useQuery({
    queryKey: optionsSymbolQueryKey({ mode: 'live', runId: 'published', symbol }),
    queryFn: () => getOptionsSymbolDetail(symbol),
    enabled: Boolean(symbol),
  });

  if (detailQuery.isLoading) {
    return <DetailSkeleton />;
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div role="status" className="tw flex gap-3 rounded-md border border-border bg-surface-subtle p-4">
        <Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">{symbol || 'This symbol'} is not in the published options cohort</h1>
          <p className="mb-2 text-sm text-muted-foreground">It may have dropped out of today’s current Candidates and Leaders.</p>
          <Button asChild variant="secondary" size="sm">
            <RouterLink to="/options">
              <ArrowLeft aria-hidden="true" />
              Back to Command Center
            </RouterLink>
          </Button>
        </div>
      </div>
    );
  }

  return <OptionsSymbolDetailView data={detailQuery.data} onBack={() => navigate('/options')} />;
}
