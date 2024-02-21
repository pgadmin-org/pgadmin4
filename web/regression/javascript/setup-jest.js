import '@testing-library/jest-dom';

class BroadcastChannelMock {
  onmessage() {/* mock */}
  postMessage(data) {
    this.onmessage({ data });
  }
}

global.BroadcastChannel = BroadcastChannelMock;

global.__webpack_public_path__ = '';

global.matchMedia =  (query)=>({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

class IntersectionObserver {
  observe() {return null;}
  unobserve() {return null;}
  disconnect() {return null;}
}

global.IntersectionObserver = IntersectionObserver;

import lodash from 'lodash';
global._ = lodash;


// Console error should not be called
global.beforeAll(() => {
  jest.spyOn(console, 'error');
});

global.beforeEach(() => {
  console.error.mockClear();
});

global.afterEach(() => {
  // eslint-disable-next-line no-undef
  expect(console.error).not.toHaveBeenCalled();
});

window.HTMLElement.prototype.scrollIntoView = function() {};

// required for Codemirror 6 to run in jsdom
document.createRange = () => {
  const range = new Range();

  range.getBoundingClientRect = jest.fn();

  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};


jest.setTimeout(15000); // 1 second

