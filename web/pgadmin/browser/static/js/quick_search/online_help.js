/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import ReactDOM from 'react-dom';
import {Iframe} from './iframe_component';
import url_for from 'sources/url_for';

const extractSearchResult = (list) => {
  let result = {};
  for (let idx = 0; idx < list.length; idx++) {
    let link = list[idx].getElementsByTagName('A');
    // we are not going to display more than first 10 result as per design
    if (link.length == 0) {
      break;
    }
    let topicName  = link[0].text;
    let topicLink  = url_for('help.static', {
      'filename': link[0].getAttribute('href'),
    });
    result[topicName] = topicLink;
  }
  return result;
};

export function onlineHelpSearch(param, props) {
  param = param.split(' ').join('+');
  const setState = props.setState;
  const helpURL = url_for('help.static', {
    'filename': 'search.html',
  });
  const srcURL = `${helpURL}?q=${param}`;
  let isIFrameLoaded = false;
  if(document.getElementById('hidden-quick-search-iframe')){
    document.getElementById('hidden-quick-search-iframe').contentDocument.location.reload(true);
  }

  // Below function will be called when the page will be loaded in Iframe
  const _iframeLoaded = () => {
    if (isIFrameLoaded) {
      return false;
    }
    isIFrameLoaded = true;
    let iframe = document.getElementById('hidden-quick-search-iframe');
    let content = (iframe.contentWindow || iframe.contentDocument);
    let iframeHTML = content.document;
    window.pooling = setInterval(() => {
      let resultEl = iframeHTML.getElementById('search-results');
      let searchResultsH2Tags = resultEl.getElementsByTagName('h2');
      let list = resultEl && resultEl.getElementsByTagName('LI');
      let pooling = window.pooling;
      if ((list && list.length > 0 )) {
        let res = extractSearchResult(list);
        // After getting the data, we need to call the Parent component function
        // which will render the data on the screen
        if (searchResultsH2Tags[0]['childNodes'][0]['textContent'] != 'Searching') {
          window.clearInterval(pooling);
          setState(state => ({
            ...state,
            fetched: true,
            clearedPooling: true,
            url: srcURL,
            data: res,
          }));
          isIFrameLoaded = false;
          ReactDOM.unmountComponentAtNode(document.getElementById('quick-search-iframe-container'));
        } else {
          setState(state => ({
            ...state,
            fetched: true,
            clearedPooling: false,
            url: srcURL,
            data: res,
          }));
        }
      } else if(searchResultsH2Tags[0]['childNodes'][0]['textContent'] == 'Search Results') {
        setState(state => ({
          ...state,
          fetched: true,
          clearedPooling: true,
          url: srcURL,
          data: {},
        }));
        ReactDOM.unmountComponentAtNode(document.getElementById('quick-search-iframe-container'));
        isIFrameLoaded = false;
        window.clearInterval(pooling);
      }
    }, 500);
  };

  // Render IFrame
  ReactDOM.render(
    <Iframe id='hidden-quick-search-iframe' srcURL={srcURL} onLoad={_iframeLoaded}/>,
    document.getElementById('quick-search-iframe-container'),
  );
}
