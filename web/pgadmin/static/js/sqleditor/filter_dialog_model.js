/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'underscore';
import pgAdmin from 'sources/pgadmin';
import Backgrid from 'pgadmin.backgrid';
import Backform from 'pgadmin.backform';

export default function filterDialogModel(response) {

  let order_mapping = {
    'asc': gettext('ASC'),
    'desc': gettext('DESC'),
  };

  let DataSortingModel = pgAdmin.Browser.DataModel.extend({
    idAttribute: 'name',
    defaults: {
      name: undefined,
      order: 'asc',
    },
    schema: [{
      id: 'name',
      name: 'name',
      label: gettext('Column'),
      cell: 'select2',
      editable: true,
      cellHeaderClasses: 'width_percent_60',
      headerCell: Backgrid.Extension.CustomHeaderCell,
      disabled: false,
      control: 'select2',
      select2: {
        allowClear: false,
      },
      options: function() {
        return _.map(response.column_list, (obj) => {
          return {
            value: obj,
            label: obj,
          };
        });
      },
    },
    {
      id: 'order',
      name: 'order',
      label: gettext('Order'),
      control: 'select2',
      cell: 'select2',
      cellHeaderClasses: 'width_percent_40',
      headerCell: Backgrid.Extension.CustomHeaderCell,
      editable: true,
      deps: ['type'],
      select2: {
        allowClear: false,
      },
      options: function() {
        return _.map(order_mapping, (val, key) => {
          return {
            value: key,
            label: val,
          };
        });
      },
    },
    ],
    validate: function() {
      let msg = null;
      this.errorModel.clear();
      if (_.isUndefined(this.get('name')) ||
        _.isNull(this.get('name')) ||
        String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
        msg = gettext('Please select a column.');
        this.errorModel.set('name', msg);
        return msg;
      } else if (_.isUndefined(this.get('order')) ||
        _.isNull(this.get('order')) ||
        String(this.get('order')).replace(/^\s+|\s+$/g, '') == '') {
        msg = gettext('Please select the order.');
        this.errorModel.set('order', msg);
        return msg;
      }
      return null;
    },
  });

  let FilterCollectionModel = pgAdmin.Browser.DataModel.extend({
    idAttribute: 'sql',
    defaults: {
      sql: response.sql || null,
    },
    schema: [{
      id: 'sql',
      label: gettext('SQL Filter'),
      cell: 'string',
      type: 'text', mode: ['create'],
      control: Backform.SqlFieldControl.extend({
        render: function() {
          let obj = Backform.SqlFieldControl.prototype.render.apply(this, arguments);
          // We need to set focus on editor after the dialog renders
          setTimeout(() => {
            obj.sqlCtrl.focus();
          }, 1000);
          return obj;
        },
      }),
      extraClasses:['custom_height_css_class'],
    },{
      id: 'data_sorting',
      name: 'data_sorting',
      label: gettext('Data Sorting'),
      model: DataSortingModel,
      editable: true,
      type: 'collection',
      mode: ['create'],
      control: 'unique-col-collection',
      uniqueCol: ['name'],
      canAdd: true,
      canEdit: false,
      canDelete: true,
      visible: true,
      version_compatible: true,
    }],
    validate: function() {
      return null;
    },
  });

  let model = new FilterCollectionModel();
  return model;
}
