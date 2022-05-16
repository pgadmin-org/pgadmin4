/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import pgAdmin from 'sources/pgadmin';
import ConnectServerContent from './ConnectServerContent';
import Theme from 'sources/Theme';
import url_for from 'sources/url_for';
import getApiInstance from '../../../static/js/api_instance';

function setNewSize(panel, width, height) {
  // Add height of the header
  let newHeight = height + 31;
  // Set min and max size of the panel
  panel.minSize(width, newHeight);
  panel.maxSize(width, newHeight);
  panel.maximisable(false);
  /* No other way to update size, below is the only way */
  panel._parent._size.x = width;
  panel._parent._size.y = newHeight;
  panel._parent.__update();
}

// This functions is used to show the connect server password dialog.
export function showServerPassword() {
  var pgBrowser = pgAdmin.Browser,
    title = arguments[0],
    formJson = arguments[1],
    nodeObj = arguments[2],
    nodeData = arguments[3],
    treeNodeInfo = arguments[4],
    itemNodeData = arguments[5],
    status = arguments[6],
    onSuccess = arguments[7],
    onFailure = arguments[8];

  // Register dialog panel
  pgBrowser.Node.registerUtilityPanel();
  var panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md),
    j = panel.$container.find('.obj_properties').first();
  panel.title(title);

  ReactDOM.render(
    <Theme>
      <ConnectServerContent
        setHeight={(containerHeight)=>{
          setNewSize(panel, pgBrowser.stdW.md, containerHeight);
        }}
        closeModal={()=>{
          panel.close();
        }}
        data={formJson}
        onOK={(formData)=>{
          const api = getApiInstance();
          var _url = nodeObj.generate_url(itemNodeData, 'connect', nodeData, true);
          if (!status) {
            treeNodeInfo.setLeaf(itemNodeData);
            treeNodeInfo.removeIcon(itemNodeData);
            treeNodeInfo.addIcon(itemNodeData, {icon: 'icon-server-connecting'});
          }

          api.post(_url, formData)
            .then(res=>{
              panel.close();
              return onSuccess(
                res.data, nodeObj, nodeData, treeNodeInfo, itemNodeData, status
              );
            })
            .catch((err)=>{
              return onFailure(
                err.response.request, status, err, nodeObj, nodeData, treeNodeInfo,
                itemNodeData, status
              );
            });
        }}
      />
    </Theme>, j[0]);
}

// This functions is used to show the connect server password dialog when
// launch from Schema Diff tool.
export function showSchemaDiffServerPassword() {
  var pgBrowser = pgAdmin.Browser,
    docker = arguments[0],
    title = arguments[1],
    formJson = arguments[2],
    serverID = arguments[3],
    successCallback = arguments[4],
    onSuccess = arguments[5],
    onFailure = arguments[6];

  // Register dialog panel
  pgBrowser.Node.registerUtilityPanel(docker);
  var panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md, undefined, docker),
    j = panel.$container.find('.obj_properties').first();
  panel.title(title);

  ReactDOM.render(
    <Theme>
      <ConnectServerContent
        setHeight={(containerHeight)=>{
          setNewSize(panel, pgBrowser.stdW.md, containerHeight);
        }}
        closeModal={()=>{
          panel.close();
        }}
        data={formJson}
        onOK={(formData)=>{
          const api = getApiInstance();
          var _url = url_for('schema_diff.connect_server', {'sid': serverID});

          api.post(_url, formData)
            .then(res=>{
              panel.close();
              return onSuccess(res.data, successCallback);
            })
            .catch((err)=>{
              return onFailure(
                err.response.request, status, err, serverID, successCallback
              );
            });
        }}
      />
    </Theme>, j[0]);
}
