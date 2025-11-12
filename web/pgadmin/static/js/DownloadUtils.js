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

const DownloadUtils = {
  downloadViaLink: function (url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  downloadBlob: function (blob, fileName) {
    const urlCreator = window.URL || window.webkitURL;
    const downloadUrl = urlCreator.createObjectURL(blob);

    this.downloadViaLink(downloadUrl, fileName);
    window.URL.revokeObjectURL(downloadUrl);
  },

  downloadTextData: function (textData, fileName, fileType) {
    const respBlob = new Blob([textData], {type : fileType});
    this.downloadBlob(respBlob, fileName);
  },

  downloadBase64UrlData: function (downloadUrl, fileName) {
    this.downloadViaLink(downloadUrl, fileName);
  },

  downloadFileStream: async function (allOptions, fileName, fileType, onProgress) {
    const data = [];
    const response = await callFetch(allOptions.url, allOptions.options);
    if(!response.ok) {
      throw new Error(parseApiError(await response.json()));
    }
    if (!response.body) {
      throw new Error(response.statusText);
    }

    const reader = response.body.getReader();

    let done = false;
    let receivedLength = 0; // received bytes
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        data.push(value);
        receivedLength += value.length;
        onProgress?.(toPrettySize(receivedLength, 'B', 2));
      }
    }

    const blob = new Blob(data, {type: fileType});
    this.downloadBlob(blob, fileName);
  }
};

// If we are in Electron, we will use the Electron API to download files.
if(getBrowser().name == 'Electron') {
  DownloadUtils.downloadTextData = async (textData, fileName, _fileType) =>{
    const {automatically_open_downloaded_file, prompt_for_download_location} = usePreferences.getState().getPreferencesForModule('misc');
    await window.electronUI.downloadTextData(textData, {
      defaultPath: fileName,
    }, prompt_for_download_location, automatically_open_downloaded_file);
  };

  DownloadUtils.downloadBase64UrlData = async (downloadUrl, fileName) => {
    const {automatically_open_downloaded_file, prompt_for_download_location} = usePreferences.getState().getPreferencesForModule('misc');
    await window.electronUI.downloadBase64UrlData(downloadUrl, {
      defaultPath: fileName,
    }, prompt_for_download_location, automatically_open_downloaded_file);
  };

  DownloadUtils.downloadFileStream = async (allOptions, fileName, _fileType, onProgress)=>{
    const {automatically_open_downloaded_file, prompt_for_download_location} = usePreferences.getState().getPreferencesForModule('misc');
    const filePath = await window.electronUI.getDownloadStreamPath({
      defaultPath: fileName,
    }, prompt_for_download_location);

    // If the user cancels the download, we will not proceed
    if(!filePath) {
      return;
    }

    const response = await callFetch(allOptions.url, allOptions.options);
    if(!response.ok) {
      throw new Error(parseApiError(await response.json()));
    }
    if (!response.body) {
      throw new Error(response.statusText);
    }

    const contentLength = response.headers.get('Content-Length');
    window.electronUI.downloadStreamSaveTotal(filePath, contentLength ? parseInt(contentLength, 10) : null);

    const reader = response.body.getReader();

    let done = false;
    let receivedLength = 0; // received bytes
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        window.electronUI.downloadStreamSaveChunk(filePath, value);
        receivedLength += value.length;
        onProgress?.(toPrettySize(receivedLength, 'B', 2));
      }
    }
    window.electronUI.downloadStreamSaveEnd(filePath, automatically_open_downloaded_file);
  };
}

export default DownloadUtils;
