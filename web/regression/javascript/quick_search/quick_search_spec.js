//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { Search } from 'browser/quick_search/trigger_search';

let container;

describe('quick search test cases', function () {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    act(() => {
      ReactDOM.render(<Search />, container);
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should have rendered quick-search-container', () => {
    expect(container.firstChild.id).toEqual('quick-search-container');
  });

  it('should have 2 childs in quick-search-container', () => {
    expect(container.firstChild.childNodes.length).toEqual(2);
  });

  it('element should be html element', () => {
    let inputElement = document.getElementById('live-search-field');
    expect(inputElement instanceof HTMLElement).toBeTruthy();
  });

});
