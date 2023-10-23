import _ from 'lodash';

export default class EventBus {
  constructor() {
    this._eventListeners = [];
  }

  registerListener(event, callback, once=false) {
    this._eventListeners = this._eventListeners || [];
    this._eventListeners.push({
      event: event,
      callback: callback,
      fired: once ? 'pending' : 'ignore',
    });

    // helpfull in useEffect where we need to cleanup the listeners.
    return ()=>{
      this.deregisterListener(event, callback);
    };
  }

  on(...args) {
    return this.registerListener(...args);
  }

  once(...args) {
    return this.registerListener(...args, true);
  }

  deregisterListener(event, callback) {
    if(callback) {
      this._eventListeners = this._eventListeners.filter((e)=>{
        if(e.event === event) {
          return e.callback != callback;
        }
        return true;
      });
    } else {
      this._eventListeners = this._eventListeners.filter((e)=>e.event!=event);
    }
  }

  off(...args) {
    this.deregisterListener(...args);
  }

  fireEvent(event, ...args) {
    let self = this;
    Promise.resolve(0).then(()=>{
      let allListeners = _.filter(this._eventListeners, (e)=>e.event==event);
      if(allListeners) {
        for(const listener of allListeners) {
          Promise.resolve(0).then(()=>{
            listener.callback(...args);
            if(listener.fired == 'pending') {
              self.deregisterListener(event, listener.callback);
            }
          });
        }
      }
    });
  }

  trigger(...args) {
    this.fireEvent(...args);
  }
}
