import {create} from 'zustand';
import getApiInstance from '../../../static/js/api_instance';
import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

const usePreferences = create((set, get)=>({
  data: {},
  version: 0,
  isLoading: true,
  failed: false,
  getPreferences: (module, preference)=>{
    return _.find(
      get().data, {'module': module, 'name': preference}
    );
  },
  getPreferencesForModule: function(module) {
    let preferences = {};
    _.forEach(
      _.filter(get().data, {'module': module}),
      (preference) => {
        preferences[preference.name] = preference.value;
      }
    );
    return preferences;
  },
  /* Get preference of an id, id is numeric */
  getPreferenceForId : function(id) {
    return _.find(get().data, {'id': id});
  },
  cache: async ()=>{
    try {
      const res = await getApiInstance().get(url_for('preferences.get_all'));
      set({data: res.data, version: (new Date()).getTime(), isLoading: false});
    } catch (error) {
      set({data: {}, version: (new Date()).getTime(), isLoading: false, failed: true});
      pgAdmin.Browser.notifier.pgRespErrorNotify(error);
    }
  }
}));

export default usePreferences;

// Setup two way broadcast channel
// This will help to sync preferences in iframes/tabs of Query tool, debugger, etc.
const preferenceChangeBroadcast = new BroadcastChannel('preference-change');

export function setupPreferenceBroadcast() {
  const broadcast = (state)=>{
    preferenceChangeBroadcast.postMessage({
      data: state.data,
      version: state.version,
    });
  };

  // broadcast when state changed.
  usePreferences.subscribe((state)=>{
    broadcast(state);
  });

  // if asked for sync from a tab then broadcast once.
  preferenceChangeBroadcast.onmessage = (ev)=>{
    if(ev.data == 'sync') {
      broadcast(usePreferences.getState());
    }
  };
}

export function listenPreferenceBroadcast() {
  preferenceChangeBroadcast.onmessage = (ev)=>{
    const currState = usePreferences.getState();
    if(currState.version < ev.data.version) {
      usePreferences.setState({
        ...usePreferences.getState(),
        ...ev.data,
      });
    }
  };

  // initial sync
  preferenceChangeBroadcast.postMessage('sync');

  return new Promise((resolve)=>{
    const i = setInterval(()=>{
      if(usePreferences.getState()?.version > 0) {
        clearInterval(i);
        resolve();
      }
    }, 100);
  });
}
