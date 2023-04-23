/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
window.jQuery = window.$ = $;

import 'wcdocker';
import '../helper/enzyme.helper';

import React from 'react';
import { createMount } from '@material-ui/core/test-utils';
import jasmineEnzyme from 'jasmine-enzyme';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';

import pgWindow from 'sources/window';
import url_for from 'sources/url_for';

import { messages } from '../fake_messages';
import { TreeFake } from '../tree/tree_fake';
import Theme from '../../../pgadmin/static/js/Theme';
import SchemaDiffComponent from '../../../pgadmin/tools/schema_diff/static/js/components/SchemaDiffComponent';
import SchemaDiff from '../../../pgadmin/tools/schema_diff/static/js/SchemaDiffModule';


describe('Schema Diff Component', () => {
  let mount;
  let mountDOM;
  let tree;
  let params;
  let networkMock;
  let schemaDiffInstance;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
  });

  beforeEach(() => {
    jasmineEnzyme();
    // Element for mount wcDocker panel
    mountDOM = $('<div class="dockerContainer">');
    $(document.body).append(mountDOM);

    $(document.body).append($('<div id="debugger-main-container">'));

    /* messages used by validators */
    pgWindow.pgAdmin.Browser = pgWindow.pgAdmin.Browser || {};
    pgWindow.pgAdmin.Browser.messages = pgWindow.pgAdmin.Browser.messages || messages;
    pgWindow.pgAdmin.Browser.utils = pgWindow.pgAdmin.Browser.utils || {};

    schemaDiffInstance = new SchemaDiff(pgWindow.pgAdmin, pgWindow.pgAdmin.Browser);

    // eslint-disable-next-line
    let docker = new wcDocker(
      '.dockerContainer', {
        allowContextMenu: false,
        allowCollapse: false,
        loadingClass: 'pg-sp-icon',
      });

    tree = new TreeFake();
    pgWindow.pgAdmin.Browser.tree = tree;
    pgWindow.pgAdmin.Browser.docker = docker;

    params = {
      transId: 1234,
      schemaDiff: schemaDiffInstance,
    };
    networkMock = new MockAdapter(axios);
  });

  it('SchemaDiff Init', () => {
    networkMock.onGet(url_for('schema_diff.servers')).reply(200,
      {'success':1,
        'errormsg':'',
        'info':'',
        'result':null,
        'data':{
          'Servers':[
            {'value':1,'label':'PostgreSQL 12','image':'icon-pg','_id':1,'connected':true},
            {'value':2,'label':'PostgreSQL 10','image':'icon-server-not-connected','_id':2,'connected':false},
            {'value':3,'label':'PostgreSQL 11','image':'icon-server-not-connected','_id':3,'connected':false},
            {'value':4,'label':'PostgreSQL 13','image':'icon-server-not-connected','_id':4,'connected':false},
            {'value':5,'label':'PostgreSQL 9.6','image':'icon-server-not-connected','_id':5,'connected':false},
            {'value':8,'label':'test1234yo','image':'icon-server-not-connected','_id':8,'connected':false}
          ]
        }
      }
    );
    mount(
      <Theme>
        <SchemaDiffComponent
          params={{ transId: params.transId, pgAdmin: pgWindow.pgAdmin }}
        >
        </SchemaDiffComponent>
      </Theme>
    );
  });
});

