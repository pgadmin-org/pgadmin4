import '@testing-library/jest-dom';
const { TextEncoder, TextDecoder } = require('util');

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

class GeneralObserver {
  observe() {return null;}
  unobserve() {return null;}
  disconnect() {return null;}
}

global.IntersectionObserver = GeneralObserver;
global.ResizeObserver = GeneralObserver;

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

// for virtual tables, height should exist.
Element.prototype.getBoundingClientRect = jest.fn(function () {
  if (this.classList?.contains('pgrt')) {
    return {
      width: 400,
      height: 400,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    };
  }
  return {
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: () => {},
  };
});

Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  writable: true,
  value: jest.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
  }),
});

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.setTimeout(18000); // 1 second
