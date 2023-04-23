/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import BgProcessManager, { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import pgAdmin from 'sources/pgadmin';
import * as BgProcessNotify from '../../../pgadmin/misc/bgprocess/static/js/BgProcessNotify';
import Notifier from '../../../pgadmin/static/js/helpers/Notifier';

describe('BgProcessNotify', ()=>{
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
  });

  it('processStarted', ()=>{
    const nspy = spyOn(Notifier, 'notify');
    BgProcessNotify.processStarted('some desc', ()=>{/* dummy */});
    expect(nspy.calls.mostRecent().args[0].props).toEqual(jasmine.objectContaining({
      title: 'Process started',
      desc: 'some desc',
    }));
  });

  it('processCompleted success', ()=>{
    const nspy = spyOn(Notifier, 'notify');
    BgProcessNotify.processCompleted('some desc', BgProcessManagerProcessState.PROCESS_FINISHED, ()=>{/* dummy */});
    expect(nspy.calls.mostRecent().args[0].props).toEqual(jasmine.objectContaining({
      title: 'Process completed',
      desc: 'some desc',
      success: true,
    }));
  });

  it('processCompleted failed', ()=>{
    const nspy = spyOn(Notifier, 'notify');
    BgProcessNotify.processCompleted('some desc', BgProcessManagerProcessState.PROCESS_FAILED, ()=>{/* dummy */});
    expect(nspy.calls.mostRecent().args[0].props).toEqual(jasmine.objectContaining({
      title: 'Process failed',
      desc: 'some desc',
      success: false,
    }));
  });

  it('processCompleted terminated', ()=>{
    const nspy = spyOn(Notifier, 'notify');
    BgProcessNotify.processCompleted('some desc', BgProcessManagerProcessState.PROCESS_TERMINATED, ()=>{/* dummy */});
    expect(nspy.calls.mostRecent().args[0].props).toEqual(jasmine.objectContaining({
      title: 'Process terminated',
      desc: 'some desc',
      success: false,
    }));
  });
});
