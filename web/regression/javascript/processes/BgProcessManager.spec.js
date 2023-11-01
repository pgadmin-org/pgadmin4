import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import pgAdmin from 'sources/pgadmin';
import BgProcessManager from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessConstants';
import * as BgProcessNotify from '../../../pgadmin/misc/bgprocess/static/js/BgProcessNotify';


describe('BgProcessManager', ()=>{
  let obj;
  let networkMock;
  const pgBrowser = pgAdmin.Browser;

  beforeAll(()=>{
    networkMock = new MockAdapter(axios);
    networkMock.onGet('/misc/bgprocess/').reply(200, [{}]);
    networkMock.onPut('/misc/bgprocess/stop/12345').reply(200,{});
    networkMock.onPut('/misc/bgprocess/12345').reply(200,{});
  });

  afterAll(() => {
    networkMock.restore();
  });

  beforeEach(()=>{
    obj = new BgProcessManager(pgBrowser);
  });

  it('init', ()=>{
    jest.spyOn(obj, 'startWorker').mockImplementation(() => {});
    obj.init();
    expect(obj.startWorker).toHaveBeenCalled();
  });

  it('procList', ()=>{
    obj._procList = [{a: '1'}];
    expect(obj.procList).toEqual([{a: '1'}]);
  });

  it('startWorker', (done)=>{
    jest.spyOn(obj, 'syncProcesses').mockImplementation(() => {});
    obj._pendingJobId = ['123123123123'];
    obj.startWorker();

    setTimeout(()=>{
      expect(obj.syncProcesses).toHaveBeenCalled();
      done();
    }, 2000);
  });

  it('startProcess', ()=>{
    let nSpy = jest.spyOn(BgProcessNotify, 'processStarted');
    obj.startProcess('12345', 'process desc');
    expect(obj._pendingJobId).toEqual(['12345']);
    expect(nSpy.mock.calls[nSpy.mock.calls.length - 1][0]).toBe('process desc');
  });


  it('stopProcess', (done)=>{
    obj._procList = [{
      id: '12345',
      process_state: BgProcessManagerProcessState.PROCESS_STARTED,
    }];

    obj.stopProcess('12345');
    setTimeout(()=>{
      expect(obj._procList[0].process_state).toBe(BgProcessManagerProcessState.PROCESS_TERMINATED);
      done();
    }, 500);
  });

  it('acknowledge', (done)=>{
    obj._procList = [{
      id: '12345',
      process_state: BgProcessManagerProcessState.PROCESS_FINISHED,
    }];

    obj.acknowledge(['12345']);
    setTimeout(()=>{
      expect(obj._procList.length).toBe(0);
      done();
    }, 500);
  });


  it('checkPending', ()=>{
    obj._procList = [{
      id: '12345',
      process_state: BgProcessManagerProcessState.PROCESS_FINISHED,
      desc: 'Some desc',
    }];
    obj._pendingJobId = ['12345'];
    let nSpy = jest.spyOn(BgProcessNotify, 'processCompleted');
    obj.checkPending();
    expect(nSpy).toHaveBeenCalled();
  });


  it('openProcessesPanel', ()=>{
    const panel = {};
    jest.spyOn(pgBrowser.docker, 'openTab').mockReturnValue(panel);

    /* panel open */
    jest.spyOn(pgBrowser.docker, 'find').mockReturnValue(panel);
    jest.spyOn(pgBrowser.docker, 'focus');
    obj.openProcessesPanel();
    expect(pgBrowser.docker.focus).toHaveBeenCalled();
    expect(pgBrowser.docker.openTab).not.toHaveBeenCalled();

    /* panel closed */
    jest.spyOn(pgBrowser.docker, 'find').mockReturnValue(null);
    obj.openProcessesPanel();
    expect(pgBrowser.docker.openTab).toHaveBeenCalled();
  });
});
