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
import {Search} from './quick_search/trigger_search';

// TODO: GUI, Add the logic to show loading screen while fetching result
const onResultFetch = (url, data) => {
  // URL can be used for displaying all the result in new page
  // data will be array of search <name> -> <link>
  console.warn('URL = ' + url);
  console.warn(data);
};

setTimeout(function(){
  if (document.getElementById('quick-search-component')) {
    ReactDOM.render(
      <Search onResult={onResultFetch} />,
      document.getElementById('quick-search-component')
    );
  }
},500);
