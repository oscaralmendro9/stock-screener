# Design system

The single source for UI decisions. It reconciles the two installed skills:
`ui-ux-pro-max` (direction: palette, type, density) and `ui-skills`
(`baseline-ui`, `fixing-accessibility`, `fixing-motion-performance`: hard rules).
Where they disagree, the rule from `ui-skills` wins.

The raw generator output lives in `design-system/mercados/MASTER.md`; the
choices below override it.

## Direction

- **Style:** data-dense financial dashboard, dark by default with a light mode.
  Flat surfaces separated by borders, not shadows. No gradients, no glow.
- **Density:** 8/10. Desktop is compact; phones keep 44px touch targets.
- **Motion:** 2/10. Color/opacity feedback ≤150ms with `ease-out`. No hover
  lift, no scroll reveals. Respect `prefers-reduced-motion`.

## Tokens

Defined in `frontend/src/styles/tailwind.css`, mirrored from `PALETTES` in
`frontend/src/theme.js` so migrated and MUI pages match during the migration.

| Token | Use |
|---|---|
| `background`, `surface`, `surface-subtle` | Page, cards, inset areas |
| `foreground`, `muted-foreground` | Text |
| `border` | Dividers and card edges |
| `accent` | The one accent: selection, focus, primary action |
| `gain` / `loss` | Reserved for price direction only |
| `warning` | Stale data, partial sessions |

### Face: ink and teal (chosen 2026-10-31)

- **Palette:** near-neutral ink chrome (light ground `#f7f7f7`, surfaces
  white/`#f3f3f3`, text `#111111`/`#5f6368`; dark ground `#080808`, surfaces
  `#0f0f10`/`#18191b`, text `#efefef`/`#8f9196`). Colour lives on data.
- **Accent:** teal, `#0b7285` light / `#38b2c4` dark. Pushed toward blue from
  the first pick (`#0b7a6e`/`#2bb8a6`) so it sits ~30° of hue away from the
  gain green and never reads as "up". It is also chart series 1.
- **Type:** bundled **Instrument Sans** (OFL, latin + latin-ext, weights
  400-700), with Inter's Greek subset as the fallback for β and Δ. No
  third-party font requests; `selfHostedFont.test.js` enforces it.
- **Contrast** (WCAG AA, checked on every surface): text, muted text, accent,
  gain, loss and warning all ≥4.5:1 in both modes; text on the accent fill
  5.6:1 light, 7.6:1 dark.

Also changed from the generator: dark modals and inputs instead of white;
focus ring uses `accent` instead of white.

## Rules (must)

- Numbers use `tabular-nums`. Price direction always carries a sign or arrow
  (`<Change>`), never color alone.
- Accessible primitives (Radix) for anything with focus or keyboard behavior;
  icon-only buttons get `aria-label`. Lucide icons, no emoji.
- `h-dvh`, not `h-screen`; fixed bars respect `safe-area-inset-*`.
- Fixed z-index scale: `z-nav`, `z-overlay`, `z-modal`, `z-toast`.
- Destructive actions confirm with an alert dialog. Errors appear next to the
  action that caused them. Loading states are structural skeletons.
- Responsive checks at 375, 768, 1024 and 1440px. Phones use the bottom tab
  bar (≤5 items).

## Migration

1. New code uses Tailwind + `frontend/src/ui/*` (shadcn-style, `components.json`).
2. Pages migrate one at a time; a migrated page imports nothing from `@mui/*`.
3. Tailwind preflight is off until the last MUI page is gone. Instead, a
   scoped reset applies inside elements with the `tw` class (links, buttons,
   inputs, lists); put `tw` on the root of every migrated surface.
4. The global `*` reset in `index.css` lives in `@layer base`; unlayered it
   would override every Tailwind margin/padding utility.
5. Never nest one primitive system's modal inside another's (Radix around
   MUI dialogs blocks their clicks). Migrate a modal and its contents together.
6. The live market selector is a native `<select>`: tests drive it with
   `selectOptions` / `selectOption`, not by clicking an option.
