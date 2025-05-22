//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import usePreferences from '../../preferences/static/js/store';
import { callFetch, parseApiError } from './api_instance';
import { getBrowser, toPrettySize } from './utils';

// This function is used to download the base64 data
// and create a link to download the file.
export async function downloadBase64UrlData(downloadUrl, fileName) {
  if(getBrowser().name == 'Electron') {
    const {automatically_open_downloaded_file, prompt_for_download_location} = usePreferences.getState().getPreferencesForModule('misc');
    // In Electron, we use the electronUI to download the file.
    await window.electronUI.downloadBase64UrlData(downloadUrl, {
      defaultPath: fileName,
    }, prompt_for_download_location, automatically_open_downloaded_file);
    return;
  }
  // In other browsers, we create a link to download the file.
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
  const {automatically_open_downloaded_file, prompt_for_download_location} = usePreferences.getState().getPreferencesForModule('misc');

  const start = async (filePath, writer) => {
    const response = await callFetch(allOptions.url, allOptions.options);
    if(!response.ok) {
      throw new Error(parseApiError(await response.json()));
    }
    if (!response.body) {
      throw new Error(response.statusText);
    }

    const contentLength = response.headers.get('Content-Length');
    writer.downloadDataSaveTotal(filePath, contentLength ? parseInt(contentLength, 10) : null);

    const reader = response.body.getReader();

    let done = false;
    let receivedLength = 0; // received bytes
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        writer.downloadDataSaveChunk(filePath, value);
        receivedLength += value.length;
        onProgress?.(toPrettySize(receivedLength, 'B', 2));
      }
    }
    writer.downloadDataSaveEnd(filePath, automatically_open_downloaded_file);
  };

  let writer;
  let filePath = '';
  try {
    if(getBrowser().name != 'Electron') {
      // In other browsers, we use the blob to download the file.
      const data = [];
      writer = {
        downloadDataSaveChunk: (_fp, chunk) => {
          data.push(chunk);
        },
        downloadDataSaveTotal: () => {
          // This is not used in the browser
        },
        downloadDataSaveEnd: () => {
          // This is not used in the browser
        },
      };
      await start(filePath, writer);
      const blob = new Blob(data, {type: fileType});
      downloadBlob(blob, fileName);
    } else {
      writer = window.electronUI;
      filePath = await window.electronUI.getDownloadPath({
        defaultPath: fileName,
      }, prompt_for_download_location);

      // If the user cancels the download, we will not proceed
      if(!filePath) {
        return;
      }
      await start(filePath, writer);
    }
  } catch (error) {
    writer.downloadDataSaveEnd(filePath);
    throw new Error('Download failed: ' + error.message);
  }
}
