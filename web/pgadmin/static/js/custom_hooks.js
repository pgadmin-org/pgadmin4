import {useRef, useEffect, useState, useCallback, useLayoutEffect} from 'react';
import moment from 'moment';

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
  const [isIntersecting, setIntersecting] = useState(false);
  const observer = new IntersectionObserver(
    ([entry]) => {
      setIntersecting(entry.isIntersecting);
    }
  );
  useEffect(() => {
    if(ref?.current) {
      observer.observe(ref.current);
    }
    // Remove the observer as soon as the component is unmounted
    return () => { observer.disconnect(); };
  }, []);

  return isIntersecting;
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
    return Boolean(shortcut.alt) == e.altKey &&
      Boolean(shortcut.shift) == e.shiftKey &&
      Boolean(shortcut.control) == e.ctrlKey &&
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
