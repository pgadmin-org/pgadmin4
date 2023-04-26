/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { withTheme } from '../fake_theme';
import { createMount } from '@material-ui/core/test-utils';
import ObjectBreadcrumbs from '../../../pgadmin/static/js/components/ObjectBreadcrumbs';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';

const pgAdmin = {
  Browser: {
    Events: new EventBus(),
    get_preferences_for_module: function() {
      return {
        breadcrumbs_enable: true,
        breadcrumbs_show_comment: true,
      };
    },
    preference_version: ()=>123,
    onPreferencesChange: ()=>{/*This is intentional (SonarQube)*/},
    tree: {
      getNodeDisplayPath: jasmine.createSpy('getNodeDisplayPath').and.returnValue(['server', 'object']),
    }
  },
};

describe('ObjectBreadcrumbs', ()=>{
  let mount;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
  });

  it('not hovered', (done)=>{
    let ThemedObjectBreadcrumbs = withTheme(ObjectBreadcrumbs);
    let ctrl = mount(<ThemedObjectBreadcrumbs pgAdmin={pgAdmin} />);
    setTimeout(()=>{
      ctrl.update();
      expect(ctrl.find('ForwardRef(AccountTreeIcon)').length).toBe(0);
      done();
    }, 0);
  });

  it('hovered object with comment', (done)=>{
    let ThemedObjectBreadcrumbs = withTheme(ObjectBreadcrumbs);
    let ctrl = mount(<ThemedObjectBreadcrumbs pgAdmin={pgAdmin} />);
    setTimeout(()=>{
      ctrl.update();
      pgAdmin.Browser.Events.trigger('pgadmin-browser:tree:hovered', {
        _metadata: {
          data: {
            description: 'some description'
          }
        },
      }, {
        _type: 'object',
      });
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('ForwardRef(AccountTreeIcon)').length).toBe(1);
        expect(ctrl.find('ForwardRef(CommentIcon)').length).toBe(1);
        done();
      }, 500);
    }, 500);
  });

  it('hovered object with no comment', (done)=>{
    let ThemedObjectBreadcrumbs = withTheme(ObjectBreadcrumbs);
    let ctrl = mount(<ThemedObjectBreadcrumbs pgAdmin={pgAdmin} />);
    setTimeout(()=>{
      ctrl.update();
      pgAdmin.Browser.Events.trigger('pgadmin-browser:tree:hovered', {
        _metadata: {
          data: {}
        },
      }, {
        _type: 'object',
      });
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('ForwardRef(AccountTreeIcon)').length).toBe(1);
        expect(ctrl.find('ForwardRef(CommentIcon)').length).toBe(0);
        done();
      }, 500);
    }, 500);
  });
});
