import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import OptionsSymbolDetailView from '../../features/options/OptionsSymbolDetailView';
import { useStaticMarket } from '../StaticMarketContext';
import {
  resolveStaticMarketEntry,
  staticQueryOptions,
  useStaticGeneration,
  useStaticManifest,
} from '../dataClient';
import { getStaticOptionsManifest, staticOptionsSymbolQueryOptions } from '../optionsClient';

export default function StaticOptionsSymbolPage() {
  const navigate = useNavigate();
  const { symbol: routeSymbol = '' } = useParams();
  const symbol = routeSymbol.trim().toUpperCase();
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
  const detailSetup = useMemo(() => {
    if (!manifestQuery.data) return { options: null, setupError: null };
    try {
      return { options: staticOptionsSymbolQueryOptions(manifestQuery.data, symbol, generation), setupError: null };
    } catch (error) {
      return { options: null, setupError: error };
    }
  }, [generation, manifestQuery.data, symbol]);
  const detailQuery = useQuery({
    ...(detailSetup.options || {
      queryKey: ['options-analytics', 'symbol', 'static', 'unavailable', symbol],
      queryFn: async () => null,
    }),
    enabled: Boolean(detailSetup.options) && !manifestQuery.isPlaceholderData,
  });

  if (manifestQuery.isLoading || (detailSetup.options && detailQuery.isLoading)) {
    return <div role="status" aria-label="Loading" className="tw flex justify-center p-12"><span aria-hidden="true" className="inline-block size-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" /></div>;
  }
  if (manifestQuery.isError || detailSetup.setupError || detailQuery.isError || !detailQuery.data) {
    return (
      <div className="tw">
        <Notice action={<Button asChild variant="secondary" size="sm"><RouterLink to="/options">Back to Command Center</RouterLink></Button>}>
          <h1 className="text-lg font-semibold">{symbol || 'This symbol'} is not in the published options cohort</h1>
          <p className="text-sm">Static detail files exist only for today’s advertised symbols.</p>
        </Notice>
      </div>
    );
  }

  return <OptionsSymbolDetailView data={detailQuery.data} onBack={() => navigate('/options')} />;
}
