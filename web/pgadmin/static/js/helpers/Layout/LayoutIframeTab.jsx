import { Portal } from '@material-ui/core';
import React, { useEffect, useRef, useState } from 'react';
import Frame from 'react-frame-component';
import PropTypes from 'prop-types';
import CustomPropTypes from '../../custom_prop_types';

export default function LayoutIframeTab({target, src, children}) {
  const selfRef = useRef();
  const [iframeTarget, setIframeTarget] = useState();

  useEffect(()=>{
    if (!selfRef.current || !iframeTarget) return;

    let lastKnownPosition = null;

    const updatePositionAndSize = () => {
      if (!selfRef.current) return;
      const rect = selfRef.current.getBoundingClientRect();

      // Only update the iframe's position if the position has actually changed
      if (
        !lastKnownPosition ||
        rect.top !== lastKnownPosition.top ||
        rect.left !== lastKnownPosition.left ||
        rect.width !== lastKnownPosition.width ||
        rect.height !== lastKnownPosition.height
      ) {
        iframeTarget.style.position = 'fixed'; // You can adjust this if needed
        iframeTarget.style.top = `${rect.top}px`;
        iframeTarget.style.left = `${rect.left}px`;
        iframeTarget.style.width = `${rect.width}px`;
        iframeTarget.style.height = `${rect.height}px`;

        lastKnownPosition = rect;
      }

      requestAnimationFrame(updatePositionAndSize); // Schedule the next check
    };

    updatePositionAndSize(); // initial update

    return () => {
      cancelAnimationFrame(updatePositionAndSize);
    };
  }, [iframeTarget]);

  return <>
    <div ref={selfRef} data-target={target} style={{width: '100%', height: '100%'}}></div>
    <Portal ref={(r)=>{
      if(r) setIframeTarget(r.querySelector('#'+target));
    }} container={document.querySelector('#layout-portal')}>
      {src ?
        <iframe src={src} id={target} style={{position: 'fixed'}} />:
        <Frame src={src} id={target} style={{position: 'fixed'}}>
          {children}
        </Frame>
      }
    </Portal>
  </>;
}

LayoutIframeTab.propTypes = {
  target: PropTypes.string,
  src: PropTypes.string,
  children: CustomPropTypes.children,
};
