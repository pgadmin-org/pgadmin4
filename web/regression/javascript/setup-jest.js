import '@testing-library/jest-dom';
const { TextEncoder, TextDecoder } = require('util');

// Enable the build-time canary gate in test environments. The
// production wrapper in registry.js reads `process.env.__CANARY_BUILD__`;
// in canary builds webpack's DefinePlugin substitutes a literal `true`,
// in production builds it substitutes `false` (and DCE removes the
// import). Tests don't go through webpack, so set it directly here.
process.env.__CANARY_BUILD__ = 'true';

class BroadcastChannelMock {
  onmessage() {/* mock */}
  postMessage(data) {
    this.onmessage({ data });
  }
}

global.BroadcastChannel = BroadcastChannelMock;

// ESLint 9's flat-config schema uses `structuredClone` to deep-copy
// rule option objects in RuleTester. Node's structuredClone lives on
// the Node globalThis, but jest's jsdom env wraps tests in its own
// global with no copy of it. Patch the test global so RuleTester
// specs (regression/javascript/eslint-rules/) work without forcing a
// node test env that would break the rest of setup-jest.
if (typeof global.structuredClone !== 'function') {
  global.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

global.__webpack_public_path__ = '';

// AMD-style `define()` calls slip into a handful of pgAdmin browser
// modules (role.js registers itself with `define('pgadmin.node.role',
// [...], cb)`). Jest's CommonJS-ish loader doesn't provide it, so any
// import chain that touches these modules ReferenceErrors out — the
// registered_schemas_audit harness hits this on roleReassign.js. A
// no-op stub is enough: the audit doesn't care about side effects of
// the registration, only that the module can be imported.
global.define = (...args) => {
  // AMD signatures: define(factory), define(deps, factory),
  // define(name, factory), define(name, deps, factory). The factory is
  // always the last arg.
  const factory = args[args.length - 1];
  if (typeof factory === 'function') {
    try { factory(); } catch { /* swallow registration errors */ }
  }
};
global.define.amd = false;  // some modules check amd capability

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

// Reset the audit harness's variant-rotation counter between
// tests so dispatch ordering is reproducible within a Jest worker.
//
// We don't require() the audit harness here — that would pay the
// import cost on every Jest worker (including the ~80% that don't
// touch SchemaView) AND require()ing from inside beforeEach trips
// the zustand-mock's top-level afterEach() registration. Instead,
// resolve the module path once (no load), then check the require
// cache in each beforeEach. If a SchemaView spec earlier loaded the
// audit harness, its cached exports include _resetMutationCounter;
// non-SchemaView workers see an empty cache hit and skip.
const _auditHarnessPath = require.resolve(
  '../../pgadmin/static/js/SchemaView/SchemaState/audit_harness',
);
let _resetAuditMutationCounter = null;

global.beforeEach(() => {
  console.error.mockClear();
  if (!_resetAuditMutationCounter) {
    const cached = require.cache[_auditHarnessPath];
    if (cached && typeof cached.exports._resetMutationCounter === 'function') {
      _resetAuditMutationCounter = cached.exports._resetMutationCounter;
    }
  }
  if (_resetAuditMutationCounter) _resetAuditMutationCounter();
});

global.afterEach(() => {
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

Element.prototype.getBoundingClientRect = jest.fn(function () {
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


// for virtual tables, height and width should exist.
// https://github.com/TanStack/virtual/issues/641#issuecomment-2851908893
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  value: 800
});
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  value: 800
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
