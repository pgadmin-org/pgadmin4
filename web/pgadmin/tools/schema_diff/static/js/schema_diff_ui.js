/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import url_for from 'sources/url_for';
import $ from 'jquery';
import gettext from 'sources/gettext';
import Alertify from 'pgadmin.alertifyjs';
import Backbone from 'backbone';
import Slick from 'sources/../bundle/slickgrid';
import pgAdmin from 'sources/pgadmin';
import {setPGCSRFToken} from 'sources/csrf';
import {generateScript} from 'tools/datagrid/static/js/show_query_tool';
import 'pgadmin.sqleditor';
import pgWindow from 'sources/window';
import _ from 'underscore';

import { SchemaDiffSelect2Control, SchemaDiffHeaderView,
  SchemaDiffFooterView, SchemaDiffSqlControl} from './schema_diff.backform';

import { handleDependencies, selectDependenciesForGroup,
  selectDependenciesForAll, selectDependencies } from './schema_diff_dependency';

var wcDocker = window.wcDocker;

export default class SchemaDiffUI {
  constructor(container, trans_id) {
    var self = this;
    this.$container = container;
    this.header = null;
    this.trans_id = trans_id;
    this.filters = ['Identical', 'Different', 'Source Only', 'Target Only'];
    this.sel_filters = ['Different', 'Source Only', 'Target Only'];
    this.dataView = null;
    this.grid = null;
    this.selection = {};

    this.model = new Backbone.Model({
      source_sid: undefined,
      source_did: undefined,
      source_scid: undefined,
      target_sid: undefined,
      target_did: undefined,
      target_scid: undefined,
      source_ddl: undefined,
      target_ddl: undefined,
      diff_ddl: undefined,
    });

    setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);

    this.docker = new wcDocker(
      this.$container, {
        allowContextMenu: false,
        allowCollapse: false,
        loadingClass: 'pg-sp-icon',
        themePath: url_for('static', {
          'filename': 'css',
        }),
        theme: 'webcabin.overrides.css',
      }
    );

    this.header_panel = new pgAdmin.Browser.Panel({
      name: 'schema_diff_header_panel',
      showTitle: false,
      isCloseable: false,
      isPrivate: true,
      content: '<div id="schema-diff-header" class="pg-el-container" el="sm"></div><div id="schema-diff-grid" class="pg-el-container" el="sm"></div>',
      elContainer: true,
    });

    this.footer_panel = new pgAdmin.Browser.Panel({
      name: 'schema_diff_footer_panel',
      title: gettext('DDL Comparison'),
      isCloseable: false,
      isPrivate: true,
      height: '60',
      content: `<div id="schema-diff-ddl-comp" class="pg-el-container" el="sm">
      <div id="ddl_comp_fetching_data" class="pg-sp-container schema-diff-busy-fetching d-none">
        <div class="pg-sp-content">
            <div class="row">
                <div class="col-12 pg-sp-icon"></div>
            </div>
            <div class="row"><div class="col-12 pg-sp-text">` + gettext('Comparing objects...') + `</div></div>
        </div>
    </div></div>`,
    });

    this.header_panel.load(this.docker);
    this.footer_panel.load(this.docker);


    this.panel_obj = this.docker.addPanel('schema_diff_header_panel', wcDocker.DOCK.TOP, {w:'95%', h:'50%'});
    this.footer_panel_obj = this.docker.addPanel('schema_diff_footer_panel', wcDocker.DOCK.BOTTOM, this.panel_obj, {w:'95%', h:'50%'});

    self.footer_panel_obj.on(wcDocker.EVENT.VISIBILITY_CHANGED, function() {
      setTimeout(function() {
        this.resize_grid();
      }.bind(self), 200);
    });

