/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render, waitFor } from '@testing-library/react';
import ObjectBreadcrumbs from '../../../pgadmin/static/js/components/ObjectBreadcrumbs';
import pgAdmin from '../fake_pgadmin';
import { withBrowser } from '../genericFunctions';
import usePreferences from '../../../pgadmin/preferences/static/js/store';
import { TreeFake } from '../tree/tree_fake';

describe('ObjectBreadcrumbs', ()=>{

  beforeAll(()=>{
    jest.spyOn(usePreferences.getState(), 'getPreferencesForModule').mockReturnValue({
      breadcrumbs_enable: true,
      breadcrumbs_show_comment: true,
    });
    pgAdmin.Browser.tree = new TreeFake(pgAdmin.Browser);
  });

  it('not hovered', ()=>{
    let ThemedObjectBreadcrumbs = withBrowser(ObjectBreadcrumbs);
    let ctrl = render(<ThemedObjectBreadcrumbs />);
    expect(ctrl.container).toBeEmptyDOMElement();
  });

  it('hovered object with comment', async ()=>{
    let ThemedObjectBreadcrumbs = withBrowser(ObjectBreadcrumbs);
    let ctrl = render(<ThemedObjectBreadcrumbs />);
    pgAdmin.Browser.Events.trigger('pgadmin-browser:tree:hovered', {
      _metadata: {
        data: {
          description: 'some description'
        }
      },
    }, {
      _type: 'object',
    });

    await waitFor(()=>{
      expect(ctrl.container).not.toBeEmptyDOMElement();
      expect(ctrl.container.querySelector('[data-label="AccountTreeIcon"]')).toBeInTheDocument();
      expect(ctrl.container.querySelector('[data-label="CommentIcon"]')).toBeInTheDocument();
    }, {timeout: 500});
  });

  it('hovered object with no comment', async ()=>{
    let ThemedObjectBreadcrumbs = withBrowser(ObjectBreadcrumbs);
    let ctrl = render(<ThemedObjectBreadcrumbs />);

    pgAdmin.Browser.Events.trigger('pgadmin-browser:tree:hovered', {
      _metadata: {
        data: {}
      },
    }, {
      _type: 'object',
    });

    await waitFor(()=>{
      expect(ctrl.container).not.toBeEmptyDOMElement();
      expect(ctrl.container.querySelector('[data-label="AccountTreeIcon"]')).toBeInTheDocument();
      expect(ctrl.container.querySelector('[data-label="CommentIcon"]')).toBeNull();
    }, {timeout: 500});
  });
});
