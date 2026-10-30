/**
 * Watchlists as their own section (they used to be a tab inside Daily).
 */
import WatchlistsTab from '../components/MarketScan/WatchlistsTab';
import { FullHeightPane } from '../components/Layout/SectionTabs';

export default function WatchlistsPage() {
  return (
    <FullHeightPane>
      <WatchlistsTab />
    </FullHeightPane>
  );
}
