/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////



import { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessConstants';
import BgProcessManager from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import pgAdmin from 'sources/pgadmin';
import * as BgProcessNotify from '../../../pgadmin/misc/bgprocess/static/js/BgProcessNotify';
describe('BgProcessNotify', ()=>{






  beforeEach(()=>{

    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.BgProcessManager = new BgProcessManager(pgAdmin.Browser);
  });

  it('processStarted', ()=>{
    const nspy = jest.spyOn(pgAdmin.Browser.notifier, 'notify');
    BgProcessNotify.processStarted('some desc', ()=>{/* dummy */});
    expect(nspy.mock.calls[nspy.mock.calls.length - 1][0].props).toEqual(expect.objectContaining({
      title: 'Process started',
      desc: 'some desc',
    }));
  });

  it('processCompleted success', ()=>{
    const nspy = jest.spyOn(pgAdmin.Browser.notifier, 'notify');
    BgProcessNotify.processCompleted('some desc', BgProcessManagerProcessState.PROCESS_FINISHED, ()=>{/* dummy */});
    expect(nspy.mock.calls[nspy.mock.calls.length - 1][0].props).toEqual(expect.objectContaining({
      title: 'Process completed',
      desc: 'some desc',
      success: true,
    }));
  });

  it('processCompleted failed', ()=>{
    const nspy = jest.spyOn(pgAdmin.Browser.notifier, 'notify');
    BgProcessNotify.processCompleted('some desc', BgProcessManagerProcessState.PROCESS_FAILED, ()=>{/* dummy */});
    expect(nspy.mock.calls[nspy.mock.calls.length - 1][0].props).toEqual(expect.objectContaining({
      title: 'Process failed',
      desc: 'some desc',
      success: false,
    }));
  });

  it('processCompleted terminated', ()=>{
    const nspy = jest.spyOn(pgAdmin.Browser.notifier, 'notify');
    BgProcessNotify.processCompleted('some desc', BgProcessManagerProcessState.PROCESS_TERMINATED, ()=>{/* dummy */});
    expect(nspy.mock.calls[nspy.mock.calls.length - 1][0].props).toEqual(expect.objectContaining({
      title: 'Process terminated',
      desc: 'some desc',
      success: false,
    }));
  });
});
