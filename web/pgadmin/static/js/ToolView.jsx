/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { usePgAdmin } from './BrowserComponent';
import { BROWSER_PANELS } from '../../browser/static/js/constants';
import PropTypes from 'prop-types';
import LayoutIframeTab from './helpers/Layout/LayoutIframeTab';

function ToolForm({actionUrl, params}) {
  const formRef = useRef(null);

  useLayoutEffect(()=>{
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} id="tool-form" action={actionUrl} method="post" hidden>
      {Object.keys(params).map((k)=>{
        return k ? <input key={k} name={k} defaultValue={params[k]} /> : <></>;
      })}
    </form>
  );
}

ToolForm.propTypes = {
  actionUrl: PropTypes.string,
  params: PropTypes.object,
};


export default function ToolView() {
  const pgAdmin = usePgAdmin();

  useEffect(()=>{
    pgAdmin.Browser.Events.on('pgadmin:tool:show', (panelId, toolUrl, formParams, tabParams, newTab)=>{
      if(newTab) {
        if(formParams) {
          const newWin = window.open('', '_blank');
          const div = newWin.document.createElement('div');
          newWin.document.body.appendChild(div);
          ReactDOM.render(
            <ToolForm actionUrl={window.location.origin+toolUrl} params={formParams}/>, div
          );
          // Send the signal to runtime, so that proper zoom level will be set.
          setTimeout(function () {
            pgAdmin.Browser.Events.trigger('pgadmin:nw-set-new-window-open-size');
          }, 500);
        } else {
          window.open(toolUrl);
        }
      } else {
        pgAdmin.Browser.docker.openTab({
          id: panelId,
          title: panelId,
          content: (
            <LayoutIframeTab target={panelId} src={formParams ? undefined : toolUrl}>
              {formParams && <ToolForm actionUrl={toolUrl} params={formParams}/>}
            </LayoutIframeTab>
          ),
          closable: true,
          manualClose: true,
          ...tabParams,
          cache: false,
          group: 'playground'
        }, BROWSER_PANELS.MAIN, 'middle', true);
      }
    });
  }, []);
  return <></>;
}
