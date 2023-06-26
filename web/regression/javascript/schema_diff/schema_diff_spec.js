/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////



import React from 'react';
import { act, render } from '@testing-library/react';

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import pgAdmin from 'sources/pgadmin';
import pgWindow from 'sources/window';
import url_for from 'sources/url_for';


import Theme from '../../../pgadmin/static/js/Theme';
import SchemaDiffComponent from '../../../pgadmin/tools/schema_diff/static/js/components/SchemaDiffComponent';
import SchemaDiff from '../../../pgadmin/tools/schema_diff/static/js/SchemaDiffModule';


describe('Schema Diff Component', () => {

  let params;
  let networkMock;
  let schemaDiffInstance;

  beforeEach(() => {
    pgWindow.pgAdmin = pgAdmin;
    schemaDiffInstance = new SchemaDiff(pgWindow.pgAdmin, pgWindow.pgAdmin.Browser);

    params = {
      transId: 1234,
      schemaDiff: schemaDiffInstance,
    };
    networkMock = new MockAdapter(axios);
  });

  it('SchemaDiff Init', async () => {
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
    await act(async ()=>{
      render(
        <Theme>
          <SchemaDiffComponent
            params={{ transId: params.transId, pgAdmin: pgWindow.pgAdmin }}
          >
          </SchemaDiffComponent>
        </Theme>
      );
    });
  });
});

