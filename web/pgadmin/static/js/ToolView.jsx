/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { usePgAdmin } from './PgAdminProvider';
import { BROWSER_PANELS } from '../../browser/static/js/constants';
import PropTypes from 'prop-types';
import LayoutIframeTab from './helpers/Layout/LayoutIframeTab';
import { LAYOUT_EVENTS } from './helpers/Layout';
import { useApplicationState } from '../../settings/static/ApplicationStateProvider';


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

export function getToolTabParams(panelId, toolUrl, formParams, tabParams, restore=false) {
  if(tabParams?.internal?.orig_title){
    tabParams.title = tabParams.internal.isDirty ? tabParams.internal.title.slice(0, -1): tabParams.internal.title;
  }
  return {
    id: panelId,
    title: panelId,
    content: (
      <LayoutIframeTab target={panelId} src={formParams ? undefined : toolUrl}>
        {formParams && <ToolForm actionUrl={toolUrl} params={{...formParams, restore:restore, workSpace: tabParams?.workSpace }}/>}
      </LayoutIframeTab>
    ),
    closable: true,
    manualClose: true,
    ...tabParams,
    cache: false,
    group: 'playground',
    metaData: {
      toolUrl: toolUrl,
      formParams: formParams,
      tabParams: tabParams,
    },
  };
}

export default function ToolView({dockerObj}) {
  const pgAdmin = usePgAdmin();
  const { deleteToolData } = useApplicationState();

  useEffect(()=>{
    pgAdmin.Browser.Events.on('pgadmin:tool:show', (panelId, toolUrl, formParams, tabParams, newTab)=>{
      if(newTab) {
        if(formParams) {
          const newWin = window.open('', '_blank');
          const div = newWin.document.createElement('div');
          newWin.document.body.appendChild(div);
          const root = ReactDOM.createRoot(div);
          root.render(
            <ToolForm actionUrl={window.location.origin+toolUrl} params={formParams}/>, div
          );
        } else {
          window.open(toolUrl);
        }
      } else {
        // Handler here will return which layout instance the tool should go in
        // case of workspace layout.
        let handler = pgAdmin.Browser.getDockerHandler?.(panelId, dockerObj);
        const deregisterRemove = handler.docker.eventBus.registerListener(LAYOUT_EVENTS.REMOVE, (closePanelId)=>{
          if(panelId == closePanelId){
            deleteToolData(panelId);
            deregisterRemove();
          }
        });

        handler.focus();
        handler.docker.openTab(
          getToolTabParams(panelId, toolUrl, formParams, tabParams),
          BROWSER_PANELS.MAIN, 'middle', true
        );
      }
    });
  }, []);
  return <></>;
}
ToolView.propTypes = {
  dockerObj: PropTypes.object
};
