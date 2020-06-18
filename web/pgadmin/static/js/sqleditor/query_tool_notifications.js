/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import Backgrid from 'pgadmin.backgrid';
import Backbone from 'backbone';
import Alertify from 'pgadmin.alertifyjs';

let NotificationsModel = Backbone.Model.extend({
  defaults: {
    recorded_time: undefined,
    event: undefined,
    pid: undefined,
    payload: undefined,
  },
  schema: [{
    id: 'recorded_time',
    label: gettext('Recorded time'),
    cell: 'string',
    type: 'text',
    editable: false,
    cellHeaderClasses: 'width_percent_20',
    headerCell: Backgrid.Extension.CustomHeaderCell,
  },{
    id: 'channel',
    label: gettext('Event'),
    cell: 'string',
    type: 'text',
    editable: false,
    cellHeaderClasses: 'width_percent_20',
    headerCell: Backgrid.Extension.CustomHeaderCell,
  },{
    id: 'pid',
    label: gettext('Process ID'),
    cell: 'string',
    type: 'text',
    editable: false,
    cellHeaderClasses: 'width_percent_20',
    headerCell: Backgrid.Extension.CustomHeaderCell,
  },{
    id: 'payload',
    label: gettext('Payload'),
    cell: 'string',
    type: 'text',
    editable: false,
    cellHeaderClasses: 'width_percent_40',
    headerCell: Backgrid.Extension.CustomHeaderCell,
  }],
});

let NotificationCollection = Backbone.Collection.extend({
  model: NotificationsModel,
});

let queryToolNotifications = {

  collection: null,

  /* This function is responsible to create and render the
   * new backgrid for the notification tab.
   */
  renderNotificationsGrid: function(notifications_panel) {
    if (!queryToolNotifications.collection)
      queryToolNotifications.collection = new NotificationCollection();

    let gridCols = [{
      name: 'recorded_time',
      label: gettext('Recorded time'),
      type: 'text',
      editable: false,
      cell: 'string',
    }, {
      name: 'channel',
      label: gettext('Event'),
      type: 'text',
      editable: false,
      cell: 'string',
    }, {
      name: 'pid',
      label: gettext('Process ID'),
      type: 'text',
      editable: false,
      cell: 'string',
    }, {
      name: 'payload',
      label: gettext('Payload'),
      type: 'text',
      editable: false,
      cell: 'string',
    }];

    // Set up the grid
    let notifications_grid = new Backgrid.Grid({
      emptyText: gettext('No data found'),
      columns: gridCols,
      collection: queryToolNotifications.collection,
      className: 'backgrid presentation table table-bordered table-hover table-noouter-border table-bottom-border',
    });

    // Render the grid
    if (notifications_panel)
      notifications_panel.$container.find('.sql-editor-notifications').append(notifications_grid.render().el);
  },

  // This function is used to raise notify messages and update the
  // notification grid.
  updateNotifications: function(notify_messages) {
    if (notify_messages != null && notify_messages.length > 0) {
      for (let i in notify_messages) {
        let notify_msg = '';
        if (notify_messages[i].payload != '') {
          notify_msg = gettext('Asynchronous notification "%s" with payload "%s" received from server process with PID %s', notify_messages[i].channel, notify_messages[i].payload, notify_messages[i].pid);
        }
        else {
          notify_msg = gettext('Asynchronous notification "%s" received from server process with PID %s', notify_messages[i].channel, notify_messages[i].pid);
        }

        Alertify.info(notify_msg);
      }

      // Add notify messages to the collection.
      queryToolNotifications.collection.add(notify_messages);
    }
  },
};

module.exports = queryToolNotifications;
