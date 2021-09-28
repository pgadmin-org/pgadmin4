import {useRef, useEffect, useState, useCallback} from 'react';

/* React hook for setInterval */
export function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  });

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
