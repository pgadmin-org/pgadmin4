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
import {
  copyToClipboard, copyPromisedTextToClipboard, getFromClipboard,
} from '../../pgadmin/static/js/clipboard';

const readBlob = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsText(blob);
});

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

  it('clears the cache instead when asked not to cache', async () => {
    localStorage.setItem('clipboard', 'a\tb');
    await expect(copyToClipboard('| a |', {cache: false})).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('| a |');
    expect(getFromClipboard()).toBeNull();
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

describe('copyPromisedTextToClipboard', () => {
  let write, writeText, written;

  beforeEach(() => {
    written = [];
    global.ClipboardItem = class {
      constructor(items) { this.items = items; }
    };
    write = jest.fn(async (items) => { written.push(...items); });
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write, writeText }, configurable: true,
    });
    pgAdmin.Browser.notifier.error.mockClear();
  });

  afterEach(() => {
    delete global.ClipboardItem;
    localStorage.removeItem('clipboard');
  });

  it('starts the write before the text is known, then copies it', async () => {
    let resolveText;
    const result = copyPromisedTextToClipboard(
      new Promise((resolve) => { resolveText = resolve; }));
    // The write has to start whilst the click is still being handled.
    expect(write).toHaveBeenCalledTimes(1);
    resolveText('postgresql://h/d');
    await expect(result).resolves.toBe(true);
    const blob = await written[0].items['text/plain'];
    expect(blob.type).toBe('text/plain');
    expect(await readBlob(blob)).toBe('postgresql://h/d');
    expect(getFromClipboard()).toBe('postgresql://h/d');
    expect(pgAdmin.Browser.notifier.error).not.toHaveBeenCalled();
  });

  it('reports failure when the clipboard write is rejected', async () => {
    write.mockRejectedValue(new Error('NotAllowedError'));
    await expect(copyPromisedTextToClipboard(Promise.resolve('t')))
      .resolves.toBe(false);
    expect(pgAdmin.Browser.notifier.error)
      .toHaveBeenCalledWith('Does not have clipboard access');
  });

  it('rejects with the error of the text, copying nothing', async () => {
    write.mockImplementation(async (items) => {
      await items[0].items['text/plain'];
    });
    const error = new Error('request failed');
    await expect(copyPromisedTextToClipboard(Promise.reject(error)))
      .rejects.toBe(error);
    expect(getFromClipboard()).toBeNull();
    expect(pgAdmin.Browser.notifier.error).not.toHaveBeenCalled();
  });

  it('still reports success when the cache write throws', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    try {
      await expect(copyPromisedTextToClipboard(Promise.resolve('t')))
        .resolves.toBe(true);
      expect(write).toHaveBeenCalledTimes(1);
      expect(pgAdmin.Browser.notifier.error).not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
    }
  });

  it('copies the text once known where ClipboardItem is not supported', async () => {
    delete global.ClipboardItem;
    await expect(copyPromisedTextToClipboard(Promise.resolve('t')))
      .resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('t');
    expect(write).not.toHaveBeenCalled();
  });
});
