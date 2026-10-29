import { Alert, Button } from '@mui/material';

import { describeRequestError } from '../../utils/requestErrors';

/** Page-level load error: what failed, why in plain words, and a retry. */
export default function QueryErrorAlert({ title, error, onRetry, sx }) {
  return (
    <Alert
      severity="error"
      sx={sx}
      action={onRetry ? <Button color="inherit" size="small" onClick={() => onRetry()}>Retry</Button> : undefined}
    >
      {title}: {describeRequestError(error)}
    </Alert>
  );
}
