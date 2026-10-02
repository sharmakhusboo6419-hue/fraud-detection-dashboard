import '@testing-library/jest-dom';

// jsdom does not implement ResizeObserver, which recharts' ResponsiveContainer
// requires. Stub it so chart-wrapped components can mount under test.
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// jsdom lacks matchMedia, used by responsive components.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => false,
  });
}
