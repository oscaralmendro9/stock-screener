
export const groupRsTone = (value) => {
  if (!Number.isFinite(value)) return 'neutral';
  const displayedValue = Number(value.toFixed(1));
  if (displayedValue >= 80) return 'up-strong';
  if (displayedValue >= 70) return 'up-soft';
  if (displayedValue <= 20) return 'down-strong';
  if (displayedValue <= 30) return 'down-soft';
  return 'neutral';
};


// Translucent gain/loss tints on the RS bands above, so the tables, the group
// matrix and its legend, and data-rs-tone all agree.
export const GROUP_RS_TINT_CLASS = {
  'up-strong': 'bg-gain/40',
  'up-soft': 'bg-gain/20',
  'down-soft': 'bg-loss/20',
  'down-strong': 'bg-loss/35',
};
