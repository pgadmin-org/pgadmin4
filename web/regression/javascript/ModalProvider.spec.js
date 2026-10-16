/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act, render, screen } from '@testing-library/react';

import ModalProvider, { AlertContent, useModal } from '../../pgadmin/static/js/helpers/ModalProvider';
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

describe('ModalProvider keeps focus in an open modal (#9784)', () => {
  let iframe;

  beforeEach(() => {
    // Stands in for a tool iframe (e.g. a restored Query Tool) that lives
    // outside the dialog.
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
  });

  afterEach(() => {
    iframe.remove();
  });

  const flush = () => act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  // Simulate the iframe content calling focus(): a real browser moves focus
  // to the iframe and fires only a blur on this window, with no focusin in
  // this document (unlike jsdom, so the focusin is suppressed here).
  const stealFocus = async (el) => {
    const swallow = (e) => e.stopImmediatePropagation();
    window.addEventListener('focusin', swallow, true);
    el.focus();
    window.removeEventListener('focusin', swallow, true);
    window.dispatchEvent(new Event('blur'));
    await flush();
  };

  async function renderProvider(content) {
    let modal;
    const Consumer = () => {
      modal = useModal();
      return null;
    };
    const ThemedProvider = withTheme(ModalProvider);
    await act(async () => {
      render(<ThemedProvider><Consumer /></ThemedProvider>);
    });
    if (content) {
      await act(async () => {
        modal.showModal('Unlock Saved Passwords', () => content);
      });
    }
  }

  it('returns focus to the dialog when an outside iframe takes it',
    async () => {
      await renderProvider(<input data-testid="pw" />);
      const input = screen.getByTestId('pw');
      await act(async () => { input.focus(); });
      expect(document.activeElement).toBe(input);

      await stealFocus(iframe);
      expect(document.activeElement).toBe(input);
    });

  it('falls back to the dialog when the last focused element is disabled',
    async () => {
      await renderProvider(<input data-testid="pw" />);
      const input = screen.getByTestId('pw');
      await act(async () => { input.focus(); });

      // Disabling the focused input moves focus away from it, which, as
      // with the iframe, a browser does without firing focusin.
      const swallow = (e) => e.stopImmediatePropagation();
      window.addEventListener('focusin', swallow, true);
      input.disabled = true;
      window.removeEventListener('focusin', swallow, true);

      await stealFocus(iframe);
      expect(document.activeElement).toBe(
        document.querySelector('[role="dialog"]'));
    });

  it('leaves focus alone when no modal is open', async () => {
    await renderProvider(null);
    await stealFocus(iframe);
    expect(document.activeElement).toBe(iframe);
  });

  it('leaves focus alone on an iframe inside the dialog', async () => {
    await renderProvider(<iframe data-testid="inner" title="inner" />);
    const inner = screen.getByTestId('inner');
    await stealFocus(inner);
    expect(document.activeElement).toBe(inner);
  });

  it('does not move focus when the window blurs for another app',
    async () => {
      await renderProvider(<input data-testid="pw" />);
      const input = screen.getByTestId('pw');
      await act(async () => { input.focus(); });
      window.dispatchEvent(new Event('blur'));
      await flush();
      expect(document.activeElement).toBe(input);
    });
});

describe('ModalProvider aria-hidden handling', () => {
  let modalApi;
  function CaptureModal() {
    modalApi = useModal();
    return <button>Background action</button>;
  }
  const ThemedProvider = withTheme(ModalProvider);

  it('hides the background content but not the dialog itself',
    async () => {
      const ctrl = await act(async () => render(
        <ThemedProvider><CaptureModal /></ThemedProvider>
      ));
      const background = screen.getByText('Background action');
      background.focus();

      await act(async () => {
        modalApi.confirm('Reset statistics', 'Are you sure?', () => {});
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog.closest('[aria-hidden="true"]')).toBeNull();
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(background.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(ctrl.container.closest('[aria-hidden="true"]')).toBeNull();

      await act(async () => {
        screen.getByText('No').click();
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(background.closest('[aria-hidden="true"]')).toBeNull();
    });
});
