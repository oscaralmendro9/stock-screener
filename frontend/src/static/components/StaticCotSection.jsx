import { useState } from 'react';
import { Notice } from '@/ui/notice';

import CotPositioningView from '../../features/cot/CotPositioningView';
import { sliceCotHistory } from '../../features/cot/cotContract';
import { useStaticCotHistory, useStaticCotIndex } from '../cotClient';

const StaticCotSection = ({ manifest }) => {
  const advertised = Boolean(manifest?.assets?.cot?.path);
  const [selectedSlug, setSelectedSlug] = useState('sp-500');
  const [range, setRange] = useState('1y');
  const indexQuery = useStaticCotIndex(manifest);
  const index = indexQuery.data || null;
  const historyQuery = useStaticCotHistory(index, selectedSlug, '5y', !indexQuery.isPlaceholderData);
  const history = historyQuery.data ? sliceCotHistory(historyQuery.data, range) : null;

  if (!advertised) return null;
  if (indexQuery.isError) {
    return <div data-testid="static-cot-section" className="tw"><Notice tone="warning">Static COT data is unavailable.</Notice></div>;
  }

  return (
    <div data-testid="static-cot-section" className="mb-4">
      <CotPositioningView
        catalog={index?.catalog || null}
        history={history}
        selectedSlug={selectedSlug}
        range={range}
        onSelectInstrument={setSelectedSlug}
        onRangeChange={setRange}
        isLoading={indexQuery.isLoading || historyQuery.isLoading}
        error={historyQuery.error}
      />
    </div>
  );
};

export default StaticCotSection;
