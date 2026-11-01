import { memo, useCallback } from 'react';

import ActionStateBadge from '../shared/ActionStateBadge';

const TD = 'border-b border-border px-1.5 py-1 text-center';

function OpportunityResultCells({ row, visible, onOpenEvidence }) {
  const handleOpen = useCallback((event) => {
    event.stopPropagation();
    onOpenEvidence(row);
  }, [onOpenEvidence, row]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <td className={`${TD} w-[48px] min-w-[48px] tabular-nums`}>
        {row.resilience_score != null
          ? Number(row.resilience_score).toFixed(1)
          : '-'}
      </td>
      <td className={`${TD} w-[105px] min-w-[105px]`}>
        <ActionStateBadge
          state={row.action_state}
          onClick={row.opportunity_state ? handleOpen : undefined}
        />
      </td>
    </>
  );
}

export default memo(OpportunityResultCells);
