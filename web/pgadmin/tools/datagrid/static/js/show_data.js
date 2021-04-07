/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from '../../../../static/js/gettext';
import url_for from '../../../../static/js/url_for';
import {getTreeNodeHierarchyFromIdentifier} from '../../../../static/js/tree/pgadmin_tree_node';
import {getDatabaseLabel, generateTitle} from './datagrid_panel_title';
import CodeMirror from 'bundled_codemirror';
import * as SqlEditorUtils from 'sources/sqleditor_utils';
import $ from 'jquery';

export function showDataGrid(
  datagrid,
  pgBrowser,
  alertify,
  connectionData,
  aciTreeIdentifier,
  transId,
  filter=false,
  preferences=null
) {
  const node = pgBrowser.treeMenu.findNodeByDomElement(aciTreeIdentifier);
  if (node === undefined || !node.getData()) {
    alertify.alert(
      gettext('Data Grid Error'),
      gettext('No object selected.')
    );
    return;
  }

  const parentData = getTreeNodeHierarchyFromIdentifier.call(
    pgBrowser,
    aciTreeIdentifier
  );

  if (hasServerOrDatabaseConfiguration(parentData)
    || !hasSchemaOrCatalogOrViewInformation(parentData)) {
    return;
  }

  let applicable_nodes = ['table', 'partition', 'view', 'mview', 'foreign_table', 'catalog_object'];
  if (applicable_nodes.indexOf(node.getData()._type) === -1) {
    return;
  }

  const gridUrl = generateUrl(transId, connectionData, node.getData(), parentData);
  const queryToolTitle = generateDatagridTitle(pgBrowser, aciTreeIdentifier);
  if(filter) {
    initFilterDialog(alertify, pgBrowser);

    const validateUrl = generateFilterValidateUrl(node.getData(), parentData);

    let okCallback = function(sql) {
      datagrid.launch_grid(transId, gridUrl, false, queryToolTitle, null, sql);
    };

    $.get(url_for('datagrid.filter'),
      function(data) {
        alertify.filterDialog(gettext('Data Filter - %s', queryToolTitle), data, validateUrl, preferences, okCallback)
          .resizeTo(pgBrowser.stdW.sm,pgBrowser.stdH.sm);
      }
    );
  } else {
    datagrid.launch_grid(transId, gridUrl, false, queryToolTitle);
  }
}


export function retrieveNameSpaceName(parentData) {
  if (parentData.schema !== undefined) {
    return parentData.schema.label;
  }
  else if (parentData.view !== undefined) {
    return parentData.view.label;
  }
  else if (parentData.catalog !== undefined) {
    return parentData.catalog.label;
  }
  return '';
}

function generateUrl(trans_id, connectionData, nodeData, parentData) {
  let url_endpoint = url_for('datagrid.panel', {
    'trans_id': trans_id,
  });

  url_endpoint += `?is_query_tool=${false}`
    +`&cmd_type=${connectionData.mnuid}`
    +`&obj_type=${nodeData._type}`
    +`&obj_id=${nodeData._id}`
    +`&sgid=${parentData.server_group._id}`
    +`&sid=${parentData.server._id}`
    +`&did=${parentData.database._id}`
    +`&server_type=${parentData.server.server_type}`;

  return url_endpoint;
}

function generateFilterValidateUrl(nodeData, parentData) {
  // Create url to validate the SQL filter
  var url_params = {
    'sid': parentData.server._id,
    'did': parentData.database._id,
    'obj_id': nodeData._id,
  };

  return url_for('datagrid.filter_validate', url_params);
}

