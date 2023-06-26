/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import pgAdmin from 'sources/pgadmin';
import ConnectServerContent from './ConnectServerContent';
import url_for from 'sources/url_for';
import gettext from 'sources/gettext';

import getApiInstance from '../api_instance';
import MasterPasswordContent from './MasterPasswordContent';
import ChangePasswordContent from './ChangePasswordContent';
import NamedRestoreContent from './NamedRestoreContent';
import ChangeOwnershipContent from './ChangeOwnershipContent';
import UrlDialogContent from './UrlDialogContent';
import RenameTabContent from './RenameTabContent';
import { BROWSER_PANELS } from '../../../browser/static/js/constants';
import ErrorBoundary from '../helpers/ErrorBoundary';
import QuickSearch from '../QuickSearch';

// This functions is used to show the connect server password dialog.
export function showServerPassword() {
  let title = arguments[0],
    formJson = arguments[1],
    nodeObj = arguments[2],
    nodeData = arguments[3],
    treeNodeInfo = arguments[4],
    itemNodeData = arguments[5],
    status = arguments[6],
    onSuccess = arguments[7],
    onFailure = arguments[8];

  pgAdmin.Browser.notifier.showModal(title, (onClose) => {
    return (
      <ConnectServerContent
        closeModal={()=>{
          onClose();
        }}
        data={formJson}
        onOK={(formData)=>{
          const api = getApiInstance();
          let _url = nodeObj.generate_url(itemNodeData, 'connect', nodeData, true);
          if (!status) {
            treeNodeInfo.setLeaf(itemNodeData);
            treeNodeInfo.removeIcon(itemNodeData);
            treeNodeInfo.addIcon(itemNodeData, {icon: 'icon-server-connecting'});
          }

          api.post(_url, formData)
            .then(res=>{
              onClose();
              return onSuccess(
                res.data, nodeObj, nodeData, treeNodeInfo, itemNodeData, status
              );
            })
            .catch((err)=>{
              return onFailure(
                err, null, nodeObj, nodeData, treeNodeInfo, itemNodeData, status
              );
            });
        }}
      />
    );
  });
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
    let isKeyring = res.data.data.keyring_name.length > 0;

    if(!res.data.data.present) {
      if (res.data.data.invalid_master_password_hook){
        if(res.data.data.is_error){
          pgAdmin.Browser.notifier.error(res.data.data.errmsg);
        }else{
          pgAdmin.Browser.notifier.confirm(gettext('Reset Master Password'),
            gettext('The master password retrieved from the master password hook utility is different from what was previously retrieved.') + '<br>'
            + gettext('Do you want to reset your master password to match?') + '<br><br>'
            + gettext('Note that this will close all open database connections and remove all saved passwords.'),
            function() {
              let _url = url_for('browser.reset_master_password');
              api.delete(_url)
                .then(() => {
                  pgAdmin.Browser.notifier.info('The master password has been reset.');
                })
                .catch((err) => {
                  pgAdmin.Browser.notifier.error(err.message);
                });
              return true;
            },
            function() {/* If user clicks No */ return true;}
          );}
      }else{
        showMasterPassword(res.data.data.reset, res.data.data.errmsg, masterpass_callback_queue, cancel_callback, res.data.data.keyring_name);
      }

    } else {
      masterPassCallbacks(masterpass_callback_queue);

      if(isKeyring) {
        pgAdmin.Browser.notifier.alert(gettext('Migration successful'),
          gettext(`Passwords previously saved by pgAdmin have been successfully migrated to ${res.data.data.keyring_name} and removed from the pgAdmin store.`));
      }
    }
  }).catch(function(error) {
    pgAdmin.Browser.notifier.pgRespErrorNotify(error);
  });
}

