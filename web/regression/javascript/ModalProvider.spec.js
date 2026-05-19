/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act, render } from '@testing-library/react';

import { AlertContent } from '../../pgadmin/static/js/helpers/ModalProvider';
import { withTheme } from './fake_theme';

const ThemedAlertContent = withTheme(AlertContent);


// MUI <Button> triggers an async TouchRipple update on mount that
// otherwise leaks past the test boundary and trips
// `console.error` (setup-jest treats any console.error as a failure).
// Wrap render in act() and flush microtasks so the ripple effect settles.
async function renderAlert(props) {
  let ctrl;
  await act(async () => {
    ctrl = render(<ThemedAlertContent {...props} />);
  });
  return ctrl;
}


describe('ModalProvider AlertContent', () => {
  it('renders plain-text body when plainText is true (no HTML parsing)',
    async () => {
      const xss = '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">';
      const ctrl = await renderAlert({
        text: 'Failed:\n' + xss, plainText: true, onOkClick: () => {}});
      expect(ctrl.container.querySelector('iframe')).toBeNull();
      expect(ctrl.container.querySelector('script')).toBeNull();
      expect(ctrl.container.textContent).toContain('iframe');
    });

  it('preserves newlines in plainText mode (no <br/> substitution needed)',
    async () => {
      const body = 'line one\nline two\nline three';
      const ctrl = await renderAlert({
        text: body, plainText: true, onOkClick: () => {}});
      const safeSpan = ctrl.container.querySelector('span');
      expect(safeSpan).not.toBeNull();
      expect(safeSpan.textContent).toBe(body);
      expect(safeSpan.style.whiteSpace).toBe('pre-wrap');
    });

  it('renders HTML body when plainText is false (default, sanitized)',
    async () => {
      const ctrl = await renderAlert({
        text: 'Welcome <b>admin</b>', onOkClick: () => {}});
      expect(ctrl.container.querySelector('b')).not.toBeNull();
      expect(ctrl.container.querySelector('script')).toBeNull();
    });

  it('strips script tag even in default HTML mode', async () => {
    const ctrl = await renderAlert({
      text: '<script>window.__xss=true</script>x', onOkClick: () => {}});
    expect(ctrl.container.querySelector('script')).toBeNull();
    expect(window.__xss).toBeUndefined();
  });
});
