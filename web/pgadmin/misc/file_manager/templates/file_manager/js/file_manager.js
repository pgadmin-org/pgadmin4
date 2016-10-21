define([
      'jquery', 'underscore', 'alertify'],

  // This defines File Manager dialog
  function($, _, alertify) {
    pgAdmin = pgAdmin || window.pgAdmin || {};

    /*
     * Hmm... this module is already been initialized, we can refer to the old
     * object from here.
     */
    if (pgAdmin.FileManager) {
      return pgAdmin.FileManager;
    }

    pgAdmin.FileManager = {
      init: function() {
        if (this.initialized) {
          return;
        }

        this.initialized = true;

        var module_url = "{{ url_for('file_manager.index') }}",
            fileConnector = module_url + "filemanager/";

          // send a request to get transaction id
          var getTransId = function(configs) {
            return $.ajax({
              data: configs,
              type: "POST",
              async: false,
              url: module_url + "get_trans_id",
              dataType: "json",
              contentType: "application/json; charset=utf-8",
            });
          };

          // Function to remove trans id from session
          var removeTransId = function(trans_id) {
            return $.ajax({
              type: "GET",
              async: false,
              url: module_url + "del_trans_id/" + trans_id,
              dataType: "json",
              contentType: "application/json; charset=utf-8",
            });
          };
        // Declare the Storage dialog
        alertify.dialog('storageManagerDlg', function() {
          var controls = [], // Keep tracking of all the backform controls
              // Dialog containter
              $container = $("<div class='storage_dialog'></div>");

          /*
           * Function: renderStoragePanel
           *
           * Renders the FileManager in the content div based on the given
           * configuration parameters.
           */
          var renderStoragePanel = function(params) {
            /*
             * Clear the existing html in the storage content
             */
            var content = $container.find('.storage_content');
            content.empty();

            $.get("{{ url_for('file_manager.index') }}", function(data) {
              content.append(data);
            });

            transId = getTransId(params);
            var t_res;
            if (transId.readyState == 4) {
              t_res = JSON.parse(transId.responseText);
            }
            trans_id = t_res.data.fileTransId;
          };

          // Dialog property
          return {
            main: function(params) {
              // Set title and button name
              if (_.isUndefined(params['dialog_title'])) {
                params['dialog_title'] = 'Storage manager';
              }
              this.set('title', params['dialog_title']);
              if (_.isUndefined(params['btn_primary'])) {
                params['btn_primary'] = 'Select';
              }
              this.set('label', params['btn_primary']);

              params = JSON.stringify(params);
              $container.find('.storage_content').remove();
              $container.append("<div class='storage_content'></div>");
              renderStoragePanel(params);
              this.elements.dialog.style.minWidth = '630px';
              this.show();
            },
            settings: {
              label: undefined
            },
            settingUpdated: function (key, oldValue, newValue) {
              switch (key) {
              case 'message':
                  this.setMessage(newValue);
                  break;
              case 'label':
                  if (this.__internal.buttons[0].element) {
                      this.__internal.buttons[0].element.innerHTML = newValue;
                  }
                  break;
              default:
                  break;
              }
            },
            setup:function() {
              return {
                buttons:[
                  {
                    text: "{{ _('Select') }}", key: 13, className: "btn btn-primary fa fa-file file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: "{{ _('Cancel') }}", className: "btn btn-danger fa fa-times pg-alertify-button"
                  }
                ],
                focus: { element: 0 },
                options: {
                  closableByDimmer: false,

                }
              };
            },
            callback: function(closeEvent) {
              if (closeEvent.button.text == "{{ _('Select') }}") {
                if($('.fileinfo').data('view') == 'grid') {
                  sel_file = $('.fileinfo').find('#contents li.selected p span').attr('title');
                } else {
                  sel_file = $('.fileinfo tbody tr.selected td p span').attr('title');
                }
                var newFile = $('.currentpath').val() + sel_file;

                pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:storage_dialog', newFile);
              } else if (closeEvent.button.text == "{{ _('Cancel') }}") {
                if (removeTransId(trans_id)) {
                  this.destroy();
                  return;
                }
              }
            },
            build: function() {
              this.elements.content.appendChild($container.get(0));
            },
            hooks: {
              onshow: function() {
                $(this.elements.body).addClass('pgadmin-storage-body');
              }
            }
          };
        });

        // Declare the Selection dialog
        alertify.dialog('fileSelectionDlg', function() {
          var controls = [], // Keep tracking of all the backform controls
              // Dialog containter
              $container = $("<div class='storage_dialog file_selection_dlg'></div>");

          // send a request to get transaction id
          /*
           * Function: renderStoragePanel
           *
           * Renders the FileManager in the content div based on the given
           * configuration parameters.
           */
          var renderStoragePanel = function(configs) {
            /*
             * Clear the existing html in the storage content
             */
            var content = $container.find('.storage_content');
            content.empty();

            $.get("{{ url_for('file_manager.index') }}", function(data) {
              content.append(data);
            });

            transId = getTransId(configs);
            var t_res;
            if (transId.readyState == 4) {
              t_res = JSON.parse(transId.responseText);
            }
            trans_id = t_res.data.fileTransId;
          };

          // Dialog property
          return {
            main: function(params) {
              // Set title and button name
              if (_.isUndefined(params['dialog_title'])) {
                params['dialog_title'] = 'Select file';
              }
              this.set('title', params['dialog_title']);
              if (_.isUndefined(params['btn_primary'])) {
                params['btn_primary'] = 'Select';
              }
              this.set('label', params['btn_primary']);

              params = JSON.stringify(params);
              $container.find('.storage_content').remove();
              $container.append("<div class='storage_content'></div>");
              renderStoragePanel(params);
              this.elements.dialog.style.minWidth = '630px';
              this.show();
            },
            settings: {
              label: undefined
            },
            settingUpdated: function (key, oldValue, newValue) {
              switch (key) {
              case 'message':
                  this.setMessage(newValue);
                  break;
              case 'label':
                  if (this.__internal.buttons[0].element) {
                      this.__internal.buttons[0].element.innerHTML = newValue;
                  }
                  break;
              default:
                  break;
              }
            },
            setup:function() {
              return {
                buttons:[
                  {
                    text: "{{ _('Select') }}", key: 13, className: "btn btn-primary fa fa-file file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: "{{ _('Cancel') }}", key: 27, className: "btn btn-danger fa fa-times pg-alertify-button"
                  }
                ],
                focus: { element: 0 },
                options: {
                  closableByDimmer: false,
                  maximizable: false,
                  closable: false,
                  movable: true
                }
              };
            },
            callback: function(closeEvent) {
              if (closeEvent.button.text == "{{ _('Select') }}") {
                if($('.fileinfo').data('view') == 'grid') {
                  sel_file = $('.fileinfo').find('#contents li.selected  p span').attr('title');
                } else {
                  sel_file = $('.fileinfo tbody tr.selected td p span').attr('title');
                }
                var newFile = $('.currentpath').val() + sel_file;

                pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:select_file', newFile);
                removeTransId(trans_id);
              } else if (closeEvent.button.text == "{{ _('Cancel') }}") {
                if (removeTransId(trans_id)) {
                  this.destroy();
                  return;
                }
              }
            },
            build: function() {
              this.elements.content.appendChild($container.get(0));
            },
            hooks: {
              onshow: function() {
                $(this.elements.body).addClass('pgadmin-storage-body');
              }
            }
          };
        });

        // Declare the Folder Selection dialog
        alertify.dialog('folderSelectionDlg', function() {
          var controls = [], // Keep tracking of all the backform controls
              // Dialog containter
              $container = $("<div class='storage_dialog folder_selection_dlg'></div>");

          // send a request to get transaction id
          /*
           * Function: renderStoragePanel
           *
           * Renders the FileManager in the content div based on the given
           * configuration parameters.
           */
          var renderStoragePanel = function(params) {
            /*
             * Clear the existing html in the storage content
             */
            var content = $container.find('.storage_content');
            content.empty();

            $.get("{{ url_for('file_manager.index') }}", function(data) {
              content.append(data);
            });

            transId = getTransId(params);
            var t_res;
            if (transId.readyState == 4) {
              t_res = JSON.parse(transId.responseText);
            }
            trans_id = t_res.data.fileTransId;
          };

          // Dialog property
          return {
            main: function(params) {
              // Set title and button name
              if (_.isUndefined(params['dialog_title'])) {
                params['dialog_title'] = 'Select folder';
              }
              this.set('title', params['dialog_title']);
              if (_.isUndefined(params['btn_primary'])) {
                params['btn_primary'] = 'Select';
              }
              this.set('label', params['btn_primary']);

              params = JSON.stringify(params);
              $container.find('.storage_content').remove();
              $container.append("<div class='storage_content'></div>");
              renderStoragePanel(params);
              this.elements.dialog.style.minWidth = '630px';
              this.show();
            },
            settings: {
              label: undefined
            },
            settingUpdated: function (key, oldValue, newValue) {
              switch (key) {
              case 'message':
                  this.setMessage(newValue);
                  break;
              case 'label':
                  if (this.__internal.buttons[0].element) {
                      this.__internal.buttons[0].element.innerHTML = newValue;
                  }
                  break;
              default:
                  break;
              }
            },
            setup:function() {
              return {
                buttons:[
                  {
                    text: "{{ _('Select') }}", key: 13, className: "btn btn-primary fa fa-file file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: "{{ _('Cancel') }}", key: 27, className: "btn btn-danger fa fa-times pg-alertify-button"
                  }
                ],
                focus: { element: 0 },
                options: {
                  closableByDimmer: false,
                  maximizable: false,
                  closable: false,
                  movable: true
                }
              };
            },
            callback: function(closeEvent) {
              if (closeEvent.button.text == "{{ _('Select') }}") {
                if($('.fileinfo').data('view') == 'grid') {
                  sel_file = $('.fileinfo').find('#contents li.selected p span').attr('title');
                } else {
                  sel_file = $('.fileinfo tbody tr.selected td p span').attr('title');
                }
                var newFile = $('.currentpath').val() + sel_file;

                pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:select_folder', newFile);
                removeTransId(trans_id);
              } else if (closeEvent.button.text == "{{ _('Cancel') }}") {
                if (removeTransId(trans_id)) {
                  this.destroy();
                  return;
                }
              }
            },
            build: function() {
              this.elements.content.appendChild($container.get(0));
            },
            hooks: {
              onshow: function() {
                $(this.elements.body).addClass('pgadmin-storage-body');
              }
            }
          };
        });

        // Declare the Create mode dialog
        alertify.dialog('createModeDlg', function() {
          var controls = [], // Keep tracking of all the backform controls
              // Dialog containter
              $container = $("<div class='storage_dialog create_mode_dlg'></div>");

          /*
           * Function: renderStoragePanel
           *
           * Renders the FileManager in the content div based on the given
           * configuration parameters.
           */
          var renderStoragePanel = function(params) {
            /*
             * Clear the existing html in the storage content
             */
            var content = $container.find('.storage_content');
            content.empty();

            $.get("{{ url_for('file_manager.index') }}", function(data) {
              content.append(data);
            });

            transId = getTransId(params);
            var t_res;
            if (transId.readyState == 4) {
              t_res = JSON.parse(transId.responseText);
            }
            trans_id = t_res.data.fileTransId;
          };

          // Dialog property
          return {
            main: function(params) {
              var trans_id;
              // Set title and button name
              if (_.isUndefined(params['dialog_title'])) {
                params['dialog_title'] = 'Create file';
              }
              this.set('title', params['dialog_title']);
              if (_.isUndefined(params['btn_primary'])) {
                params['btn_primary'] = 'Create';
              }
              this.set('label', params['btn_primary']);

              params = JSON.stringify(params);
              $container.find('.storage_content').remove();
              $container.append("<div class='storage_content'></div>");
              renderStoragePanel(params);
              this.elements.dialog.style.minWidth = '630px';
              this.show();
            },
            settings: {
              label: undefined
            },
            settingUpdated: function (key, oldValue, newValue) {
              switch (key) {
              case 'message':
                  this.setMessage(newValue);
                  break;
              case 'label':
                  if (this.__internal.buttons[0].element) {
                      this.__internal.buttons[0].element.innerHTML = newValue;
                  }
                  break;
              default:
                  break;
              }
            },
            setup:function() {
              return {
                buttons:[
                  {
                    text: "{{ _('Create') }}", key: 13, className: "btn btn-primary fa fa-file file_manager_create file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: "{{ _('Cancel') }}", key: 27, className: "btn btn-danger fa fa-times file_manager_create_cancel pg-alertify-button"
                  }
                ],
                focus: { element: 0 },
                options: {
                  closableByDimmer: false,
                  maximizable: false,
                  closable: false,
                  movable: true
                }
              };
            },
            replace_file: function() {
                $('.replace_file, .fm_dimmer').show();
                $('.replace_file .btn_yes').click(function(self) {
                  $('.replace_file, .fm_dimmer').hide();
                  var selected_item = $('.allowed_file_types .create_input input[type="text"]').val(),
                      newFile = $('.currentpath').val() + selected_item;

                  pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:create_file', newFile);
                  $('.file_manager_create_cancel').trigger('click');
                });
                $('.replace_file .btn_no').click(function() {
                  $('.replace_file, .fm_dimmer').hide();
                });
            },
            is_file_exist: function() {
              var selected_item = $('.allowed_file_types .create_input input[type="text"]').val(),
                  is_exist = false;

              var file_data = {
                'path': $('.currentpath').val(),
                'name': selected_item,
                'mode': 'is_file_exist'
              };

              $.ajax({
                type: 'POST',
                data: JSON.stringify(file_data),
                url: fileConnector + trans_id+'/',
                dataType: 'json',
                contentType: "application/x-download; charset=utf-8",
                async: false,
                success: function(resp) {
                  data = resp.data.result;
                  if(data['Code'] === 0) {
                    is_exist = true;
                  } else {
                    is_exist = false;
                  }
                }
              });
              return is_exist;
            },
            callback: function(closeEvent) {
              if (closeEvent.button.text == "{{ _('Create') }}") {
                var selected_item = $('.allowed_file_types .create_input input[type="text"]').val();
                var newFile = $('.currentpath').val() + selected_item;

                if(!_.isUndefined(selected_item) && selected_item !== '' && this.is_file_exist()) {
                  this.replace_file();
                  closeEvent.cancel = true;
                }
                else {
                  pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:create_file', newFile);
                  removeTransId(trans_id);
                }
              } else if (closeEvent.button.text == "{{ _('Cancel') }}") {
                if (removeTransId(trans_id)) {
                  this.destroy();
                  return;
                }
              }
            },
            build: function() {
              this.elements.content.appendChild($container.get(0));
            },
            hooks: {
              onshow: function() {
                $(this.elements.body).addClass('pgadmin-storage-body');
              }
            }
          };
        });
      },
      show_storage_dlg: function(params) {
        alertify.storageManagerDlg(params).resizeTo('60%', '80%');
      },
      show_file_selection: function(params) {
        alertify.fileSelectionDlg(params).resizeTo('60%', '80%');
      },
      show_folder_selection: function(params) {
        alertify.folderSelectionDlg(params).resizeTo('60%', '80%');
      },
      show_create_dlg: function(params) {
        alertify.createModeDlg(params).resizeTo('60%', '80%');
      },
      // call dialogs subject to dialog_type param
      show_dialog: function(params) {
        if(params.dialog_type == 'select_file') {
          this.show_file_selection(params);
        }
        else if (params.dialog_type == 'select_folder') {
          this.show_folder_selection(params);
        }
        else if (params.dialog_type == 'create_file') {
          this.show_create_dlg(params);
        }
        else {
          this.show_storage_dlg(params);
        }
      }
    };

    return pgAdmin.FileManager;
  });
