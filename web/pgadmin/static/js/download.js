//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import { callFetch, parseApiError } from './api_instance';
import { getBrowser, streamToArray, toPrettySize } from './utils';

class DownloadItem {
  constructor(name, onUpdate, onRemove) {
    this.id = Date.now();
    this.name = name;
    this.currentLoaded = 0;
    this.total = null;
    this.onUpdate = onUpdate;
    this.onRemove = onRemove;
  }
  setTotal(total) {
    this.total = total;
  }
  remove() {
    this.onRemove?.();
  }
  update(currentLoaded) {
    this.currentLoaded = currentLoaded;
    this.onUpdate?.();
  }
  getProgress() {
    if (this.total) {
      return Math.floor((this.currentLoaded / this.total) * 100) + '%';
    }
    return toPrettySize(this.currentLoaded);
  }
}

class DesktopDownloadTacker {
  static queue = {};

  static createDownloadItem(name) {
    const item = new DownloadItem(name, () => {
      DesktopDownloadTacker.poll();
    }, () => {
      delete DesktopDownloadTacker.queue[item.id];
      DesktopDownloadTacker.poll();
    });

    DesktopDownloadTacker.queue[item.id] = item;
    DesktopDownloadTacker.poll();

    return item;
  }

  static getCount() {
    return Object.keys(DesktopDownloadTacker.queue).length;
  }

  static getProgress() {
    if(Object.values(DesktopDownloadTacker.queue).some((item) => item.total === null)) {
      // If any of the items in the queue does not have a total, we cannot calculate progress
      // so we return 2 to indicate that the progress is indeterminate.
      return 2;
    }
    const total = Object.values(DesktopDownloadTacker.queue).reduce((acc, item) => {
      if (item.total) {
        return acc + item.currentLoaded / item.total;
      }
      return acc + item.currentLoaded;
    }, 0);

    return total / Object.keys(DesktopDownloadTacker.queue).length;
  }

  static poll() {
    if(getBrowser().name != 'Electron') {
      return;
    }

    const count = DesktopDownloadTacker.getCount();
    if (count > 0) {
      const progress = DesktopDownloadTacker.getProgress();
      window.electronUI.setBadge(count);
      window.electronUI.setProgress(progress);
    } else {
      window.electronUI.setBadge(0);
      window.electronUI.clearProgress();
    }
  }
}

// This function is used to download the base64 data
// and create a link to download the file.
export async function downloadBase64UrlData(downloadUrl, fileName) {
  let link = document.createElement('a');
  link.setAttribute('href', downloadUrl);
  link.setAttribute('download', fileName);
  link.style.setProperty('visibility ', 'hidden');

  document.body.appendChild(link);
  link.click();
  link.remove();
}

// This function is used to download the blob data
export async function downloadBlob(blob, fileName) {
  const urlCreator = window.URL || window.webkitURL;
  const downloadUrl = urlCreator.createObjectURL(blob);

  downloadBase64UrlData(downloadUrl, fileName);
  window.URL.revokeObjectURL(downloadUrl);
}

// This function is used to download the text data
export function downloadTextData(textData, fileName, fileType) {
  const respBlob = new Blob([textData], {type : fileType});
  downloadBlob(respBlob, fileName);
}

// This function is used to download the file from the given URL
// and use streaming to download the file in chunks where there
// is no limit on the file size.
export async function downloadFileStream(allOptions, fileName, fileType, onProgress) {
  const start = async (writable, di) => {
    const response = await callFetch(allOptions.url, allOptions.options);
    if(!response.ok) {
      throw new Error(parseApiError(await response.json()));
    }
    if (!response.body) {
      throw new Error(response.statusText);
    }

    const contentLength = response.headers.get('Content-Length');
    di.setTotal(contentLength ? parseInt(contentLength, 10) : null);
    let loaded = 0;

    // Update the download queue with the progress
    const progressCallback = (currentLoaded) => {
      di.update(currentLoaded);
    };

    // Create a TransformStream to report progress
    // and pass the chunk to the next stream
    const reportProgress = new TransformStream({
      transform(chunk, controller) {
        loaded += chunk.length;
        progressCallback(loaded);
        controller.enqueue(chunk); // Pass the chunk to the next stream
      },
    });

    await response.body.pipeThrough(reportProgress).pipeTo(writable);
    di.remove();
  };

  let di;
  try {
    if(getBrowser().name != 'Electron') {
      // In other browsers, we use the blob to download the file.
      const {stream, data} = streamToArray();
      di = new DownloadItem(fileName, () => {
        onProgress?.(di.getProgress());
      });
      await start(stream, di);
      const blob = new Blob(data, {type: fileType});
      downloadBlob(blob, fileName);
    } else {
      // On electron, we run on localhost, so it is a secure context
      // and we can use the showSaveFilePicker API to download the file.
      const fileHandle = await window.showSaveFilePicker({
        id: 'save-file',
        startIn: 'downloads',
        suggestedName: fileName,
        types: [
          {
            accept: {
              [fileType]: ['.txt', '.csv', '.json', '.xml', '.sql', '.html'],
            },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      di = DesktopDownloadTacker.createDownloadItem(fileName);
      await start(writable, di);
    }
  } catch (error) {
    di?.remove();
    if(error.name !== 'AbortError') {
      throw new Error('Download failed: ' + error.message);
    }
  }
}
