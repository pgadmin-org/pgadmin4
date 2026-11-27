/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

jest.mock('sources/pgadmin', () => ({
  __esModule: true,
  default: { Browser: { notifier: { error: jest.fn() } } },
}));

import pgAdmin from 'sources/pgadmin';
import { copyToClipboard, getFromClipboard } from '../../pgadmin/static/js/clipboard';

describe('copyToClipboard', () => {
  let writeText;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    });
    pgAdmin.Browser.notifier.error.mockClear();
  });

  afterEach(() => {
    localStorage.removeItem('clipboard');
  });

  it('copies the text and caches it', async () => {
    await expect(copyToClipboard('SELECT 1')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('SELECT 1');
    expect(getFromClipboard()).toBe('SELECT 1');
  });

  it('reports failure when the clipboard write is rejected', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    await expect(copyToClipboard('SELECT 1')).resolves.toBe(false);
    expect(pgAdmin.Browser.notifier.error).toHaveBeenCalled();
  });

  it('still reports success when the cache write throws', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    try {
      await expect(copyToClipboard('SELECT 1')).resolves.toBe(true);
      expect(writeText).toHaveBeenCalledWith('SELECT 1');
      expect(pgAdmin.Browser.notifier.error).not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
    }
  });
});
