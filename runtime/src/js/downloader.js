/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { app, ipcMain, dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import path from 'path';
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
  let progress = 0;
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

export function setupDownloader() {
  // Listen for the renderer's request to show the open dialog
  ipcMain.handle('get-download-path', async (event, options, prompt=true) => {
    try {
      let filePath = path.join(app.getPath('downloads'), options.defaultPath);
      const callerWindow = BrowserWindow.fromWebContents(event.sender);
      // prompt is true when the user has set the preference to prompt for download location
      if(prompt) {
        const result = await dialog.showSaveDialog(callerWindow, {
          title: 'Save File',
          ...options,
        });

        if (result.canceled) {
          return;
        }
        filePath = result.filePath;
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
      writeServerLog(`Error in get-download-path: ${error}`);
    } 
  });

  ipcMain.on('download-data-save-total', (event, filePath, total) => {
    const item = downloadQueue[filePath];
    if (item) {
      item.setTotal(total);
    }
  });

  ipcMain.on('download-data-save-chunk', (event, filePath, chunk) => {
    const item = downloadQueue[filePath];
    if (item) {
      item.write(chunk);
    }
  });

  ipcMain.on('download-data-save-end', (event, filePath, openFile=false) => {
    const item = downloadQueue[filePath];
    if (item) {
      item.remove();
      openFile && shell.openPath(filePath);
    }
  });
}