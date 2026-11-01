import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/ui/dialog';
import { TabBar } from '../../features/themes/themeUi';
import { ManageSourcesContent } from './ManageSourcesModal';
import { ThemePolicySettingsContent } from './ThemePolicySettingsModal';

function ThemeSettingsDialog({ open, onClose, pipeline, initialTab = 0 }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title="Theme Settings" size="xl">
        <TabBar
          label="Theme settings"
          className="mb-4"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 0, label: 'Content Sources' },
            { value: 1, label: 'Policy Controls' },
          ]}
        />
        {tab === 0 && <ManageSourcesContent />}
        {tab === 1 && <ThemePolicySettingsContent pipeline={pipeline} />}
      </DialogContent>
    </Dialog>
  );
}

export default ThemeSettingsDialog;
