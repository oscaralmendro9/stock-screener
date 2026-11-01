/**
 * CFTC Commitments of Traders positioning, under Futures (it reports futures
 * positions; it used to be a tab inside Daily).
 */
import CotPositioningTab from '../features/cot/CotPositioningTab';
import { FullHeightPane, SectionTabs } from '../components/Layout/SectionTabs';

export default function CotPage() {
  return (
    <>
      <SectionTabs section="futures" />
      <FullHeightPane withTabs>
        <CotPositioningTab />
      </FullHeightPane>
    </>
  );
}
