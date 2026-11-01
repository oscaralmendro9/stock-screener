// Turn a failed request into words a reader can act on. Plain errors that
// already carry a message (e.g. thrown by a contract check) keep it.
export function describeRequestError(error) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  if (status === 404) return 'nothing has been published yet. It appears after the next data refresh';
  if (status === 401 || status === 403) return 'your session has ended. Sign in again';
  if (status >= 500) return 'the server had a problem. Try again in a moment';
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error')) {
    return "the server can't be reached. Check your connection";
  }
  if (!error?.message || /^Request failed with status code/.test(error.message)) return 'the request failed';
  return error.message;
}
