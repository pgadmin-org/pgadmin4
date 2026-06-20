/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render } from '@testing-library/react';

import { SafeMessage } from '../../../pgadmin/static/js/components/SafeMessage';


describe('SafeMessage', () => {
  it('renders plain text', () => {
    const ctrl = render(<SafeMessage text="hello world" />);
    expect(ctrl.container.textContent).toBe('hello world');
  });

  it('does not interpret HTML in text', () => {
    const ctrl = render(
      <SafeMessage text={'<script>window.__xss=true</script>bad'} />);
    expect(ctrl.container.querySelector('script')).toBeNull();
    expect(ctrl.container.textContent)
      .toBe('<script>window.__xss=true</script>bad');
  });

  it('does not interpret iframe srcdoc payload', () => {
    const xss = '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">';
    const ctrl = render(<SafeMessage text={'Failed to connect:\n' + xss} />);
    expect(ctrl.container.querySelector('iframe')).toBeNull();
    expect(ctrl.container.querySelector('script')).toBeNull();
    expect(ctrl.container.textContent).toContain('iframe');
  });

  it('preserves newlines via pre-wrap', () => {
    const ctrl = render(<SafeMessage text={'line one\nline two'} />);
    const span = ctrl.container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span.style.whiteSpace).toBe('pre-wrap');
    expect(span.textContent).toBe('line one\nline two');
  });

  it('renders empty for null and undefined', () => {
    const a = render(<SafeMessage text={null} />);
    const b = render(<SafeMessage text={undefined} />);
    expect(a.container.textContent).toBe('');
    expect(b.container.textContent).toBe('');
  });

  it('applies overflow-safe CSS for long unbreakable tokens', () => {
    // PostgreSQL error messages can contain very long identifiers or
    // hex strings. The combination of overflowWrap: anywhere and
    // wordBreak: break-word ensures the message wraps inside its
    // container instead of forcing horizontal scroll.
    const longToken = 'x'.repeat(500);
    const ctrl = render(<SafeMessage text={longToken} />);
    const span = ctrl.container.querySelector('span');
    expect(span.style.overflowWrap).toBe('anywhere');
    expect(span.style.wordBreak).toBe('break-word');
  });

  it('preserves consecutive spaces (pre-wrap, not pre-line)', () => {
    const ctrl = render(<SafeMessage text={'a    b'} />);
    expect(ctrl.container.querySelector('span').textContent).toBe('a    b');
  });
});
