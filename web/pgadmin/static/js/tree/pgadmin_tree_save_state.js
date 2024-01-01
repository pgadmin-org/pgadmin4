/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import url_for from 'sources/url_for';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import getApiInstance, { callFetch } from '../api_instance';
import usePreferences from '../../../preferences/static/js/store';

export const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};


export const browserTreeState = pgBrowser.browserTreeState = pgBrowser.browserTreeState || {};

_.extend(pgBrowser.browserTreeState, {

  // Parent node to start saving / reloading the tree state
  parent: 'server',

  // The original parent of the browser tree
  orig_parent: 'server_group',

  // Stored tree state
  // Sample Object
  //  {1:
  //    'paths': [
  //      server_group/1,/server/1,/coll-database/1,/database/1,
  //      server_group/1,/server/1,/coll-database/1,/database/2,
  //    ],
  //    'selected': {
  //       'server/1': 'database/2',
  //       'database/1': 'table/1',
  //     },
  //    'conn_status': {
  //      'database/1': 1,
  //      'database/2': 0 ,
  //    },
  //  }
  // Here key is server ID

  stored_state: {},

  // Previous tree state
  last_state: {},

  is_selected: false,

  // Current tree state
  current_state: {},

  init: function() {

    let saveIntervalId, offExpandFromPrevState, offRemoveFromTreeState, offUpdateTreeState;
    usePreferences.subscribe((prefStore)=>{
      // Subscribe to listen for preferences change
      const save_tree_state_period = prefStore.getPreferences('browser', 'browser_tree_state_save_interval')?.value;
      if (saveIntervalId) {
        clearInterval(saveIntervalId);
        saveIntervalId = null;
        offEventListener();
      }
      if (!_.isUndefined(save_tree_state_period) &&  save_tree_state_period !== -1) {
        // Save the tree state at given save_tree_state_period
        saveIntervalId = setInterval(this.save_state, (save_tree_state_period) * 1000);
        this.fetch_state.apply(this);
        onEventListener();
      } else if (!_.isUndefined(save_tree_state_period)) {
        offEventListener();
        getApiInstance().delete(url_for('settings.reset_tree_state'))
          .catch(function(error) {
            console.warn(
              gettext('Error resetting the tree saved state."'), error);
          });
      }
    });

    const onEventListener = () => {
      // Register event listener
      offExpandFromPrevState = pgBrowser.Events.on('pgadmin:browser:tree:expand-from-previous-tree-state',
        this.expand_from_previous_state.bind(this));
      offRemoveFromTreeState = pgBrowser.Events.on('pgadmin:browser:tree:remove-from-tree-state',
        this.remove_from_cache.bind(this));
      offUpdateTreeState = pgBrowser.Events.on('pgadmin:browser:tree:update-tree-state',
        this.update_cache.bind(this));
    };

    const offEventListener = () => {
      // Deregister event listener
      offExpandFromPrevState?.();
      offRemoveFromTreeState?.();
      offUpdateTreeState?.();
    };
    
  },
  save_state: function() {

    let self = pgBrowser.browserTreeState;
    if(self.last_state == JSON.stringify(self.current_state))
      return;

    /* Using fetch with keepalive as the browser may
    cancel the axios request on tab close. keepalive will
    make sure the request is completed */
    callFetch(
      url_for('settings.save_tree_state'), {
        keepalive: true,
        method: 'POST',
        body: JSON.stringify(self.current_state)
      })
      .then(()=> {
        self.last_state = JSON.stringify(self.current_state);
        self.fetch_state();
      })
      .catch((error)=> {
        console.warn(
          gettext('Error resetting the tree saved state."'), error);
      });
  },
  fetch_state: function() {

    let self = this;

    getApiInstance().get(
      url_for('settings.get_tree_state'),
    ).then((res)=> {
      self.stored_state = res.data;
    }).catch(function(error) {
      console.warn(
        gettext('Error resetting the tree saved state."'), error);
    });
  },
  update_cache: function(item) {
    let data = item && pgBrowser.tree.itemData(item),
      treeHierarchy = pgBrowser.tree.getTreeNodeHierarchy(item),
      topParent = undefined,
      pathIDs = pgBrowser.tree.pathId(pgBrowser.tree.parent(item)),
      oldPath = pathIDs.join(),
      path = [],
      tmpIndex = -1;

    // If no parent or the server not in tree hierarchy then return
    if (!pgBrowser.tree.hasParent(item) || !(this.parent in treeHierarchy) || (data._type === 'server' && !data.connected))
      return;

    topParent = treeHierarchy[this.parent]['_id'];


    if (pgBrowser.tree.isOpen(item)) {
      // Store paths

      pathIDs.push(data.id);
      path = pathIDs.join();

      if (!(topParent in this.current_state)) {
        this.current_state[topParent] = {'paths': [], 'selected': {}, 'conn_status': {}, 'is_opened': {}};
      }

      // IF the current path is already saved then return
      let index = _.find(this.current_state[topParent]['paths'], function(tData) {
        return (tData.search(path) !== -1);
      });
      if(_.isUndefined(index)) {

        // Add / Update the current item into the tree path
        if (!_.isUndefined(this.current_state[topParent]['paths'])) {
          tmpIndex = this.current_state[topParent]['paths'].indexOf(oldPath);
        } else {
          this.current_state[topParent]['paths'] = [];
        }
        if (tmpIndex !== -1) {
          this.current_state[topParent]['paths'][tmpIndex] = path;
        }
        else {
          this.current_state[topParent]['paths'].push(path);
        }
      }

    }

    // Store current selected item and database connection status
    this.update_database_status(item);
    this.update_current_selected_item(treeHierarchy);

  },
  remove_from_cache: function(item) {
    let self= this,
      treeData = self.stored_state || {},
      data = item && pgBrowser.tree.itemData(item),
      treeHierarchy = pgBrowser.tree.getTreeNodeHierarchy(item);

    if (treeHierarchy === null || !pgBrowser.tree.hasParent(item) || !(treeHierarchy.hasOwnProperty(self.parent)))
      return;

    let topParent = treeHierarchy && treeHierarchy[self.parent]['_id'],
      origParent = treeHierarchy && treeHierarchy[self.orig_parent]['id'];

    this.update_database_status(item);

    if (data._type == self.parent || data._type == 'database') {
      if (topParent in treeData && 'paths' in treeData[topParent]) {
        treeData[topParent]['paths'] = self.current_state[topParent]['paths'];
        self.save_state();
      }
      return;
    }

    if (pgBrowser.tree.isClosed(item)) {
      let tmpTreeData =  self.current_state[topParent]['paths'],
        databaseId = undefined;

      if (treeHierarchy.hasOwnProperty('database'))
        databaseId = treeHierarchy['database']['id'];

      if (!_.isUndefined(tmpTreeData) && !_.isUndefined(tmpTreeData.length)) {
        let tcnt = 0,
          tmpItemDataStr = undefined;
        _.each(tmpTreeData, function(tData) {
          if (_.isUndefined(tData))
            return;

          let tmpItemData = tData.split(',');

          if (tmpItemData.indexOf(data.id) !== -1 ) {
            if (databaseId === undefined || (databaseId !== undefined && tmpItemData.indexOf(databaseId) !== -1)) {

              let index = tmpItemData.indexOf(data.id);
              tmpItemData.splice(index);
              tmpItemDataStr = tmpItemData.join();

              if (tmpItemDataStr == origParent)
                self.current_state[topParent]['paths'].splice(tData, 1);
              else
                self.current_state[topParent]['paths'][tcnt] = tmpItemDataStr;
            }
          }
          tcnt ++;
        });
      }
    }
  },
  expand_from_previous_state: function(item) {
    let self = this,
      treeData = this.stored_state || {},
      data = item && pgBrowser.tree.itemData(item),
      treeHierarchy = pgBrowser.tree.getTreeNodeHierarchy(item);


    if (treeHierarchy === null || !pgBrowser.tree.hasParent(item) || !(treeHierarchy.hasOwnProperty(self.parent)))
      return;

    // If the server node is open then only we should populate the tree
    if (data['_type'] == self.parent && (pgBrowser.tree.isOpen(item) === false))
      return;

    let tmpTreeData = treeData[treeHierarchy[self.parent]['_id']];


    // If the server node is open then only we should populate the tree
    if (data['_type'] == 'database' && tmpTreeData && 'conn_status' in tmpTreeData && 'is_opened' in tmpTreeData &&
     (tmpTreeData['conn_status'][data['id']] === 0 || tmpTreeData['is_opened'][data['id']] === 0 ||
      !(data['id'] in tmpTreeData['is_opened'])))
      return;


    if (!_.isUndefined(tmpTreeData) && ('paths' in tmpTreeData) && !_.isUndefined(tmpTreeData['paths'].length)) {
      let tmpTreeDataPaths = [...tmpTreeData['paths']],
        databaseId = undefined;

      if (treeHierarchy.hasOwnProperty('database'))
        databaseId = treeHierarchy['database']['id'];

      _.each(tmpTreeDataPaths, function(tData) {
        if (_.isUndefined(tData))
          return;

        let tmpItemData = tData.split(',');

        // If the item is in the lastTreeState then open it
        if (tmpItemData.indexOf(data.id) !== -1) {
          if (databaseId === undefined ||  (databaseId !== undefined && tmpItemData.indexOf(databaseId) !== -1)) {

            let index = tmpItemData.indexOf(data.id);

            pgBrowser.tree.open(item);
            pgBrowser.tree.ensureLoaded(item);
            if (index == (tmpItemData.length - 1 )) {
              let tIndex = treeData[treeHierarchy[self.parent]['_id']]['paths'].indexOf(tData);
              treeData[treeHierarchy[self.parent]['_id']]['paths'].splice(tIndex, 1);
            }
          }
        }
      });
    }

    this.select_tree_item(item);

  },
  update_database_status: function(item) {
    let data = item && pgBrowser.tree.itemData(item),
      treeHierarchy = pgBrowser.tree.getTreeNodeHierarchy(item);

    if (treeHierarchy.hasOwnProperty('database')) {
      let databaseItem = treeHierarchy['database']['id'],
        topParent = treeHierarchy && treeHierarchy[this.parent]['_id'];

      if (topParent in this.current_state && 'selected' in this.current_state[topParent]) {
        if (treeHierarchy['database'].connected) {
          this.current_state[topParent]['conn_status'][databaseItem] = 1;
        }
        else {
          this.current_state[topParent]['conn_status'][databaseItem] = 0;
        }

        if(data._type == 'database') {
          if (pgBrowser.tree.isOpen(item)) {
            this.current_state[topParent]['is_opened'][databaseItem] = 1;
          }
          else {
            this.current_state[topParent]['is_opened'][databaseItem] = 0;
          }
        }
      }
    }
  },
  update_current_selected_item(treeHierarchy) {
    if (!(this.parent in treeHierarchy))
      return;

    let topParent = treeHierarchy && treeHierarchy[this.parent]['_id'],
      selectedItem = pgBrowser.tree.itemData(pgBrowser.tree.selected()),
      databaseItem = undefined;

    selectedItem = selectedItem ? selectedItem.id : undefined;

    if (treeHierarchy.hasOwnProperty('database')) {
      databaseItem = treeHierarchy['database']['id'];
    }

    if (topParent in this.current_state && 'selected' in this.current_state[topParent]
    && !_.isUndefined(selectedItem)) {
      this.current_state[topParent]['selected'][treeHierarchy[this.parent]['id']] = selectedItem;

      if (!_.isUndefined(databaseItem))
        this.current_state[topParent]['selected'][databaseItem] = selectedItem;
    }
  },
  select_tree_item(item) {
    let treeData = this.stored_state || {},
      data = item && pgBrowser.tree.itemData(item),
      treeHierarchy = pgBrowser.tree.getTreeNodeHierarchy(item),
      tmpTreeData = treeData[treeHierarchy[this.parent]['_id']];

    if (treeHierarchy.hasOwnProperty('server')) {
      let selectedItem = treeHierarchy['server']['id'];

      if (tmpTreeData && 'selected' in tmpTreeData && selectedItem in tmpTreeData['selected']) {
        if (tmpTreeData['selected'][selectedItem] == data.id) {
          this.is_selected = true;
          pgBrowser.tree.select(item, true, 'center');
        }
      }
    }
  },
});
