import { useEffect, useState } from 'react';
import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/ui/dialog';
import { TabBar } from '../../features/themes/themeUi';
import { ThemeMergeReviewContent } from './ThemeMergeReviewModal';
import { ThemeCandidateReviewContent } from './ThemeCandidateReviewModal';

function ThemeReviewDialog({ open, onClose, pipeline, initialTab = 0, mergeCount = 0, candidateCount = 0 }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title="Theme Review" size="lg" bodyClassName="p-0">
        <TabBar
          label="Theme review"
          className="px-2"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 0, label: 'Merges', count: mergeCount, icon: <ArrowLeftRight aria-hidden="true" className="size-4" /> },
            { value: 1, label: 'Candidates', count: candidateCount, icon: <Sparkles aria-hidden="true" className="size-4" /> },
          ]}
        />
        {tab === 0 && <ThemeMergeReviewContent onClose={onClose} />}
        {tab === 1 && <ThemeCandidateReviewContent pipeline={pipeline} />}
      </DialogContent>
    </Dialog>
  );
}

export default ThemeReviewDialog;
