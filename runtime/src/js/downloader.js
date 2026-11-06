/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { app, ipcMain, dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';
import { setBadge, clearBadge, clearProgress, setProgress } from './progress.js';
import { writeServerLog } from './misc.js';

class DownloadItem {
  constructor(filePath, onUpdate, onRemove) {
    this.filePath = filePath;
    this.currentLoaded = 0;
    this.total = null;
    this.stream = fs.createWriteStream(filePath);;
    this.onUpdate = onUpdate;
    this.onRemove = onRemove;
  }
  write(chunk) {
    this.stream.write(chunk);
    this.currentLoaded += chunk.length;
    this.onUpdate?.();
  }
  setTotal(total) {
    this.total = total;
  }
  remove() {
    this.stream.end();
    this.onRemove?.();
  }
}

const downloadQueue = {};

function updateProgress(callerWindow) {
  let count = Object.keys(downloadQueue).length;
  if (count === 0) {
    clearBadge();
    clearProgress.call(callerWindow);
    return;
  }
  setBadge(Object.keys(downloadQueue).length);
  let progress;
  if(Object.values(downloadQueue).some((item) => item.total === null)) {
    // If any of the items in the queue does not have a total, we cannot calculate progress
    // so we return 2 to indicate that the progress is indeterminate.
    progress = 2;
  } else {
    const total = Object.values(downloadQueue).reduce((acc, item) => {
      if (item.total) {
        return acc + item.currentLoaded / item.total;
      }
      return acc + item.currentLoaded;
    }, 0);
    progress = total / Object.keys(downloadQueue).length;
  }
  setProgress.call(callerWindow, progress);
}

// Work out where to save a download without asking the user. Only the file
// name part of the suggested name is used, so the file always lands directly
// in the downloads directory, whatever the requesting page asked for.
export function defaultDownloadPath(downloadsDir, defaultPath) {
  const fileName = path.basename(String(defaultPath ?? ''));
  if (fileName === '' || fileName === '.' || fileName === '..') {
    return null;
  }

  const resolvedDir = path.resolve(downloadsDir);
  const filePath = path.resolve(resolvedDir, fileName);
  if (path.dirname(filePath) !== resolvedDir) {
    return null;
  }
  return filePath;
}

async function fileDownloadPath(callerWindow, options, prompt=true) {
  // prompt is true when the user has set the preference to prompt for download location
  if(!prompt) {
    const filePath = defaultDownloadPath(app.getPath('downloads'), options?.defaultPath);
    if (!filePath) {
      writeServerLog(`Refused to save a download as ${options?.defaultPath}`);
    }
    return filePath ?? undefined;
  }

  // The page only gets to suggest a file name; the dialog always starts in
  // the downloads directory.
  const result = await dialog.showSaveDialog(callerWindow, {
    title: 'Save File',
    ...options,
    defaultPath: defaultDownloadPath(app.getPath('downloads'), options?.defaultPath) ?? undefined,
  });

  if (result.canceled) {
    return;
  }
  return result.filePath;
}

export function setupDownloader() {
  // Listen for the renderer's request to show the open dialog
  ipcMain.handle('get-download-stream-path', async (event, options, prompt=true) => {
    try {
      const callerWindow = BrowserWindow.fromWebContents(event.sender);
      const filePath = await fileDownloadPath(callerWindow, options, prompt);
      if (!filePath) {
        return;
      }
      downloadQueue[filePath] = new DownloadItem(filePath, () => {
        updateProgress(callerWindow);
      }, () => {
        delete downloadQueue[filePath];
        updateProgress(callerWindow);
      });

      updateProgress(callerWindow);

      return filePath;
    } catch (error) {
      writeServerLog(`Error in get-download-stream-path: ${error}`);
    } 
  });

  ipcMain.on('download-stream-save-total', (event, filePath, total) => {
    const item = downloadQueue[filePath];
    if (item) {
      item.setTotal(total);
    }
  });

  ipcMain.on('download-stream-save-chunk', (event, filePath, chunk) => {
    const item = downloadQueue[filePath];
    if (item) {
      item.write(chunk);
    }
  });

  ipcMain.on('download-stream-save-end', (event, filePath, openFile=false) => {
    const item = downloadQueue[filePath];
    if (item) {
      item.remove();
      openFile && shell.openPath(filePath);
    }
  });

  // non-streaming direct download
  ipcMain.handle('download-base64-url-data', async (event, base64url, options, prompt=true, openFile=false) => {
    const callerWindow = BrowserWindow.fromWebContents(event.sender);
    const filePath = await fileDownloadPath(callerWindow, options, prompt);
    if (!filePath) {
      return;
    }
    const buffer = Buffer.from(base64url.split(',')[1], 'base64');
    fs.writeFileSync(filePath, buffer);
    openFile && shell.openPath(filePath);
  });

  ipcMain.handle('download-text-data', async (event, text, options, prompt=true, openFile=false) => {
    const callerWindow = BrowserWindow.fromWebContents(event.sender);
    const filePath = await fileDownloadPath(callerWindow, options, prompt);
    if (!filePath) {
      return;
    }
    fs.writeFileSync(filePath, text);
    openFile && shell.openPath(filePath);
  });
}