/**
 * Price-derived statistics for the stock page's key-stats grid, computed from
 * the dashboard's daily OHLCV history (oldest first, ~6 months). Each returns
 * null when the history is too short, so the grid shows "-" instead of a
 * number built on too few sessions.
 */

const closesOf = (history) => history.map((bar) => bar.close).filter((value) => Number.isFinite(value));

/** % change over the last `sessions` sessions. */
export function performance(history, sessions) {
  const closes = closesOf(history);
  if (closes.length <= sessions) return null;
  const last = closes[closes.length - 1];
  const base = closes[closes.length - 1 - sessions];
  return base ? (last / base - 1) * 100 : null;
}

export function sma(history, length) {
  const closes = closesOf(history);
  if (closes.length < length) return null;
  const window = closes.slice(-length);
  return window.reduce((sum, value) => sum + value, 0) / length;
}

/** % distance of the last close from a level (e.g. a moving average). */
export function distancePct(price, level) {
  if (!Number.isFinite(price) || !Number.isFinite(level) || level === 0) return null;
  return (price / level - 1) * 100;
}

/** Wilder's RSI over `length` sessions. */
export function rsi(history, length = 14) {
  const closes = closesOf(history);
  if (closes.length <= length) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= length; i += 1) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }
  gain /= length;
  loss /= length;
  for (let i = length + 1; i < closes.length; i += 1) {
    const change = closes[i] - closes[i - 1];
    gain = (gain * (length - 1) + Math.max(change, 0)) / length;
    loss = (loss * (length - 1) + Math.max(-change, 0)) / length;
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

/** Average true range over the last `length` sessions, in price units. */
export function atr(history, length = 14) {
  if (history.length <= length) return null;
  const ranges = [];
  for (let i = history.length - length; i < history.length; i += 1) {
    const bar = history[i];
    const prevClose = history[i - 1]?.close;
    ranges.push(Math.max(bar.high - bar.low, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose)));
  }
  return ranges.reduce((sum, value) => sum + value, 0) / length;
}

/** Average daily high-low range as % of the close (Finviz's "Volatility"). */
export function rangeVolatility(history, sessions) {
  if (history.length < sessions) return null;
  const window = history.slice(-sessions);
  return (window.reduce((sum, bar) => sum + (bar.high - bar.low) / bar.close, 0) / sessions) * 100;
}

export function averageVolume(history, sessions = 50) {
  const volumes = history.map((bar) => bar.volume).filter((value) => Number.isFinite(value));
  if (volumes.length < Math.min(sessions, 20)) return null;
  const window = volumes.slice(-sessions);
  return window.reduce((sum, value) => sum + value, 0) / window.length;
}

/** Last session's volume against the average of the sessions before it. */
export function relativeVolume(history, sessions = 50) {
  if (history.length < 21) return null;
  const last = history[history.length - 1]?.volume;
  const average = averageVolume(history.slice(0, -1), sessions);
  return average ? last / average : null;
}

/** 1-day change of the last close, in %. */
export function dayChange(history) {
  return performance(history, 1);
}
