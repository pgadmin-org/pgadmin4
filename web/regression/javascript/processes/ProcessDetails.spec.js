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
import Theme from '../../../pgadmin/static/js/Theme';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import ProcessDetails from '../../../pgadmin/misc/bgprocess/static/js/ProcessDetails';
import { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessConstants';
import BgProcessManager from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import pgAdmin from 'sources/pgadmin';
import _ from 'lodash';


const processData = {
  acknowledge: null,
  current_storage_dir: null,
  desc: 'Doing some operation on the server \'PostgreSQL 12 (localhost:5432)\'',
  details: {
    cmd: '/Library/PostgreSQL/12/bin/mybin --testing',
    message: 'Doing some detailed operation on the server \'PostgreSQL 12 (localhost:5432)\'...'
  },
  etime: null,
  execution_time: 0.09,
  exit_code: null,
  id: '220803091429498400',
  process_state: BgProcessManagerProcessState.PROCESS_STARTED,
  stime: '2022-08-03T09:14:30.191940+00:00',
  type_desc: 'Operation on the server',
  utility_pid: 140391
};

const detailsResponse = {
  err: {
    done: true,
    lines: [['220803091259931276', 'INFO: operation log err']],
    pos: 123
  },
  execution_time: 1.27,
  exit_code: 0,
  out: {
    done: true,
    lines: [['220803091259931276', 'INFO: operation log out']],
    pos: 123
  },
  start_time: '2022-08-03 09:12:59.774503 +0000'
};

describe('ProcessDetails', ()=>{

  let networkMock;

  beforeAll(()=>{
    networkMock = new MockAdapter(axios);
    let initialResp = _.cloneDeep(detailsResponse);
    initialResp.err.done = false;
    initialResp.out.done = false;
    initialResp.exit_code = null;
    networkMock.onGet(`/misc/bgprocess/${processData.id}/0/0/`).reply(200, initialResp);
    networkMock.onGet(`/misc/bgprocess/${processData.id}/123/123/`).reply(200, detailsResponse);
  });

  afterAll(() => {
    networkMock.restore();
  });

  beforeEach(()=>{

    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.BgProcessManager = new BgProcessManager(pgAdmin.Browser);
  });

  describe('ProcessDetails', ()=>{
    let ctrlMount = (props)=>{
      return render(<Theme>
        <ProcessDetails
          data={processData}
          {...props}
        />
      </Theme>);
    };

    it('running and success', async ()=>{
      let ctrl = ctrlMount({});
      expect(ctrl.container.querySelector('[data-test="notifier-message"]')).toHaveTextContent('Running...');
      await waitFor(()=>{
        expect(ctrl.container.querySelector('[data-test="notifier-message"]')).toHaveTextContent('Successfully completed.');
      }, {timeout: 2000});
    });
  });
});
