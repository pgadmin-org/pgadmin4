import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import BgProcessManager, { BgProcessManagerProcessState } from '../../../pgadmin/misc/bgprocess/static/js/BgProcessManager';
import * as BgProcessNotify from '../../../pgadmin/misc/bgprocess/static/js/BgProcessNotify';



describe('BgProcessManager', ()=>{
  let obj;
  let networkMock;
  const pgBrowser = jasmine.createSpyObj('pgBrowser', [], {
    docker: {
      findPanels: ()=>{/* dummy */},
      addPanel: ()=>{/* dummy */}
    }
  });

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
    spyOn(obj, 'startWorker');
    obj.init();
    expect(obj.startWorker).toHaveBeenCalled();
  });

  it('procList', ()=>{
    obj._procList = [{a: '1'}];
    expect(obj.procList).toEqual([{a: '1'}]);
  });

  it('startWorker', (done)=>{
    spyOn(obj, 'syncProcesses');
    obj._pendingJobId = ['123123123123'];
    obj.startWorker();

    setTimeout(()=>{
      expect(obj.syncProcesses).toHaveBeenCalled();
      done();
    }, 2000);
  });

  it('startProcess', ()=>{
    let nSpy = spyOn(BgProcessNotify, 'processStarted');
    obj.startProcess('12345', 'process desc');
    expect(obj._pendingJobId).toEqual(['12345']);
    expect(nSpy.calls.mostRecent().args[0]).toBe('process desc');
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
    }];
    obj._pendingJobId = ['12345'];
    let nSpy = spyOn(BgProcessNotify, 'processCompleted');
    obj.checkPending();
    expect(nSpy).toHaveBeenCalled();
  });


  it('openProcessesPanel', ()=>{
    const panel = {
      focus: ()=>{/* dummy */}
    };
    spyOn(pgBrowser.docker, 'addPanel').and.returnValue(panel);

    /* panel open */
    spyOn(pgBrowser.docker, 'findPanels').and.returnValue([panel]);
    obj.openProcessesPanel();
    expect(pgBrowser.docker.addPanel).not.toHaveBeenCalled();

    /* panel closed */
    spyOn(pgBrowser.docker, 'findPanels')
      .withArgs('processes').and.returnValue([])
      .withArgs('properties').and.returnValue([panel]);
    obj.openProcessesPanel();
    expect(pgBrowser.docker.addPanel).toHaveBeenCalled();
  });
});
