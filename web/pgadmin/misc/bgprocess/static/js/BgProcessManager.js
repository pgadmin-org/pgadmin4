/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import url_for from 'sources/url_for';
import EventBus from '../../../../static/js/helpers/EventBus';
import gettext from 'sources/gettext';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import * as BgProcessNotify from './BgProcessNotify';
import pgAdmin from 'sources/pgadmin';
import { processesPanelData } from '../../../../static/js/BrowserComponent';
import { BgProcessManagerEvents, BgProcessManagerProcessState } from './BgProcessConstants';

const WORKER_INTERVAL = 1000;

export default class BgProcessManager {
  static instance;

  static getInstance(...args) {
    if (!BgProcessManager.instance) {
      BgProcessManager.instance = new BgProcessManager(...args);
    }
    return BgProcessManager.instance;
  }

  constructor(pgBrowser) {
    this.api = getApiInstance();
    this.pgBrowser = pgBrowser;
    this._procList = [];
    this._workerId = null;
    this._pendingJobId = [];
    this._eventManager = new EventBus();
  }

  init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.startWorker();
  }

  get procList() {
    return this._procList;
  }

  set procList(val) {
    throw new Error('Property processList is readonly.', val);
  }

  async startWorker() {
    let self = this;
    await self.syncProcesses();
    /* Fill the pending jobs initially */
    self._pendingJobId = this.procList.filter((p)=>(p.process_state == BgProcessManagerProcessState.PROCESS_STARTED)).map((p)=>p.id);
    this._workerId = setInterval(()=>{
      if(self._pendingJobId.length > 0) {
        self.syncProcesses();
      }
    }, WORKER_INTERVAL);
  }

  evaluateProcessState(p) {
    let retState = p.process_state;
    if((p.etime || p.exit_code !=null) && p.process_state == BgProcessManagerProcessState.PROCESS_STARTED) {
      retState =  BgProcessManagerProcessState.PROCESS_FINISHED;
    }
    if(retState == BgProcessManagerProcessState.PROCESS_FINISHED && p.exit_code != 0) {
      retState = BgProcessManagerProcessState.PROCESS_FAILED;
    }
    return retState;
  }

  async syncProcesses() {
    try {
      let {data: resData} = await this.api.get(url_for('bgprocess.list'));
      this._procList = resData?.map((p)=>{
        let processState = this.evaluateProcessState(p);
        return {
          ...p,
          process_state: processState,
          canDrop: ![BgProcessManagerProcessState.PROCESS_NOT_STARTED, BgProcessManagerProcessState.PROCESS_STARTED].includes(processState),
        };
      });
      this._eventManager.fireEvent(BgProcessManagerEvents.LIST_UPDATED);
      this.checkPending();
    } catch (error) {
      console.error(error);
    }
  }

  checkPending() {
    const completedProcIds = this.procList.filter((p)=>{
      if(![
        BgProcessManagerProcessState.PROCESS_NOT_STARTED,
        BgProcessManagerProcessState.PROCESS_STARTED,
        BgProcessManagerProcessState.PROCESS_TERMINATING].includes(p.process_state)) {
        return true;
      }
    }).map((p)=>p.id);
    this._pendingJobId = this._pendingJobId.filter((id)=>{
      if(completedProcIds.includes(id)) {
        let p = this.procList.find((p)=>p.id==id);
        BgProcessNotify.processCompleted(p?.desc, p?.process_state, this.openProcessesPanel.bind(this));
        if(p.server_id != null) {
          this.updateCloudDetails(p.id);
        }
        return false;
      }
      return true;
    });
  }

  startProcess(jobId, desc) {
    if(jobId) {
      this._pendingJobId.push(jobId);
      BgProcessNotify.processStarted(desc, this.openProcessesPanel.bind(this));
    }
  }

  stopProcess(jobId) {
    this.procList.find((p)=>p.id == jobId).process_state = BgProcessManagerProcessState.PROCESS_TERMINATING;
    this._eventManager.fireEvent(BgProcessManagerEvents.LIST_UPDATED);
    return this.api.put(url_for('bgprocess.stop_process', {
      pid: jobId,
    }))
      .then(()=>{
        this.procList.find((p)=>p.id == jobId).process_state = BgProcessManagerProcessState.PROCESS_TERMINATED;
        this._eventManager.fireEvent(BgProcessManagerEvents.LIST_UPDATED);
      })
      .catch((err)=>{
        pgAdmin.Browser.notifier.error(parseApiError(err));
      });
  }

  acknowledge(jobIds) {
    const removeJob = (jobId)=>{
      this._procList = this.procList.filter((p)=>p.id!=jobId);
      this._eventManager.fireEvent(BgProcessManagerEvents.LIST_UPDATED);
    };
    jobIds.forEach((jobId)=>{
      this.api.put(url_for('bgprocess.acknowledge', {
        pid: jobId,
      }))
        .then(()=>{
          removeJob(jobId);
        })
        .catch((err)=>{
          if(err.response?.status == 410) {
          /* Object not available */
            removeJob(jobId);
          } else {
            pgAdmin.Browser.notifier.error(parseApiError(err));
          }
        });
    });
  }

  updateCloudDetails(jobId) {
    this.api.put(url_for('bgprocess.update_cloud_details', {
      pid: jobId,
    }))
      .then((res)=>{
        let _server = res.data?.data?.node;
        if(!_server) {
          pgAdmin.Browser.notifier.error(gettext('Cloud server deployment is pending'));
          return;
        }
        let  _server_path = '/browser/server_group_' + _server.gid + '/' + _server.id,
          _tree = this.pgBrowser.tree,
          _item = _tree.findNode(_server_path);

        if (_item) {
          if(_server.status) {
            let _dom = _item.domNode;
            _tree.addIcon(_dom, {icon: _server.icon});
            let d = _tree.itemData(_dom);
            d.cloud_status = _server.cloud_status;
            _tree.update(_dom, d);
          }
          else {
            _tree.remove(_item.domNode);
            _tree.refresh(_item.domNode.parent);
          }
        }
      })
      .catch((err)=>{
        if(err.response?.status != 410) {
          pgAdmin.Browser.notifier.error(gettext('Failed Cloud Deployment.'));
        }
      });
  }

  recheckCloudServer(sid) {
    let self = this;
    let process = self.procList.find((p)=>p.server_id==sid);
    if(process) {
      this.updateCloudDetails(process.id);
    }
  }

  openProcessesPanel() {
    let processPanel = this.pgBrowser.docker.find(BROWSER_PANELS.PROCESSES);
    if(!processPanel) {
      pgAdmin.Browser.docker.openTab(processesPanelData, BROWSER_PANELS.MAIN, 'middle', true);
    } else {
      this.pgBrowser.docker.focus(BROWSER_PANELS.PROCESSES);
    }
  }

  registerListener(event, callback) {
    this._eventManager.registerListener(event, callback);
  }

  deregisterListener(event, callback) {
    this._eventManager.deregisterListener(event, callback);
  }
}
