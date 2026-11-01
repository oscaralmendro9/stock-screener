import '@testing-library/jest-dom';

// jsdom doesn't ship ResizeObserver, which Recharts' ResponsiveContainer
// requires on mount. Stub it so components that render charts don't throw.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// cmdk scrolls the highlighted item into view; jsdom has no layout to scroll.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