    self.footer_panel_obj.on(wcDocker.EVENT.RESIZE_ENDED, function() {
      setTimeout(function() {
        this.resize_panels();
      }.bind(self), 200);
    });
  }

  raise_error_on_fail(alert_title, xhr) {
    try {
      var err = JSON.parse(xhr.responseText);
      Alertify.alert(alert_title, err.errormsg);
    } catch (e) {
      Alertify.alert(alert_title, e.statusText);
    }
  }

  resize_panels() {
    let $src_ddl = $('#schema-diff-ddl-comp .source_ddl'),
      $tar_ddl = $('#schema-diff-ddl-comp .target_ddl'),
      $diff_ddl = $('#schema-diff-ddl-comp .diff_ddl'),
      footer_height = $('#schema-diff-ddl-comp').height() - 50;

    $src_ddl.height(footer_height);
    $src_ddl.css({
      'height': footer_height + 'px',
    });
    $tar_ddl.height(footer_height);
    $tar_ddl.css({
      'height': footer_height + 'px',
    });
    $diff_ddl.height(footer_height);
    $diff_ddl.css({
      'height': footer_height + 'px',
    });

    this.resize_grid();
  }

  compare_schemas() {
    var self = this,
      url_params = self.model.toJSON();

    if (url_params['source_sid'] == '' || _.isUndefined(url_params['source_sid']) ||
        url_params['source_did'] == '' || _.isUndefined(url_params['source_did']) ||
        url_params['target_sid'] == '' || _.isUndefined(url_params['target_sid']) ||
        url_params['target_did'] == '' || _.isUndefined(url_params['target_did'])
    ) {
      Alertify.alert(gettext('Selection Error'), gettext('Please select source and target.'));
      return false;
    }

    // Check if user has selected the same options for comparison on the GUI
    let opts = [['source_sid', 'target_sid'], ['source_did', 'target_did'], ['source_scid', 'target_scid']];
    let isSameOptsSelected = true;
    for (let opt of opts) {
      if (url_params[opt[0]] && url_params[opt[1]] &&
          (parseInt(url_params[opt[0]]) !== parseInt(url_params[opt[1]]))) {
        isSameOptsSelected = false;
      }
    }
    if (isSameOptsSelected) {
      Alertify.alert(gettext('Selection Error'), gettext('Please select the different source and target.'));
      return false;
    }

    this.selection = JSON.parse(JSON.stringify(url_params));

    url_params['trans_id'] = self.trans_id;

    _.each(url_params, function(key, val) {
      url_params[key] = parseInt(val, 10);
    });

    var baseUrl = url_for('schema_diff.compare_database', url_params);
    // If compare two schema then change the base url
    if (url_params['source_scid'] != '' && !_.isUndefined(url_params['source_scid']) &&
        url_params['target_scid'] != '' && !_.isUndefined(url_params['target_scid'])) {
      baseUrl = url_for('schema_diff.compare_schema', url_params);
    }

    self.model.set({
      'source_ddl': undefined,
      'target_ddl': undefined,
      'diff_ddl': undefined,
    });

    self.render_grid([]);
    self.footer.render();
    self.startDiffPoller();

    return $.ajax({
      url: baseUrl,
      method: 'GET',
      dataType: 'json',
      contentType: 'application/json',
    })
      .done(function (res) {
        self.stopDiffPoller();
        self.render_grid(res.data);
      })
      .fail(function (xhr) {
        self.raise_error_on_fail(gettext('Schema compare error'), xhr);
        self.stopDiffPoller();
      });
  }

  generate_script() {
    var self = this,
      baseServerUrl = url_for('schema_diff.get_server', {'sid': self.selection['target_sid'],
        'did': self.selection['target_did']}),
      sel_rows = self.grid ? self.grid.getSelectedRows() : [],
      url_params = self.selection,
      generated_script = undefined,
      open_query_tool,
      script_header;

    script_header = gettext('-- This script was generated by the Schema Diff utility in pgAdmin 4. \n');
    script_header += gettext('-- For the circular dependencies, the order in which Schema Diff writes the objects is not very sophisticated \n');
    script_header += gettext('-- and may require manual changes to the script to ensure changes are applied in the correct order.\n');
    script_header += gettext('-- Please report an issue for any failure with the reproduction steps. \n');


    _.each(url_params, function(key, val) {
      url_params[key] = parseInt(val, 10);
    });

    $('#diff_fetching_data').removeClass('d-none');
    $('#diff_fetching_data').find('.schema-diff-busy-text').text('Generating script...');


    open_query_tool = function get_server_details() {
      $.ajax({
        url: baseServerUrl,
        method: 'GET',
        dataType: 'json',
        contentType: 'application/json',
      })
        .done(function (res) {
          let data = res.data;
          let server_data = {};
          if (data) {
            server_data['sgid'] = data.gid;
            server_data['sid'] = data.sid;
            server_data['stype'] = data.type;
            server_data['server'] = data.name;
            server_data['user'] = data.user;
            server_data['did'] = self.model.get('target_did');
            server_data['database'] = data.database;

            if (_.isUndefined(generated_script)) {
              generated_script = script_header + 'BEGIN;' + '\n' + self.model.get('diff_ddl') + '\n' + 'END;';
            }

            pgWindow.pgAdmin.ddl_diff = generated_script;
            generateScript(server_data, pgWindow.pgAdmin.DataGrid, Alertify);
          }

          $('#diff_fetching_data').find('.schema-diff-busy-text').text('');
          $('#diff_fetching_data').addClass('d-none');

        })
        .fail(function (xhr) {
          self.raise_error_on_fail(gettext('Generate script error'), xhr);
          $('#diff_fetching_data').find('.schema-diff-busy-text').text('');
          $('#diff_fetching_data').addClass('d-none');
        });
    };

    if (sel_rows.length > 0) {
      let script_array = {1: [], 2: [], 3: [], 4: [], 5: []},
        script_body = '';
      for (var row = 0; row < sel_rows.length; row++) {
        let data = self.grid.getData().getItem(sel_rows[row]);
        if(!_.isUndefined(data.diff_ddl)) {
          if (!(data.dependLevel in script_array)) script_array[data.dependLevel] = [];
          // Check whether the selected object belongs to source only schema
          // if yes then we will have to add create schema statement before
          // creating any other object.
          if (!_.isUndefined(data.source_schema_name) && !_.isNull(data.source_schema_name)) {
            let schema_query = '\nCREATE SCHEMA IF NOT EXISTS ' + data.source_schema_name + ';\n';
            if (script_array[data.dependLevel].indexOf(schema_query) == -1) {
              script_array[data.dependLevel].push(schema_query);
            }
          }
          script_array[data.dependLevel].push(data.diff_ddl);
        }
      }

      _.each(Object.keys(script_array).reverse(), function(s) {
        if (script_array[s].length > 0) {
          script_body += script_array[s].join('\n') + '\n\n';
        }
      });

      generated_script = script_header + 'BEGIN;' + '\n' + script_body + 'END;';
      open_query_tool();
    } else if (!_.isUndefined(self.model.get('diff_ddl'))) {
      open_query_tool();
    }
    return false;
  }

  check_empty_diff() {
    var self = this;
    this.panel_obj.$container.find('#schema-diff-grid .slick-viewport .pg-panel-message').remove();
    if (self.dataView.getFilteredItems().length == 0) {
      let msg = gettext('No difference found');
      // Make the height to 0px to avoid extra scroll bar, height will be calculated automatically.
      this.panel_obj.$container.find('#schema-diff-grid .slick-viewport .grid-canvas')[0].style.height = '0px';
      this.panel_obj.$container.find('#schema-diff-grid .slick-viewport'
      ).prepend('<div class="pg-panel-message">'+ msg +'</div>');
    }
  }

  render_grid(data) {

    var self = this;
    var grid;

    if (self.grid) {
      // Only render the data
      self.render_grid_data(data);
      self.check_empty_diff();
      return;
    }
    // Checkbox Column
    var checkboxSelector = new Slick.CheckboxSelectColumn({
      cssClass: 'slick-cell-checkboxsel',
      minWidth: 30,
    });

    // Format Schema object title with appropriate icon
    var formatColumnTitle = function (row, cell, value, columnDef, dataContext) {
      let icon = 'icon-' + dataContext.type;
      return '<i class="ml-2 wcTabIcon '+ icon +'"></i><span>' + value + '</span>';
    };

    // Grid Columns
    var grid_width =  (self.grid_width - 47) / 2 ;
    var columns = [
      checkboxSelector.getColumnDefinition(),
      {id: 'title', name: gettext('Objects'), field: 'title', minWidth: grid_width, formatter: formatColumnTitle},
      {id: 'status', name: gettext('Comparison Result'), field: 'status', minWidth: grid_width},
      {id: 'label', name: gettext('Objects'), field: 'label',  width: 0, minWidth: 0, maxWidth: 0,
        cssClass: 'really-hidden', headerCssClass: 'really-hidden'},
      {id: 'type', name: gettext('Objects'), field: 'type',  width: 0, minWidth: 0, maxWidth: 0,
        cssClass: 'really-hidden', headerCssClass: 'really-hidden'},
      {id: 'id', name: 'id', field: 'id', width: 0, minWidth: 0, maxWidth: 0,
        cssClass: 'really-hidden', headerCssClass: 'really-hidden' },

    ];

    // Grid Options
    var options = {
      enableCellNavigation: true,
      enableColumnReorder: false,
      enableRowSelection: true,
    };

    // Grouping by Schema Object
    self.groupBySchemaObject = function() {
      self.dataView.setGrouping([{
        getter: 'group_name',
        formatter: function (g) {
          let icon = 'icon-schema';
          if (g.rows[0].group_name == 'Database Objects'){
            icon = 'icon-coll-database';
          }
          return '<i class="wcTabIcon '+ icon +'"></i><span>' + _.escape(g.rows[0].group_name);
        },
        aggregateCollapsed: true,
        lazyTotalsCalculation: true,
      }, {
        getter: 'type',
        formatter: function (g) {
          let icon = 'icon-coll-' + g.value;
          let identical=0, different=0, source_only=0, target_only=0;
          for (var i = 0; i < g.rows.length; i++) {
            if (g.rows[i]['status'] == self.filters[0]) identical++;
            else if (g.rows[i]['status'] == self.filters[1]) different++;
            else if (g.rows[i]['status'] == self.filters[2]) source_only++;
            else if (g.rows[i]['status'] == self.filters[3]) target_only++;
          }
          return '<i class="wcTabIcon '+ icon +'"></i><span>' + g.rows[0].label + ' - ' + gettext('Identical') + ': <strong>' + identical + '</strong>&nbsp;&nbsp;' + gettext('Different') + ': <strong>' + different + '</strong>&nbsp;&nbsp;' + gettext('Source Only') + ': <strong>' + source_only + '</strong>&nbsp;&nbsp;' + gettext('Target Only') + ': <strong>' + target_only + '</strong></span>';
        },
        aggregateCollapsed: true,
        collapsed: true,
        lazyTotalsCalculation: true,
      }]);
    };

    var groupItemMetadataProvider = new Slick.Data.GroupItemMetadataProvider({ checkboxSelect: true,
      checkboxSelectPlugin: checkboxSelector });

    // Dataview for grid
    self.dataView = new Slick.Data.DataView({
      groupItemMetadataProvider: groupItemMetadataProvider,
      inlineFilters: false,
    });

    // Wire up model events to drive the grid
    self.dataView.onRowCountChanged.subscribe(function () {
      grid.updateRowCount();
      grid.render();
      self.accessibility_error();
    });
    self.dataView.onRowsChanged.subscribe(function (e, args) {
      grid.invalidateRows(args.rows);
      grid.render();
      self.accessibility_error();
    });

    // Change Row css on the basis of item status
    self.dataView.getItemMetadata = function(row) {
      let item = self.dataView.getItem(row),
        group_item = groupItemMetadataProvider.getGroupRowMetadata(item);
      if (item.__group) {
        return group_item;
      }

      if(item.status === 'Different') {
        return { cssClasses: 'different' };
      } else if (item.status === 'Source Only') {
        return { cssClasses: 'source' };
      } else if (item.status === 'Target Only') {
        return { cssClasses: 'target' };
      }

      return null;
    };

    // Grid filter
    self.filter = function (item) {
      let self_local = this;
      if (self_local.sel_filters.indexOf(item.status) !== -1) return true;
      return false;
    };

    let $data_grid = $('#schema-diff-grid');
    grid = this.grid = new Slick.Grid($data_grid, self.dataView, columns, options);
    $('label[for='+ columns[0].name.split('\'')[1] +']').append('<span style="display:none">checkbox</span>');
    grid.registerPlugin(groupItemMetadataProvider);
    grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
    grid.registerPlugin(checkboxSelector);

    self.dataView.syncGridSelection(grid, true, true);

    grid.onMouseEnter.subscribe(function (evt) {
      var cell = grid.getCellFromEvent(evt);
      self.gridContext = {};
      self.gridContext.rowIndex = cell.row;
      self.gridContext.row = grid.getDataItem(cell.row);
    }.bind(self));

    grid.onMouseLeave.subscribe(function () {
      self.gridContext = {};
    });

    grid.onClick.subscribe(function(e, args) {
      if (args.row) {
        data = args.grid.getData().getItem(args.row);
        if (data.status) this.ddlCompare(data);
      }
    }.bind(self));

    grid.onSelectedRowsChanged.subscribe(self.handleDependencies.bind(this));

    self.model.on('change:diff_ddl', function(event) {
      self.handleDependencies.bind(event, self);
    });

    $('#schema-diff-grid').on('keyup', function() {
      if ((event.keyCode == 38 || event.keyCode ==40) && this.grid.getActiveCell().row) {
        data = this.grid.getData().getItem(this.grid.getActiveCell().row);
        this.ddlCompare(data);
      }
    }.bind(self));

    self.render_grid_data(data);
  }

  render_grid_data(data) {
    var self = this;
    self.grid.setSelectedRows([]);
    self.selected_row_count = self.grid.getSelectedRows().length;
    data.sort((a, b) => (a.label > b.label) ? 1 : (a.label === b.label) ? ((a.title > b.title) ? 1 : -1) : -1);
    self.dataView.beginUpdate();
    self.dataView.setItems(data);
    self.dataView.setFilter(self.filter.bind(self));
    self.groupBySchemaObject();
    self.dataView.endUpdate();
    self.dataView.refresh();

    self.resize_grid();
    self.accessibility_error();
  }

  accessibility_error() {
    $('.slick-viewport').scroll(function() {
      setTimeout(function() {
        $('span.slick-column-name label').append('<span style="display:none">checkbox</span>');
        $('div.slick-cell.l0 label').each(function(inx, el) {
          $(el).append('<span style="display:none">checkbox</span>');
        });
      }, 0);
    });
  }

  handle_generate_button(){
    if (this.grid.getSelectedRows().length > 0 || (this.model.get('diff_ddl') != '' && !_.isUndefined(this.model.get('diff_ddl')))) {
      this.header.$el.find('button#generate-script').removeAttr('disabled');
    } else {
      this.header.$el.find('button#generate-script').attr('disabled', true);
    }
  }

  resize_grid() {
    let $data_grid = $('#schema-diff-grid'),
      grid_height = (this.panel_obj.height() > 0) ? this.panel_obj.height() - 100 : this.grid_height - 100;

    $data_grid.height(grid_height);
    $data_grid.css({
      'height': grid_height + 'px',
    });
    if (this.grid) this.grid.resizeCanvas();
  }

  getCompareStatus() {
    var self = this,
      url_params = {'trans_id': self.trans_id},
      baseUrl = url_for('schema_diff.poll', url_params);

    $.ajax({
      url: baseUrl,
      method: 'GET',
      dataType: 'json',
      contentType: 'application/json',
    })
      .done(function (res) {
        let msg = _.escape(res.data.compare_msg);
        if (res.data.diff_percentage != 100) {
          msg = msg + gettext(' (this may take a few minutes)...');
        }

        msg = msg + '<br>' + gettext('%s completed.', res.data.diff_percentage + '%');
        $('#diff_fetching_data').find('.schema-diff-busy-text').html(msg);
      })
      .fail(function (xhr) {
        self.raise_error_on_fail(gettext('Poll error'), xhr);
        self.stopDiffPoller('fail');
      });
  }

  startDiffPoller() {
    $('#ddl_comp_fetching_data').addClass('d-none');
    $('#diff_fetching_data').removeClass('d-none');
    /* Execute once for the first time as setInterval will not do */
    this.getCompareStatus();
    this.diff_poller_int_id = setInterval(this.getCompareStatus.bind(this), 1000);
  }

  stopDiffPoller(status) {
    clearInterval(this.diff_poller_int_id);
    // The last polling for comparison
    if (status !== 'fail') this.getCompareStatus();

    $('#diff_fetching_data').find('.schema-diff-busy-text').text('');
    $('#diff_fetching_data').addClass('d-none');

  }

  ddlCompare(data) {
    var self = this,
      node_type = data.type,
      source_oid = data.oid,
      target_oid;

    self.model.set({
      'source_ddl': undefined,
      'target_ddl': undefined,
      'diff_ddl': undefined,
    }, {silent: true});

    if(data.status && data.status.toLowerCase() == 'identical') {
      var url_params = self.selection;
      target_oid = data.target_oid;

      url_params['trans_id'] = self.trans_id;
      url_params['source_scid'] = data.source_scid;
      url_params['target_scid'] = data.target_scid;
      url_params['source_oid'] = source_oid;
      url_params['target_oid'] = target_oid;
      url_params['comp_status'] = data.status;
      url_params['node_type'] = node_type;

      _.each(url_params, function(key, val) {
        url_params[key] = parseInt(val, 10);
      });

      $('#ddl_comp_fetching_data').removeClass('d-none');

      var baseUrl = url_for('schema_diff.ddl_compare', url_params);
      self.model.url = baseUrl;

      self.model.fetch({
        success: function() {
          self.footer.render();
          $('#ddl_comp_fetching_data').addClass('d-none');
        },
        error: function() {
          self.footer.render();
          $('#ddl_comp_fetching_data').addClass('d-none');
        },
      });
    } else {
      self.model.set({
        'source_ddl': data.source_ddl,
        'target_ddl': data.target_ddl,
        'diff_ddl': data.diff_ddl,
      }, {silent: true});

      self.footer.render();
    }
  }

  render() {
    let self = this;
    let panel = self.docker.findPanels('schema_diff_header_panel')[0];

    var header = panel.$container.find('#schema-diff-header');

    self.header  = new SchemaDiffHeaderView({
      el: header,
      model: this.model,
      fields: [{
        name: 'source_sid', label: false,
        control: SchemaDiffSelect2Control,
        transform: function(data) {
          let group_template_options = [];
          for (let key in data) {
            if (data.hasOwnProperty(key)) {
              group_template_options.push({'group': key, 'optval': data[key]});
            }
          }
          return group_template_options;
        },
        url: url_for('schema_diff.servers'),
        select2: {
          allowClear: true,
          placeholder: gettext('Select server...'),
        },
        connect: function() {
          self.connect_server(arguments[0], arguments[1]);
        },
        group: 'source',
        disabled: function() {
          return false;
        },
      }, {
        name: 'source_did',
        group: 'source',
        deps: ['source_sid'],
        control: SchemaDiffSelect2Control,
        url: function() {
          if (this.get('source_sid'))
            return url_for('schema_diff.databases', {'sid': this.get('source_sid')});
          return false;
        },
        select2: {
          allowClear: true,
          placeholder: gettext('Select database...'),
        },
        disabled: function(m) {
          let self_local = this;
          if (!_.isUndefined(m.get('source_sid')) && !_.isNull(m.get('source_sid'))
              && m.get('source_sid') !== '') {
            setTimeout(function() {
              for (var i = 0; i < self_local.options.length; i++) {
                if (self_local.options[i].is_maintenance_db) {
                  m.set('source_did', self_local.options[i].value);
                }
              }
            }, 10);
            return false;
          }

          setTimeout(function() {
            m.set('source_did', undefined);
          }, 10);
          return true;
        },
        connect: function() {
          self.connect_database(this.model.get('source_sid'), arguments[0], arguments[1]);
        },
      }, {
        name: 'source_scid',
        control: SchemaDiffSelect2Control,
        group: 'source',
        deps: ['source_sid', 'source_did'],
        url: function() {
          if (this.get('source_sid') && this.get('source_did'))
            return url_for('schema_diff.schemas', {'sid': this.get('source_sid'), 'did': this.get('source_did')});
          return false;
        },
        select2: {
          allowClear: true,
          placeholder: gettext('Select schema...'),
        },
        disabled: function(m) {
          if (!_.isUndefined(m.get('source_did')) && !_.isNull(m.get('source_did'))
              && m.get('source_did') !== '') {
            return false;
          }
          setTimeout(function() {
            m.set('source_scid', undefined);
          }, 10);
          return true;
        },
      }, {
        name: 'target_sid', label: false,
        control: SchemaDiffSelect2Control,
        transform: function(data) {
          let group_template_options = [];
          for (let key in data) {
            if (data.hasOwnProperty(key)) {
              group_template_options.push({'group': key, 'optval': data[key]});
            }
          }
          return group_template_options;
        },
        group: 'target',
        url: url_for('schema_diff.servers'),
        select2: {
          allowClear: true,
          placeholder: gettext('Select server...'),
        },
        disabled: function() {
          return false;
        },
        connect: function() {
          self.connect_server(arguments[0], arguments[1]);
        },
      }, {
        name: 'target_did',
        control: SchemaDiffSelect2Control,
        group: 'target',
        deps: ['target_sid'],
        url: function() {
          if (this.get('target_sid'))
            return url_for('schema_diff.databases', {'sid': this.get('target_sid')});
          return false;
        },
        select2: {
          allowClear: true,
          placeholder: gettext('Select database...'),
        },
        disabled: function(m) {
          let self_local = this;
          if (!_.isUndefined(m.get('target_sid')) && !_.isNull(m.get('target_sid'))
              && m.get('target_sid') !== '') {
            setTimeout(function() {
              for (var i = 0; i < self_local.options.length; i++) {
                if (self_local.options[i].is_maintenance_db) {
                  m.set('target_did', self_local.options[i].value);
                }
              }
            }, 10);
            return false;
          }

          setTimeout(function() {
            m.set('target_did', undefined);
          }, 10);
          return true;
        },
        connect: function() {
          self.connect_database(this.model.get('target_sid'), arguments[0], arguments[1]);
        },
      }, {
        name: 'target_scid',
        control: SchemaDiffSelect2Control,
        group: 'target',
        deps: ['target_sid', 'target_did'],
        url: function() {
          if (this.get('target_sid') && this.get('target_did'))
            return url_for('schema_diff.schemas', {'sid': this.get('target_sid'), 'did': this.get('target_did')});
          return false;
        },
        select2: {
          allowClear: true,
          placeholder: gettext('Select schema...'),
        },
        disabled: function(m) {
          if (!_.isUndefined(m.get('target_did')) && !_.isNull(m.get('target_did'))
              && m.get('target_did') !== '') {
            return false;
          }
          setTimeout(function() {
            m.set('target_scid', undefined);
          }, 10);
          return true;
        },
      }],
    });

    self.footer  = new SchemaDiffFooterView({
      model: this.model,
      fields: [{
        name: 'source_ddl', label: false,
        control: SchemaDiffSqlControl,
        group: 'ddl-source',
      }, {
        name: 'target_ddl', label: false,
        control: SchemaDiffSqlControl,
        group: 'ddl-target',
      }, {
        name: 'diff_ddl', label: false,
        control: SchemaDiffSqlControl,
        group: 'ddl-diff', copyRequired: true,
      }],
    });

    self.header.render();

    self.header.$el.find('button.btn-primary').on('click', self.compare_schemas.bind(self));
    self.header.$el.find('button#generate-script').on('click', self.generate_script.bind(self));
    self.header.$el.find('ul.filter a.dropdown-item').on('click', self.refresh_filters.bind(self));

    let footer_panel = self.docker.findPanels('schema_diff_footer_panel')[0],
      header_panel = self.docker.findPanels('schema_diff_header_panel')[0];

    footer_panel.$container.find('#schema-diff-ddl-comp').append(self.footer.render().$el);
    $('div.CodeMirror div textarea').attr('aria-label', 'textarea');
    header_panel.$container.find('#schema-diff-grid').append(`<div class='obj_properties container-fluid'>
    <div class='pg-panel-message'>` + gettext('<strong>Database Compare:</strong> Select the server and database for the source and target and Click <strong>Compare</strong>.') +
    gettext('</br><strong>Schema Compare:</strong> Select the server, database and schema for the source and target and Click <strong>Compare</strong>.') +
    gettext('</br><strong>Note:</strong> The dependencies will not be resolved in the Schema comparison.') + '</div></div>');

    self.grid_width = $('#schema-diff-grid').width();
    self.grid_height = this.panel_obj.height();
  }

  refresh_filters(event) {
    let self = this;
    _.each(self.filters, function(filter) {
      let index = self.sel_filters.indexOf(filter);
      let filter_class = '.' + filter.replace(' ', '-').toLowerCase();
      if ($(event.currentTarget).find(filter_class).length == 1) {
        if ($(filter_class).hasClass('visibility-hidden') === true) {
          $(filter_class).removeClass('visibility-hidden');
          if (index === -1) self.sel_filters.push(filter);
        } else {
          $(filter_class).addClass('visibility-hidden');
          if(index !== -1 ) delete self.sel_filters[index];
        }
      }
    });

    // Check whether comparison data is loaded or not
    if(!_.isUndefined(self.dataView) && !_.isNull(self.dataView)) {
      // Refresh the grid
      self.dataView.refresh();
      self.check_empty_diff();
    }
  }

  connect_database(server_id, db_id, callback) {
    var url = url_for('schema_diff.connect_database', {'sid': server_id, 'did': db_id});
    $.post(url)
      .done(function(res) {
        if (res.success && res.data) {
          callback(res.data);
        }
      })
      .fail(function(xhr, error) {
        Alertify.pgNotifier(error, xhr, gettext('Failed to connect the database.'));
      });

  }

  connect_server(server_id, callback) {
    var  onFailure = function(
        xhr, status, error, sid, err_callback
      ) {
        Alertify.pgNotifier('error', xhr, error, function(msg) {
          setTimeout(function() {
            Alertify.dlgServerPass(
              gettext('Connect to Server'),
              msg,
              sid,
              err_callback
            ).resizeTo();
          }, 100);
        });
      },
      onSuccess = function(res, suc_callback) {
        if (res && res.data) {
          // We're not reconnecting
          suc_callback(res.data);
        }
      };


    // Ask Password and send it back to the connect server
    if (!Alertify.dlgServerPass) {
      Alertify.dialog('dlgServerPass', function factory() {
        return {
          main: function(
            title, message, sid, success_callback, _onSuccess, _onFailure, _onCancel
          ) {
            this.set('title', title);
            this.message = message;
            this.server_id = sid;
            this.success_callback = success_callback;
            this.onSuccess = _onSuccess || onSuccess;
            this.onFailure = _onFailure || onFailure;
            this.onCancel = _onCancel || onCancel;
          },
          setup:function() {
            return {
              buttons:[{
                text: gettext('Cancel'), className: 'btn btn-secondary fa fa-times pg-alertify-button',
                key: 27,
              },{
                text: gettext('OK'), key: 13, className: 'btn btn-primary fa fa-check pg-alertify-button',
              }],
              focus: {element: '#password', select: true},
              options: {
                modal: 0, resizable: false, maximizable: false, pinnable: false,
              },
            };
          },
          build:function() {},
          prepare:function() {
            this.setContent(this.message);
          },
          callback: function(closeEvent) {
            var _onFailure = this.onFailure,
              _onSuccess = this.onSuccess,
              _onCancel = this.onCancel,
              _success_callback = this.success_callback;

            if (closeEvent.button.text == gettext('OK')) {

              var _url = url_for('schema_diff.connect_server', {'sid': this.server_id});

              $.ajax({
                type: 'POST',
                timeout: 30000,
                url: _url,
                data: $('#frmPassword').serialize(),
              })
                .done(function(res) {
                  if (res.success == 1) {
                    return _onSuccess(res, _success_callback);
                  }
                })
                .fail(function(xhr, status, error) {
                  return _onFailure(
                    xhr, status, error, this.server_id, _success_callback
                  );
                });
            } else {
              _onCancel && typeof(_onCancel) == 'function' &&
                _onCancel();
            }
          },
        };
      });
    }

    var onCancel = function() {
      return false;
    };

    var url = url_for('schema_diff.connect_server', {'sid': server_id});
    $.post(url)
      .done(function(res) {
        if (res.success == 1) {
          return onSuccess(res, callback);
        }
      })
      .fail(function(xhr, status, error) {
        return onFailure(
          xhr, status, error, server_id, callback
        );
      });
  }
}

SchemaDiffUI.prototype.handleDependencies = handleDependencies;
SchemaDiffUI.prototype.selectDependenciesForGroup = selectDependenciesForGroup;
SchemaDiffUI.prototype.selectDependenciesForAll = selectDependenciesForAll;
SchemaDiffUI.prototype.selectDependencies = selectDependencies;
