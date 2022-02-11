import {useRef, useEffect, useState, useCallback} from 'react';
export { useStopwatch } from 'react-timer-hook';

/* React hook for setInterval */
export function useInterval(callback, delay) {
  const savedCallback = useRef();
  savedCallback.current = callback;

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if(delay > -1) {
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
    return shortcut.alt == e.altKey &&
      shortcut.shift == e.shiftKey &&
      shortcut.control == e.ctrlKey &&
      shortcut.key.key_code == keyCode;
  };
  useEffect(()=>{
    let ele = eleRef.current ?? document;
    const keyupCallback = (e)=>{
      for(let i=0; i<(shortcutsRef.current??[]).length; i++){
        let {shortcut, options} = shortcutsRef.current[i];
        if(matchFound(shortcut, e)) {
          if(options.callback && (options.enabled ?? true)) {
            options.callback(e);
          }
          break;
        }
      }
    };
    ele.addEventListener('keyup', keyupCallback);
    return ()=>{
      ele.removeEventListener('keyup', keyupCallback);
    };
  }, [eleRef.current]);

  useEffect(()=>{
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);
}
