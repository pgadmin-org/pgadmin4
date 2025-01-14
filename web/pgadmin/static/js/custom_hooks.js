/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useRef, useEffect, useState, useCallback, useLayoutEffect} from 'react';
import moment from 'moment';
import { isMac } from './keyboard_shortcuts';
import { getBrowser } from './utils';

/* React hook for setInterval */
export function useInterval(callback, delay) {
  const savedCallback = useRef();
  savedCallback.current = callback;

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if(delay > -1) {
      tick();
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

/* React hook for handling double and single click events */
export function useSingleAndDoubleClick(handleSingleClick, handleDoubleClick, delay = 250) {
  const clickCountRef = useRef(0);
  const timerRef = useRef(null);

  const handleClick = (e) => {
    // Handle the logic here, no need to pass the event
    clickCountRef.current += 1;

    // Clear any previous timeout to ensure the double-click logic is triggered only once
    clearTimeout(timerRef.current);

    // Set the timeout to handle click logic after the delay
    timerRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) handleSingleClick(e);
      else if (clickCountRef.current === 2) handleDoubleClick(e);

      // Reset the click count and props after handling
      clickCountRef.current = 0;
    }, delay);
  };

  return handleClick;
}


export function useDelayedCaller(callback) {
  let timer;
  useEffect(() => {
    return () => clearTimeout(timer);
  }, []);

  return (delay)=>{
    timer = setTimeout(() => {
      callback();
    }, delay);
  };
}

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function useDelayDebounce(callback, args, delay) {
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (args) {
        callback(args);
      }
    }, delay);
    return () => clearTimeout(delayDebounceFn);
  }, [args]);
}

export function useOnScreen(ref) {
  const [intersecting, setIntersecting] = useState(false);
  const observer = new IntersectionObserver(
    ([entry]) => {
      setIntersecting(entry.intersecting);
    }
  );
  useEffect(() => {
    if(ref?.current) {
      observer.observe(ref.current);
    }
    // Remove the observer as soon as the component is unmounted
    return () => { observer.disconnect(); };
  }, []);

  return intersecting;
}

export function useIsMounted() {
  const ref = useRef(true);
  useEffect(() => {
    return () => {
      ref.current = false;
    };
  }, []);
  return useCallback(() => ref.current, []);
}

export function useStopwatch() {
  const prevTime = useRef(new Date());
  const [totalMsec, setTotalMsec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useInterval(() => {
    setTotalMsec(moment(new Date()).diff(prevTime.current));
  }, isRunning ? 100 : -1);

  function start(startTime) {
    prevTime.current = startTime || new Date();
    setIsRunning(true);
  }

  const pause = (endTime)=>{
    setIsRunning(false);
    setTotalMsec(moment(endTime || new Date()).diff(prevTime.current));
  };

  function reset() {
    setTotalMsec(0);
  }

  let msec = totalMsec;
  /* Extract seconds from millisecs */
  let seconds = parseInt(msec/1000);
  msec = msec%1000;

  /* Extract mins from seconds */
  let minutes = parseInt(seconds/60);
  seconds = seconds%60;

  /* Extract hrs from mins */
  let hours = parseInt(minutes/60);
  minutes = minutes%60;

  return {
    hours: hours,
    minutes: minutes,
    seconds: seconds,
    msec: msec,
    start, pause, reset, isRunning,
  };
}

/*
  shortcuts = [
    {
      // From the preferences
      shortcut: {
        'control': true,
        'shift': false,
        'alt': true,
        'key': {
          'key_code': 73,
          'char': 'I',
        },
      },
      options: {
        callback: ()=>{}
        enabled?: boolean optional
      }
    }
  ]
*/
export function useKeyboardShortcuts(shortcuts, eleRef) {
  const shortcutsRef = useRef(shortcuts);

  const matchFound = (shortcut, e)=>{
    if(!shortcut) return false;
    let keyCode = e.which || e.keyCode;
    const ctrlKey = (isMac() && shortcut.ctrl_is_meta) ? e.metaKey : e.ctrlKey;

    return Boolean(shortcut.alt) == e.altKey &&
      Boolean(shortcut.shift) == e.shiftKey &&
      Boolean(shortcut.control) == ctrlKey &&
      shortcut.key.key_code == keyCode;
  };
  useEffect(()=>{
    let ele = eleRef.current ?? document;
    const keydownCallback = (e)=>{
      Promise.resolve(0).then(()=>{
        let allListeners = _.filter(shortcutsRef.current, (s)=>matchFound(s.shortcut, e));
        for(const {options} of allListeners) {
          Promise.resolve(0).then(()=>{
            if(options.callback && (options.enabled ?? true)) {
              e.preventDefault();
              e.stopPropagation();
              options.callback(e);
            }
          });
        }
      });
    };
    ele.addEventListener('keydown', keydownCallback);
    return ()=>{
      ele.removeEventListener('keydown', keydownCallback);
    };
  }, [eleRef.current]);

  useEffect(()=>{
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);
}

export function useWindowSize() {
  const [size, setSize] = useState([999999, 999999]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}

export function useForceUpdate() {
  return React.useReducer(() => ({}), {})[1];
}

export function useBeforeUnload({ enabled, isNewTab, beforeClose, closePanel }) {
  const onBeforeUnload = useCallback((e)=>{
    e.preventDefault();
    e.returnValue = 'prevent';
  }, []);

  const onBeforeUnloadElectron = useCallback((e)=>{
    e.preventDefault();
    e.returnValue = 'prevent';
    beforeClose?.(forceClose);
  }, []);

  function forceClose() {
    if(getBrowser().name == 'Electron' && isNewTab) {
      window.removeEventListener('beforeunload', onBeforeUnloadElectron);
      // somehow window.close was not working may becuase the removeEventListener
      // was not completely executed. Add timeout.
      setTimeout(()=>window.close(), 50);
    } else {
      closePanel?.();
    }
  }

  useEffect(()=>{
    if(getBrowser().name == 'Electron'  && isNewTab) {
      if(enabled) {
        window.addEventListener('beforeunload', onBeforeUnloadElectron);
      } else {
        window.removeEventListener('beforeunload', onBeforeUnloadElectron);
      }
    } else if(getBrowser().name != 'Electron') {
      if(enabled){
        window.addEventListener('beforeunload', onBeforeUnload);
      } else {
        window.removeEventListener('beforeunload', onBeforeUnload);
      }
    }

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnloadElectron);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [enabled]);

  return {forceClose};
}
