import { useCallback, useSyncExternalStore } from 'react';

// Subscribe to a CSS media query without MUI. Without matchMedia (tests,
// very old browsers) it reports false, which picks the desktop shell.
export function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    const list = window.matchMedia?.(query);
    if (!list?.addEventListener) return () => {};
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  const getSnapshot = () => Boolean(window.matchMedia?.(query).matches);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
