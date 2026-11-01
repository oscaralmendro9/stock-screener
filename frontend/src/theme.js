import { useCallback, useEffect, useRef, useState } from 'react';

export const COLOR_MODE_STORAGE_KEY = 'stockscanner-color-mode';

// Saved choice first, then the OS preference; the app has always opened dark.
// index.html runs the same lookup inline so the first paint matches.
export function readColorMode() {
  try {
    const saved = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be blocked (private mode, sandboxed iframes).
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function saveColorMode(mode) {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Not persisting is fine; the toggle still works for this session.
  }
}

// Until the user toggles, the mode tracks the OS live (e.g. an automatic
// sunset switch); a toggle saves the choice, which readColorMode then prefers.
export function useColorMode() {
  const [mode, setMode] = useState(readColorMode);
  // In memory too, so a toggle sticks for the session even when storage is blocked.
  const userChose = useRef(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!query?.addEventListener) return undefined;
    const follow = () => {
      if (!userChose.current) setMode(readColorMode());
    };
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);

  const toggleColorMode = useCallback(() => {
    const next = mode === 'light' ? 'dark' : 'light';
    userChose.current = true;
    saveColorMode(next);
    setMode(next);
  }, [mode]);

  return { mode, toggleColorMode };
}

// Mobile browser bar colour per mode: the surface token in styles/tailwind.css.
export const THEME_COLOR = { dark: '#0f0f10', light: '#ffffff' };