// This functions is used to show the master password dialog.
export function showMasterPassword(isPWDPresent, errmsg, masterpass_callback_queue, cancel_callback, keyring_name='') {
  const api = getApiInstance();
  let title =  keyring_name.length > 0 ? gettext('Migrate Saved Passwords') : isPWDPresent ? gettext('Unlock Saved Passwords') : gettext('Set Master Password');

  pgAdmin.Browser.notifier.showModal(title, (onClose)=> {
    return (
      <MasterPasswordContent
        isPWDPresent= {isPWDPresent}
        data={{'errmsg': errmsg}}
        keyringName={keyring_name}
        closeModal={() => {
          onClose();
        }}
        onResetPassowrd={(isKeyRing=false)=>{
          pgAdmin.Browser.notifier.confirm(gettext('Reset Master Password'),
            gettext('This will remove all the saved passwords. This will also remove established connections to '
            + 'the server and you may need to reconnect again. Do you wish to continue?'),
            function() {
              let _url = url_for('browser.reset_master_password');

              api.delete(_url)
                .then(() => {
                  onClose();
                  if(!isKeyRing) {
                    showMasterPassword(false, null, masterpass_callback_queue, cancel_callback);
                  }
                })
                .catch((err) => {
                  pgAdmin.Browser.notifier.error(err.message);
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
          onClose();
          checkMasterPassword(formData, masterpass_callback_queue, cancel_callback);
        }}
      />
    );
  });
}

export function showChangeServerPassword() {
  let title = arguments[0],
    nodeData = arguments[1],
    nodeObj = arguments[2],
    itemNodeData = arguments[3],
    isPgPassFileUsed = arguments[4];

  const panelId = BROWSER_PANELS.SEARCH_OBJECTS;
  const onClose = ()=>{pgAdmin.Browser.docker.close(panelId);};
  pgAdmin.Browser.docker.openDialog({
    id: panelId,
    title: title,
    content: (
      <ChangePasswordContent
        onClose={onClose}
        onSave={(isNew, data)=>{
          return new Promise((resolve, reject)=>{
            const api = getApiInstance();
            let _url = nodeObj.generate_url(itemNodeData, 'change_password', nodeData, true);

            api.post(_url, data)
              .then(({data: respData})=>{
                pgAdmin.Browser.notifier.success(respData.info);
                // Notify user to update pgpass file
                if(isPgPassFileUsed) {
                  pgAdmin.Browser.notifier.alert(
                    gettext('Change Password'),
                    gettext('Please make sure to disconnect the server'
                    + ' and update the new password in the pgpass file'
                      + ' before performing any other operation')
                  );
                }

                resolve(respData.data);
                onClose();
              })
              .catch((error)=>{
                reject(error);
              });
          });
        }}
        userName={nodeData.user.name}
        isPgpassFileUsed={isPgPassFileUsed}
      />
    )
  }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.md);
}

export function showChangeUserPassword(url) {
  const panelId = BROWSER_PANELS.SEARCH_OBJECTS;
  const onClose = ()=>{pgAdmin.Browser.docker.close(panelId);};
  pgAdmin.Browser.docker.openDialog({
    id: panelId,
    title: gettext('Change pgAdmin User Password'),
    content: (
      <ChangePasswordContent
        getInitData={()=>{
          const api = getApiInstance();
          return new Promise((resolve, reject)=>{
            api.get(url)
              .then((res)=>{
                resolve(res.data);
              })
              .catch((err)=>{
                reject(err);
              });
          });
        }}
        onClose={()=>{
          onClose();
        }}
        onSave={(_isNew, data)=>{
          const api = getApiInstance();
          return new Promise((resolve, reject)=>{
            const formData =  {
              'password': data.password,
              'new_password': data.newPassword,
              'new_password_confirm': data.confirmPassword,
              'csrf_token': data.csrf_token
            };

            api({
              method: 'POST',
              url: url,
              data: formData,
            }).then((res)=>{
              resolve(res.data.info);
              onClose();
              pgAdmin.Browser.notifier.success(res.data.info);
            }).catch((err)=>{
              reject(err);
            });
          });
        }}
        hasCsrfToken={true}
        showUser={false}
      />
    )
  }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.md);
}

export function showNamedRestorePoint() {
  let title = arguments[0],
    nodeData = arguments[1],
    nodeObj = arguments[2],
    itemNodeData = arguments[3];

  const panelId = BROWSER_PANELS.SEARCH_OBJECTS;
  const onClose = ()=>{pgAdmin.Browser.docker.close(panelId);};
  pgAdmin.Browser.docker.openDialog({
    id: panelId,
    title: title,
    content: (
      <NamedRestoreContent
        closeModal={onClose}
        onOK={(formData)=>{
          const api = getApiInstance();
          let _url = nodeObj.generate_url(itemNodeData, 'restore_point', nodeData, true);

          api.post(_url, formData)
            .then(res=>{
              onClose();
              pgAdmin.Browser.notifier.success(res.data.data.result);
            })
            .catch(function(error) {
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
            });
        }}
      />
    )
  }, pgAdmin.Browser.stdW.md, 180);
}

export function showChangeOwnership() {
  let title = arguments[0],
    userList = arguments[1],
    noOfSharedServers = arguments[2],
    deletedUser = arguments[3],
    deleteUserRow = arguments[4];

  // Render Preferences component
  pgAdmin.Browser.notifier.showModal(title, (onClose) => {
    return <ChangeOwnershipContent
      onClose={()=>{
        onClose();
      }}
      onSave={(isNew, data)=>{
        const api = getApiInstance();

        return new Promise((resolve, reject)=>{
          if (data.newUser == '') {
            deleteUserRow();
            onClose();
          } else {
            let newData = {'new_owner': `${data.newUser}`, 'old_owner': `${deletedUser['id']}`};
            api.post(url_for('user_management.change_owner'), newData)
              .then(({data: respData})=>{
                pgAdmin.Browser.notifier.success(gettext(respData.info));
                onClose();
                deleteUserRow();
                resolve(respData.data);
              })
              .catch((err)=>{
                reject(err);
              });
          }
        });
      }}
      userList = {userList}
      noOfSharedServers = {noOfSharedServers}
      deletedUser = {deletedUser['name']}
    />;
  },
  { isFullScreen: false, isResizeable: true, showFullScreen: true, isFullWidth: true,
    dialogWidth: pgAdmin.Browser.stdW.md, dialogHeight: pgAdmin.Browser.stdH.md});
}

export function showUrlDialog() {
  let title = arguments[0],
    url = arguments[1],
    helpFile = arguments[2],
    width = arguments[3],
    height = arguments[4];

  pgAdmin.Browser.notifier.showModal(title, (onClose) => {
    return <UrlDialogContent url={url} helpFile={helpFile} onClose={onClose} />;
  },
  { isFullScreen: false, isResizeable: true, showFullScreen: true, isFullWidth: true,
    dialogWidth: width || pgAdmin.Browser.stdW.md, dialogHeight: height || pgAdmin.Browser.stdH.md});
}

export function showRenameTab(panelId, panelDocker) {
  pgAdmin.Browser.notifier.showModal(gettext('Rename Tab'), (onClose) => {
    return (
      <ErrorBoundary>
        <RenameTabContent
          closeModal={()=>{
            onClose();
          }}
          panelId={panelId}
          panelDocker={panelDocker}
        />
      </ErrorBoundary>
    );
  });
}

export function showQuickSearch() {
  pgAdmin.Browser.notifier.showModal(gettext('Quick Search'), (closeModal) => {
    return <QuickSearch closeModal={closeModal}/>;
  },
  { isFullScreen: false, isResizeable: false, showFullScreen: false, isFullWidth: false, showTitle: false}
  );
}
