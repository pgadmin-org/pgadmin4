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
import gettext from 'sources/gettext';

import getApiInstance from '../../../static/js/api_instance';
import MasterPasswordContent from './MasterPassowrdContent';
import ChangePasswordContent from './ChangePassowrdContent';
import NamedRestoreContent from './NamedRestoreContent';
import Notify from '../../../static/js/helpers/Notifier';

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

function masterPassCallbacks(masterpass_callback_queue) {
  while(masterpass_callback_queue.length > 0) {
    let callback = masterpass_callback_queue.shift();
    callback();
  }
}

export function checkMasterPassword(data, masterpass_callback_queue, cancel_callback) {
  const api = getApiInstance();
  api.post(url_for('browser.set_master_password'), data).then((res)=> {
    if(!res.data.data.present) {
      showMasterPassword(res.data.data.reset, res.data.data.errmsg, masterpass_callback_queue, cancel_callback);
    } else {
      masterPassCallbacks(masterpass_callback_queue);
    }
  }).catch(function(xhr, status, error) {
    Notify.pgRespErrorNotify(xhr, error);
  });
}

// This functions is used to show the master password dialog.
export function showMasterPassword(isPWDPresent, errmsg=null, masterpass_callback_queue, cancel_callback) {
  const api = getApiInstance();
  var pgBrowser = pgAdmin.Browser;

  // Register dialog panel
  pgBrowser.Node.registerUtilityPanel();
  var panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md),
    j = panel.$container.find('.obj_properties').first();
  
  let title =  isPWDPresent ? gettext('Unlock Saved Passwords') : gettext('Set Master Password');
  panel.title(title);

  ReactDOM.render(
    <Theme>
      <MasterPasswordContent
        isPWDPresent= {isPWDPresent}
        data={{'errmsg': errmsg}}
        setHeight={(containerHeight) => {
          setNewSize(panel, pgBrowser.stdW.md, containerHeight);
        }}
        closeModal={() => {
          panel.close();
        }}
        onResetPassowrd={()=>{
          Notify.confirm(gettext('Reset Master Password'),
            gettext('This will remove all the saved passwords. This will also remove established connections to '
            + 'the server and you may need to reconnect again. Do you wish to continue?'),
            function() {
              var _url = url_for('browser.reset_master_password');

              api.delete(_url)
                .then(() => {
                  panel.close();
                  showMasterPassword(false, null, masterpass_callback_queue, cancel_callback);
                })
                .catch((err) => {
                  Notify.error(err.message);
                });
              return true;
            },
            function() {/* If user clicks No */ return true;}
          );
        }}
        onCancel={()=>{
          cancel_callback?.();
        }}
        onOK={(formData) => {
          panel.close();
          checkMasterPassword(formData, masterpass_callback_queue, cancel_callback);
        }}
      />
    </Theme>, j[0]);
}

export function showChangeServerPassword() {
  var pgBrowser = pgAdmin.Browser,
    title = arguments[0],
    nodeData = arguments[1],
    nodeObj = arguments[2],
    itemNodeData = arguments[3],
    isPgPassFileUsed = arguments[4];

  // Register dialog panel
  pgBrowser.Node.registerUtilityPanel();
  var panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md),
    j = panel.$container.find('.obj_properties').first();
  panel.title(title);

  ReactDOM.render(
    <Theme>
      <ChangePasswordContent
        onClose={()=>{
          panel.close();
        }}
        onSave={(isNew, data)=>{
          return new Promise((resolve, reject)=>{
            const api = getApiInstance();
            var _url = nodeObj.generate_url(itemNodeData, 'change_password', nodeData, true);

            api.post(_url, data)
              .then(({data: respData})=>{
                Notify.success(respData.info);
                // Notify user to update pgpass file
                if(isPgPassFileUsed) {
                  Notify.alert(
                    gettext('Change Password'),
                    gettext('Please make sure to disconnect the server'
                    + ' and update the new password in the pgpass file'
                      + ' before performing any other operation')
                  );
                }

                resolve(respData.data);
                panel.close();
              })
              .catch((error)=>{
                reject(error);
              });
          });
        }}
        userName={nodeData.user.name}
        isPgpassFileUsed={isPgPassFileUsed}
      />
    </Theme>, j[0]);
}

export function showNamedRestorePoint() {
  var pgBrowser = pgAdmin.Browser,
    title = arguments[0],
    nodeData = arguments[1],
    nodeObj = arguments[2],
    itemNodeData = arguments[3];

  // Register dialog panel
  pgBrowser.Node.registerUtilityPanel();
  var panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md),
    j = panel.$container.find('.obj_properties').first();
  panel.title(title);

  ReactDOM.render(
    <Theme>
      <NamedRestoreContent
        setHeight={(containerHeight)=>{
          setNewSize(panel, pgBrowser.stdW.md, containerHeight);
        }}
        closeModal={()=>{
          panel.close();
        }}
        onOK={(formData)=>{
          const api = getApiInstance();
          var _url = nodeObj.generate_url(itemNodeData, 'restore_point', nodeData, true);

          api.post(_url, formData)
            .then(res=>{
              panel.close();
              Notify.success(res.data.data.result);
            })
            .catch(function(xhr, status, error) {
              Notify.pgRespErrorNotify(xhr, error);
            });
        }}
      />
    </Theme>, j[0]);
}