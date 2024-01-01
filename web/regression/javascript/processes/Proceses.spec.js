/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render } from '@testing-library/react';
import { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessConstants';
import BgProcessManager from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import pgAdmin from 'sources/pgadmin';
import Processes from '../../../pgadmin/misc/bgprocess/static/js/Processes';
import { withBrowser } from '../genericFunctions';


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
  beforeEach(()=>{
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.BgProcessManager = new BgProcessManager(pgAdmin.Browser);
    pgAdmin.Browser.BgProcessManager._procList = [processData];
  });

  describe('ProcessDetails', ()=>{
    const ProcesesWithBrowser = withBrowser(Processes);
    let ctrlMount = (props)=>{
      return render(<ProcesesWithBrowser {...props} />);
    };

    it('init', ()=>{
      let ctrl = ctrlMount({});
      expect(ctrl.container.querySelectorAll('[data-test="processes"]').length).toBe(1);
    });
  });
});