function initFilterDialog(alertify, pgBrowser) {
  // Create filter dialog using alertify
  let filter_editor = null;
  if (!alertify.filterDialog) {
    alertify.dialog('filterDialog', function factory() {
      return {
        main: function(title, message, validateUrl, preferences, okCallback) {
          this.set('title', title);
          this.message = message;
          this.validateUrl = validateUrl;
          this.okCallback = okCallback;
          this.preferences = preferences;
        },

        setup:function() {
          return {
            buttons:[{
              text: '',
              key: 112,
              className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
              attrs: {
                name: 'dialog_help',
                type: 'button',
                label: gettext('Data Filter'),
                'aria-label': gettext('Help'),
                url: url_for('help.static', {
                  'filename': 'viewdata_filter.html',
                }),
              },
            },{
              text: gettext('Cancel'),
              key: 27,
              className: 'btn btn-secondary fa fa-times pg-alertify-button',
            },{
              text: gettext('OK'),
              key: null,
              className: 'btn btn-primary fa fa-check pg-alertify-button',
            }],
            options: {
              modal: 0,
              resizable: true,
              maximizable: false,
              pinnable: false,
              autoReset: false,
            },
          };
        },
        build: function() {
          var that = this;
          alertify.pgDialogBuild.apply(that);

          // Set the tooltip of OK
          $(that.__internal.buttons[2].element).attr('title', gettext('Use SHIFT + ENTER to apply filter...'));

          // For sort/filter dialog we capture the keypress event
          // and on "shift + enter" we clicked on "OK" button.
          $(that.elements.body).on('keypress', function(evt) {
            if (evt.shiftKey && evt.keyCode == 13) {
              that.__internal.buttons[2].element.click();
            }
          });
        },
        prepare:function() {
          var that = this,
            $content = $(this.message),
            $sql_filter = $content.find('#sql_filter');

          $(this.elements.header).attr('data-title', this.get('title'));
          $(this.elements.body.childNodes[0]).addClass(
            'dataview_filter_dialog'
          );

          this.setContent($content.get(0));
          // Disable OK button
          that.__internal.buttons[2].element.disabled = true;

          // Apply CodeMirror to filter text area.
          filter_editor = this.filter_obj = CodeMirror.fromTextArea($sql_filter.get(0), {
            lineNumbers: true,
            mode: 'text/x-pgsql',
            extraKeys: pgBrowser.editor_shortcut_keys,
            indentWithTabs: !that.preferences.use_spaces,
            indentUnit: that.preferences.tab_size,
            tabSize: that.preferences.tab_size,
            lineWrapping: that.preferences.wrap_code,
            autoCloseBrackets: that.preferences.insert_pair_brackets,
            matchBrackets: that.preferences.brace_matching,
            screenReaderLabel: gettext('Filter SQL'),
          });

          let sql_font_size = SqlEditorUtils.calcFontSize(that.preferences.sql_font_size);
          $(this.filter_obj.getWrapperElement()).css('font-size', sql_font_size);

          setTimeout(function() {
            // Set focus on editor
            that.filter_obj.refresh();
            that.filter_obj.focus();
          }, 500);

          that.filter_obj.on('change', function() {
            if (that.filter_obj.getValue() !== '') {
              that.__internal.buttons[2].element.disabled = false;
            } else {
              that.__internal.buttons[2].element.disabled = true;
            }
          });
        },

        callback: function(closeEvent) {

          if (closeEvent.button.text == gettext('OK')) {
            var sql = this.filter_obj.getValue();
            var that = this;
            closeEvent.cancel = true; // Do not close dialog

            // Make ajax call to include the filter by selection
            $.ajax({
              url: that.validateUrl,
              method: 'POST',
              async: false,
              contentType: 'application/json',
              data: JSON.stringify(sql),
            })
              .done(function(res) {
                if (res.data.status) {
                  that.okCallback(sql);
                  that.close(); // Close the dialog
                }
                else {
                  alertify.alert()
                    .setting({
                      'title': gettext('Validation Error'),
                      'label':gettext('OK'),
                      'message': gettext(res.data.result),
                      'onok': function(){
                        filter_editor.focus();
                      },
                    }).show();
                }
              })
              .fail(function(e) {
                if (e.status === 410){
                  pgBrowser.report_error(gettext('Error filtering rows - %s.', e.statusText), e.responseJSON.errormsg);

                } else {
                  alertify.alert(
                    gettext('Validation Error'),
                    e
                  );
                }

              });
          } else if(closeEvent.index == 0) {
            /* help Button */
            closeEvent.cancel = true;
            pgBrowser.showHelp(
              closeEvent.button.element.name,
              closeEvent.button.element.getAttribute('url'),
              null, null
            );
            return;
          }
        },
      };
    });
  }
}

function hasServerOrDatabaseConfiguration(parentData) {
  return parentData.server === undefined || parentData.database === undefined;
}

function hasSchemaOrCatalogOrViewInformation(parentData) {
  return parentData.schema !== undefined || parentData.view !== undefined ||
    parentData.catalog !== undefined;
}

export function generateDatagridTitle(pgBrowser, aciTreeIdentifier, custom_title=null) {
  //const baseTitle = getPanelTitle(pgBrowser, aciTreeIdentifier);
  var preferences = pgBrowser.get_preferences_for_module('browser');
  const parentData = getTreeNodeHierarchyFromIdentifier.call(
    pgBrowser,
    aciTreeIdentifier
  );

  const namespaceName = retrieveNameSpaceName(parentData);
  const db_label = getDatabaseLabel(parentData);
  const node = pgBrowser.treeMenu.findNodeByDomElement(aciTreeIdentifier);

  var dtg_title_placeholder = '';
  if(custom_title) {
    dtg_title_placeholder = custom_title;
  } else {
    dtg_title_placeholder = preferences['vw_edt_tab_title_placeholder'];
  }


  var title_data = {
    'database': db_label,
    'username': parentData.server.user.name,
    'server': parentData.server.label,
    'schema': namespaceName,
    'table': node.getData().label,
    'type': 'datagrid',
  };
  var title = generateTitle(dtg_title_placeholder, title_data);

  return title;
}
