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
import { createMount } from '@material-ui/core/test-utils';
import Theme from '../../../pgadmin/static/js/Theme';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';
import ProcessDetails from '../../../pgadmin/misc/bgprocess/static/js/ProcessDetails';
import BgProcessManager, { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import pgAdmin from 'sources/pgadmin';
import { MESSAGE_TYPE } from '../../../pgadmin/static/js/components/FormComponents';
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
  let mount;
  let networkMock;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    networkMock = new MockAdapter(axios);
    let initialResp = _.cloneDeep(detailsResponse);
    initialResp.err.done = false;
    initialResp.out.done = false;
    initialResp.exit_code = null;
    networkMock.onGet(`/misc/bgprocess/${processData.id}/0/0/`).reply(200, initialResp);
    networkMock.onGet(`/misc/bgprocess/${processData.id}/123/123/`).reply(200, detailsResponse);
  });

  afterAll(() => {
    mount.cleanUp();
    networkMock.restore();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.BgProcessManager = new BgProcessManager(pgAdmin.Browser);
  });

  describe('ProcessDetails', ()=>{
    let ctrlMount = (props)=>{
      return mount(<Theme>
        <ProcessDetails
          data={processData}
          {...props}
        />
      </Theme>);
    };

    it('running and success', (done)=>{
      let ctrl = ctrlMount({});
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('NotifierMessage').props()).toEqual(jasmine.objectContaining({
          type: MESSAGE_TYPE.INFO,
          message: 'Running...',
        }));
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('NotifierMessage').props()).toEqual(jasmine.objectContaining({
            type: MESSAGE_TYPE.SUCCESS,
            message: 'Successfully completed.',
          }));
          ctrl.unmount();
          done();
        }, 2000);
      }, 500);
    });
  });
});
