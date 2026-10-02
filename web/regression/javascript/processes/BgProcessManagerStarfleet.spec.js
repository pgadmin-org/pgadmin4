/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import pgAdmin from 'sources/pgadmin';
import BgProcessManager from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import { showStarfleetPassword } from '../../../pgadmin/misc/cloud/static/js/StarfleetPasswordDialog';

jest.mock('../../../pgadmin/misc/cloud/static/js/StarfleetPasswordDialog', ()=>({
  showStarfleetPassword: jest.fn(),
}));

describe('BgProcessManager Starfleet password dialog', ()=>{
  let networkMock;
  let obj;

  const baseNode = {sid: 7, gid: 1, id: 7, status: true, cloud_status: 'x', icon: 'i'};

  beforeEach(()=>{
    networkMock = new MockAdapter(axios);
    obj = new BgProcessManager({
      ...pgAdmin.Browser,
      tree: {findNode: jest.fn().mockReturnValue(null)},
    });
    showStarfleetPassword.mockClear();
  });

  afterEach(()=>{
    networkMock.restore();
  });

  const complete = async (jobId)=>{
    obj.updateCloudDetails(jobId);
    await new Promise((resolve)=>setTimeout(resolve, 50));
  };

  it('opens the dialog once per job for a Starfleet node', async ()=>{
    networkMock.onPut('/misc/bgprocess/update_cloud_details/job1').reply(200, {
      data: {node: {...baseNode, starfleet: true, starfleet_password: 'Not-A-Real-Password-1'}},
    });
    await complete('job1');
    await complete('job1');
    expect(showStarfleetPassword).toHaveBeenCalledTimes(1);
  });

  it('reports a failed deployment with its error once per job', async ()=>{
    const errorText = jest.spyOn(pgAdmin.Browser.notifier, 'errorText').mockImplementation(()=>{});
    networkMock.onPut('/misc/bgprocess/update_cloud_details/job3').reply(200, {
      data: {node: {...baseNode, status: false, errmsg: 'no payment method on file'}},
    });
    await complete('job3');
    await complete('job3');
    expect(errorText).toHaveBeenCalledTimes(1);
    expect(errorText).toHaveBeenCalledWith('Cloud deployment failed: no payment method on file');

    networkMock.onPut('/misc/bgprocess/update_cloud_details/job4').reply(200, {
      data: {node: {...baseNode, status: false}},
    });
    await complete('job4');
    expect(errorText).toHaveBeenLastCalledWith('Cloud deployment failed.');
    expect(showStarfleetPassword).not.toHaveBeenCalled();
    errorText.mockRestore();
  });

  it('never opens the dialog for a non-Starfleet node', async ()=>{
    networkMock.onPut('/misc/bgprocess/update_cloud_details/job2').reply(200, {
      data: {node: {...baseNode}},
    });
    await complete('job2');
    expect(showStarfleetPassword).not.toHaveBeenCalled();
  });
});
