// This defines File Manager dialog
define([
  'sources/gettext', 'jquery', 'underscore', 'alertify',
  'sources/alerts/alertify_wrapper',
], function(gettext, $, _, alertify, AlertifyWrapper) {
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

          var set_last_traversed_dir = function(path, trans_id) {
            return $.ajax({
              url: "{{ url_for('file_manager.index') }}save_last_dir/" + trans_id,
              type: 'POST',
              data: JSON.stringify(path),
              contentType: 'application/json'
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
              var self = this;
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
              setTimeout(function() {
                $($container.find('.file_manager')).on('enter-key', function() {
                    $($(self.elements.footer).find('.file_manager_ok')).trigger('click')
                });
              }, 200);
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
                    text: gettext("Select"), className: "btn btn-primary fa fa-file file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: gettext("Cancel"), className: "btn btn-danger fa fa-times pg-alertify-button"
                  }
                ],
                focus: { element: 0 },
                options: {
                  closableByDimmer: false,

                }
              };
            },
            callback: function(closeEvent) {
              if (closeEvent.button.text == gettext("Select")) {
                var newFile = $('.storage_dialog #uploader .input-path').val(),
                    file_data = {'path': $('.currentpath').val()};

                pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:storage_dialog', newFile);

                set_last_traversed_dir(file_data, trans_id);
                var innerbody = $(this.elements.body).find('.storage_content')
                $(innerbody).find('*').off();
                innerbody.remove();
                removeTransId(trans_id);
              } else if (closeEvent.button.text == gettext("Cancel")) {
                var innerbody = $(this.elements.body).find('.storage_content')
                $(innerbody).find('*').off();
                innerbody.remove();
                removeTransId(trans_id);
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
              var self = this;
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
              setTimeout(function() {
                $($container.find('.file_manager')).on('enter-key', function() {
                    $($(self.elements.footer).find('.file_manager_ok')).trigger('click')
                });
              }, 200);
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
                    text: gettext("Select"), key: 13, className: "btn btn-primary fa fa-file file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: gettext("Cancel"), key: 27, className: "btn btn-danger fa fa-times pg-alertify-button"
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
              if (closeEvent.button.text == gettext("Select")) {
                var newFile = $('.storage_dialog #uploader .input-path').val(),
                    file_data = {'path': $('.currentpath').val()};

                pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:select_file', newFile);
                var innerbody = $(this.elements.body).find('.storage_content')
                $(innerbody).find('*').off();
                innerbody.remove();
                removeTransId(trans_id);
                // Ajax call to store the last directory visited once user press select button

                set_last_traversed_dir(file_data, trans_id);
              } else if (closeEvent.button.text == gettext("Cancel")) {
                var innerbody = $(this.elements.body).find('.storage_content')
                $(innerbody).find('*').off();
                innerbody.remove();
                removeTransId(trans_id);
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
              var self = this;
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
              setTimeout(function() {
                $($container.find('.file_manager')).on('enter-key', function() {
                    $($(self.elements.footer).find('.file_manager_ok')).trigger('click')
                });
              }, 200);
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
                    text: gettext("Select"), key: 13, className: "btn btn-primary fa fa-file file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: gettext("Cancel"), key: 27, className: "btn btn-danger fa fa-times pg-alertify-button"
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
              if (closeEvent.button.text == gettext("Select")) {
                var newFile = $('.storage_dialog #uploader .input-path').val(),
                    file_data = {'path': $('.currentpath').val()};
                pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:select_folder', newFile);
                var innerbody = $(this.elements.body).find('.storage_content')
                $(innerbody).find('*').off();
                innerbody.remove();
                removeTransId(trans_id);
                // Ajax call to store the last directory visited once user press select button
                set_last_traversed_dir(file_data, trans_id);
              } else if (closeEvent.button.text == gettext("Cancel")) {
                var innerbody = $(this.elements.body).find('.storage_content')
                $(innerbody).find('*').off();
                innerbody.remove();
                removeTransId(trans_id);
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
              var self = this,
                  trans_id;
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
              setTimeout(function() {
                $($container.find('.file_manager')).on('enter-key', function() {
                    $($(self.elements.footer).find('.file_manager_ok')).trigger('click')
                });
              }, 200);
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
                    text: gettext("Create"), key: 13, className: "btn btn-primary fa fa-file file_manager_create file_manager_ok pg-alertify-button disabled"
                  },
                  {
                    text: gettext("Cancel"), key: 27, className: "btn btn-danger fa fa-times file_manager_create_cancel pg-alertify-button"
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
                var $yesBtn = $('.replace_file .btn_yes'),
                     $noBtn = $('.replace_file .btn_no');

                $('.storage_dialog #uploader .input-path').attr('disabled', true);
                $('.file_manager_ok').addClass('disabled');
                $('.replace_file, .fm_dimmer').show();

                $yesBtn.click(function(e) {
                  $('.replace_file, .fm_dimmer').hide();
                  $yesBtn.off();
                  $noBtn.off();
                  var newFile = $('.storage_dialog #uploader .input-path').val()

                  pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:create_file', newFile);
                  $('.file_manager_create_cancel').trigger('click');
                  $('.storage_dialog #uploader .input-path').attr('disabled', false);
                  $('.file_manager_ok').removeClass('disabled');
                });

                $noBtn.click(function(e) {
                  $('.replace_file, .fm_dimmer').hide();
                  $yesBtn.off();
                  $noBtn.off();
                  $('.storage_dialog #uploader .input-path').attr('disabled', false);
                  $('.file_manager_ok').removeClass('disabled');
                });
            },
            is_file_exist: function() {
              var full_path  = $('.storage_dialog #uploader .input-path').val(),
                  path = full_path.substr(0, full_path.lastIndexOf('/') + 1),
                  selected_item = full_path.substr(full_path.lastIndexOf('/') + 1),
                  is_exist = false;

              var file_data = {
                'path': path,
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
                  if(data['Code'] === 1) {
                    is_exist = true;
                  } else {
                    is_exist = false;
                  }
                }
              });
              return is_exist;
            },
            check_permission: function(path) {
              var permission = false,
                  post_data = {
                    'path': path,
                    'mode': 'permission'
                  };

              $.ajax({
                type: 'POST',
                data: JSON.stringify(post_data),
                url: fileConnector + trans_id+'/',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                async: false,
                success: function(resp) {
                  var data = resp.data.result;
                  if (data.Code === 1) {
                    permission = true;
                  } else {
                    $('.file_manager_ok').addClass('disabled');
                    var alertifyWrapper = new AlertifyWrapper();
                    alertifyWrapper.error(data.Error);
                  }
                },
                error: function() {
                  $('.file_manager_ok').addClass('disabled');
                  var alertifyWrapper = new AlertifyWrapper();
                  alertifyWrapper.error( gettext('Error occurred while checking access permission.'));
                }
              });
              return permission;
            },
            callback: function(closeEvent) {
              if (closeEvent.button.text == gettext("Create")) {
                var newFile = $('.storage_dialog #uploader .input-path').val(),
                    file_data = {'path': $('.currentpath').val()};

                if (!this.check_permission(newFile)) {
                  closeEvent.cancel = true;
                  return;
                }

                if(!_.isUndefined(newFile) && newFile !== '' && this.is_file_exist()) {
                  this.replace_file();
                  closeEvent.cancel = true;
                } else {
                  pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:create_file', newFile);
                  var innerbody = $(this.elements.body).find('.storage_content');
                  $(innerbody).find('*').off();
                  innerbody.remove();
                  removeTransId(trans_id);
                }

                set_last_traversed_dir(file_data, trans_id);
              } else if (closeEvent.button.text == gettext("Cancel")) {
                var innerbody = $(this.elements.body).find('.storage_content')
                $(innerbody).find('*').off();
                innerbody.remove();
                removeTransId(trans_id);
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
