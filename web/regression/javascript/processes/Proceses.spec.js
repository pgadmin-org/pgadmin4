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
import BgProcessManager, { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import pgAdmin from 'sources/pgadmin';
import Processes from '../../../pgadmin/misc/bgprocess/static/js/Processes';


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

describe('Proceses', ()=>{
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
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.BgProcessManager = new BgProcessManager(pgAdmin.Browser);
    pgAdmin.Browser.BgProcessManager._procList = [processData];
  });

  describe('ProcessDetails', ()=>{
    let ctrlMount = (props)=>{
      return mount(<Theme>
        <Processes
          {...props}
        />
      </Theme>);
    };

    it('init', (done)=>{
      let ctrl = ctrlMount({});
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('PgTable').length).toBe(1);
        done();
      }, 1000);
    });
  });
});
