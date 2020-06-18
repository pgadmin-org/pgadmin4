/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'underscore';
import $ from 'jquery';
import url_for from 'sources/url_for';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';

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

  // Current tree state
  current_state: {},

  init: function() {

    const save_tree_state_period = pgBrowser.get_preference('browser', 'browser_tree_state_save_interval');

    if (!_.isUndefined(save_tree_state_period) &&  save_tree_state_period.value !== -1) {
      // Save the tree state every 30 seconds
      setInterval(this.save_state, (save_tree_state_period.value) * 1000);

      // Fetch the tree last state while loading the browser tree
      this.fetch_state.apply(this);

      pgBrowser.Events.on('pgadmin:browser:tree:expand-from-previous-tree-state',
        this.expand_from_previous_state, this);
      pgBrowser.Events.on('pgadmin:browser:tree:remove-from-tree-state',
        this.remove_from_cache, this);
      pgBrowser.Events.on('pgadmin:browser:tree:update-tree-state',
        this.update_cache, this);
    } else if (!_.isUndefined(save_tree_state_period)) {
      $.ajax({
        url: url_for('settings.reset_tree_state'),
        type: 'DELETE',
      })
        .fail(function(jqx) {
          var msg = jqx.responseText;
          /* Error from the server */
          if (jqx.status == 417 || jqx.status == 410 || jqx.status == 500) {
            try {
              var data = JSON.parse(jqx.responseText);
              msg = data.errormsg;
            } catch (e) {
              console.warn(e.stack || e);
            }
          }
          console.warn(
            gettext('Error resetting the tree saved state."'), msg);
        });
    }

  },
  save_state: function() {

    var self = pgBrowser.browserTreeState;
    if(self.last_state == JSON.stringify(self.current_state))
      return;

    $.ajax({
      url: url_for('settings.save_tree_state'),
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(self.current_state),
    })
      .done(function() {
        self.last_state = JSON.stringify(self.current_state);
      })
      .fail(function(jqx) {
        var msg = jqx.responseText;
        /* Error from the server */
        if (jqx.status == 417 || jqx.status == 410 || jqx.status == 500) {
          try {
            var data = JSON.parse(jqx.responseText);
            msg = data.errormsg;
          } catch (e) {
            console.warn(e.stack || e);
          }
        }
        console.warn(
          gettext('Error saving the tree state."'), msg);
      });

  },
  fetch_state: function() {

    var self = this;
    $.ajax({
      url: url_for('settings.get_tree_state'),
      type: 'GET',
      dataType: 'json',
      contentType: 'application/json',
    })
      .done(function(res) {
        self.stored_state = res;
      })
      .fail(function(jqx) {
        var msg = jqx.responseText;
        /* Error from the server */
        if (jqx.status == 417 || jqx.status == 410 || jqx.status == 500) {
          try {
            var data = JSON.parse(jqx.responseText);
            msg = data.errormsg;
          } catch (e) {
            console.warn(e.stack || e);
          }
        }
        console.warn(
          gettext('Error fetching the tree state.'), msg);
      });
  },
  update_cache: function(item) {

    let data = item && pgBrowser.tree.itemData(item),
      node = data && pgBrowser.Nodes[data._type],
      treeHierarchy = node.getTreeNodeHierarchy(item),
      topParent = undefined,
      pathIDs = pgBrowser.tree.pathId(item),
      oldPath = pathIDs.join(),
      path = [],
      tmpIndex = -1;

    // If no parent or the server not in tree hierarchy then return
    if (!pgBrowser.tree.hasParent(item) || !(this.parent in treeHierarchy))
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
      node = data && pgBrowser.Nodes[data._type],
      treeHierarchy = node && node.getTreeNodeHierarchy(item);

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
      treeData = self.stored_state || {},
      data = item && pgBrowser.tree.itemData(item),
      node = data && pgBrowser.Nodes[data._type],
      treeHierarchy = node && node.getTreeNodeHierarchy(item);


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

            pgBrowser.tree.toggle(item);

            if (index == (tmpItemData.length - 1 )) {
              let tIndex = treeData[treeHierarchy[self.parent]['_id']]['paths'].indexOf(tData);
              treeData[treeHierarchy[self.parent]['_id']]['paths'].splice(tIndex, 1);
            }
          }
        }
      });
    }

    // Select the previously selected item
    this.select_tree_item(item);

  },
  update_database_status: function(item) {
    let data = item && pgBrowser.tree.itemData(item),
      node = data && pgBrowser.Nodes[data._type],
      treeHierarchy = node.getTreeNodeHierarchy(item);

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
      node = data && pgBrowser.Nodes[data._type],
      treeHierarchy = node && node.getTreeNodeHierarchy(item),
      tmpTreeData = treeData[treeHierarchy[this.parent]['_id']];


    if (treeHierarchy.hasOwnProperty('database')) {
      let databaseItem = treeHierarchy['database']['id'];

      if (tmpTreeData && 'selected' in tmpTreeData && databaseItem in tmpTreeData['selected']) {
        if (tmpTreeData['selected'][databaseItem] == data.id) {
          pgBrowser.tree.select(item);
        }
      }
    }
  },
});
