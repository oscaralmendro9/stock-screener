import { useQuery } from '@tanstack/react-query';
import { Notice } from '@/ui/notice';
import { useNavigate } from 'react-router-dom';

import OptionsCommandCenterView from '../../features/options/OptionsCommandCenterView';
import { useStaticMarket } from '../StaticMarketContext';
import {
  resolveStaticMarketEntry,
  staticQueryOptions,
  useStaticGeneration,
  useStaticManifest,
} from '../dataClient';
import {
  getStaticOptionsManifest,
  staticOptionsCommandCenterQueryOptions,
} from '../optionsClient';

export default function StaticOptionsPage() {
  const navigate = useNavigate();
  const rootManifest = useStaticManifest();
  const { selectedMarket } = useStaticMarket();
  const marketEntry = resolveStaticMarketEntry(rootManifest.data, selectedMarket);
  const market = marketEntry.market || selectedMarket;
  const optionsPath = marketEntry.pages?.options?.path;
  const generation = useStaticGeneration();
  const manifestQuery = useQuery(staticQueryOptions({
    key: ['options-analytics', 'manifest', 'static', market, optionsPath],
    generation: generation.generation,
    queryFn: () => getStaticOptionsManifest(marketEntry, generation.dataRoot),
    enabled: market === 'US' && Boolean(optionsPath),
    gcTime: Infinity,
  }));
  const commandOptions = manifestQuery.data
    ? staticOptionsCommandCenterQueryOptions(manifestQuery.data, generation)
    : { queryKey: ['options-analytics', 'command-center', 'static', 'pending'], queryFn: async () => null };
  // Not from the previous generation's placeholder manifest (its run id would
  // reject the new command center).
  const commandQuery = useQuery({
    ...commandOptions,
    enabled: Boolean(manifestQuery.data) && !manifestQuery.isPlaceholderData,
  });

  if (manifestQuery.isLoading || commandQuery.isLoading) {
    return <div role="status" aria-label="Loading" className="tw flex justify-center p-12"><span aria-hidden="true" className="inline-block size-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" /></div>;
  }
  if (manifestQuery.isError || commandQuery.isError || !commandQuery.data) {
    return <Notice className="tw">Options analytics are not available in this static snapshot.</Notice>;
  }

  return (
    <OptionsCommandCenterView
      data={commandQuery.data}
      onOpenSymbol={(symbol) => navigate(`/options/${encodeURIComponent(symbol)}`)}
    />
  );
}
