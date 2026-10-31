import { useCallback, useEffect, useRef, useState } from 'react';
import { alpha } from '@mui/material/styles';

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

// One accent (primary) for selection and focus. success/error are reserved for
// gains and losses. index.css repeats background.default for the pre-React paint.
const PALETTES = {
  dark: {
    primary: { main: '#7b93ff', contrastText: '#0b0d12' },
    secondary: { main: '#b197fc', contrastText: '#0b0d12' },
    success: { main: '#2ebd85' },
    // Dark text on the red fill: 5.5:1 vs 3.5:1 for white.
    error: { main: '#f6465d', contrastText: '#0b0d12' },
    background: { default: '#0b0d12', paper: '#12151c', subtle: '#181c25' },
    divider: '#242a37',
    text: { primary: '#e7e9ee', secondary: '#8b93a7', disabled: '#5b6378' },
  },
  light: {
    primary: { main: '#3b5bdb', contrastText: '#ffffff' },
    secondary: { main: '#7048e8', contrastText: '#ffffff' },
    // Darker than the dark-mode tones so the .main values pass 4.5:1 as small
    // text on every light surface (paper, default and subtle).
    success: { main: '#0c7d56' },
    error: { main: '#c92a37' },
    warning: { main: '#b45309' },
    background: { default: '#f5f6f8', paper: '#ffffff', subtle: '#f2f4f7' },
    divider: '#e3e6ec',
    text: { primary: '#111827', secondary: '#5f6b7f', disabled: '#98a2b3' },
  },
};

// Filled chips as soft tints (like `Badge` in src/ui) instead of solid fills,
// so unmigrated pages read like the Tailwind ones. An sx background still wins.
function softChipRoot({ ownerState, theme }) {
  const base = { borderRadius: 6, fontWeight: 500 };
  if (ownerState.variant === 'outlined') {
    // Colored outlines keep their tone; only the neutral one softens.
    return !ownerState.color || ownerState.color === 'default' ? { ...base, borderColor: theme.palette.divider } : base;
  }
  const tone = ownerState.color && ownerState.color !== 'default' ? theme.palette[ownerState.color] : null;
  if (!tone?.main) {
    return { ...base, backgroundColor: theme.palette.background.subtle, color: theme.palette.text.secondary };
  }
  return {
    ...base,
    backgroundColor: alpha(tone.main, 0.15),
    color: tone.main,
    '&.MuiChip-clickable:hover, &.MuiChip-deletable:hover': { backgroundColor: alpha(tone.main, 0.24) },
    '& .MuiChip-icon, & .MuiChip-deleteIcon': { color: 'inherit' },
  };
}

export const getDesignTokens = (mode) => {
  const palette = PALETTES[mode];
  return {
    palette: { mode, ...palette },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 13,
      body1: {
        fontSize: '14px',
      },
      body2: {
        fontSize: '13px',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '11px',
      },
      h6: {
        fontSize: '15px',
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Columns of prices and scores line up without a monospace font.
          body: { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          // Flat surfaces: no dark-mode elevation tint.
          root: { backgroundImage: 'none' },
          // Page-level cards (default elevation) get a border instead of a
          // shadow; menus and popovers keep their higher-elevation shadows.
          elevation1: { boxShadow: 'none', border: `1px solid ${palette.divider}` },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 6 },
          outlined: { borderColor: palette.divider },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: palette.background.subtle,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.divider },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.text.disabled },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8 },
          standard: { border: '1px solid', borderColor: alpha(palette.text.primary, 0.08) },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 6, fontSize: '11px' },
        },
      },
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
          color: 'inherit',
        },
        styleOverrides: {
          root: {
            backgroundColor: palette.background.paper,
            borderBottom: `1px solid ${palette.divider}`,
            // viewport-fit=cover: clear the status bar / notch in standalone or
            // full-screen mode (0 inside a normal browser tab).
            paddingTop: 'env(safe-area-inset-top)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '4px 6px',
            fontSize: '11px',
            lineHeight: 1.3,
            borderBottom: `1px solid ${palette.divider}`,
          },
          head: {
            // No header band: the head is the row's own surface (opaque, so a
            // sticky header still hides the rows scrolling under it).
            backgroundColor: palette.background.paper,
            color: palette.text.secondary,
            fontWeight: 500,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            padding: '6px 6px',
            whiteSpace: 'nowrap',
          },
          sizeSmall: {
            padding: '3px 5px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            height: 24,
            '&.MuiTableRow-head': {
              height: 28,
            },
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            // :where() drops the row part of these selectors to the tbody class
            // alone, tying a row's own sx class; the row's styles are inserted
            // later, so highlighted rows and per-row hover still win. Rows are
            // separated by their rules, not zebra striping.
            '& :where(.MuiTableRow-root:hover)': {
              backgroundColor: alpha(palette.primary.main, 0.08),
            },
          },
        },
      },
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            '&:hover, &.Mui-active': {
              color: palette.primary.main,
            },
            '&.Mui-active .MuiTableSortLabel-icon': {
              color: palette.primary.main,
            },
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: softChipRoot,
          sizeSmall: {
            height: 20,
            fontSize: '11px',
          },
          labelSmall: {
            padding: '0 6px',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          sizeSmall: {
            padding: 2,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 12,
            '&:last-child': {
              paddingBottom: 12,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            fontSize: '12px',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
          },
        },
      },
    },
  };
};
