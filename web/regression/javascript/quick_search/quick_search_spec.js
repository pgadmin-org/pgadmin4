//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import QuickSearch from '../../../pgadmin/static/js/QuickSearch';
import { render } from '@testing-library/react';

let ctrl;

describe('quick search test cases', function () {
  beforeEach(() => {
    ctrl = render(
      <QuickSearch />
    );
  });

  it('should have rendered quick-search-container', () => {
    expect(ctrl.container.firstChild.id).toEqual('quick-search-container');
  });

  it('should have 2 childs in quick-search-container', () => {
    expect(ctrl.container.firstChild.childNodes.length).toEqual(2);
  });

  it('element should be html element', () => {
    expect(ctrl.container.querySelector('#live-search-field')).not.toBeNull();
  });

});
