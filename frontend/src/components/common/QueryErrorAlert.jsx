import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';

import { describeRequestError } from '../../utils/requestErrors';

/** Page-level load error: what failed, why in plain words, and a retry. */
export default function QueryErrorAlert({ title, error, onRetry, className }) {
  return (
    <Notice
      tone="error"
      className={className}
      action={onRetry ? <Button variant="secondary" size="sm" onClick={() => onRetry()}>Retry</Button> : undefined}
    >
      {title}: {describeRequestError(error)}
    </Notice>
  );
}
