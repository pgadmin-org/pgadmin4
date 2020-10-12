/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import $ from 'jquery';
import Alertify from 'pgadmin.alertifyjs';
import pgAdmin from 'sources/pgadmin';
import {removeTransId, set_last_traversed_dir} from './helpers';

// Declare the Create mode dialog
module.exports =  Alertify.dialog('createModeDlg', function() {
  // Dialog property
  return {
    setup: function() {
      return {
        buttons: [{
          text: gettext('Cancel'),
          key: 27,
          className: 'btn btn-secondary fa fa-times file_manager_create_cancel pg-alertify-button',
        },{
          text: gettext('Create'),
          key: 13,
          className: 'btn btn-primary fa fa-file file_manager_create file_manager_ok pg-alertify-button disabled',
        }],
        options: {
          closableByDimmer: false,
          maximizable: false,
          closable: false,
          movable: true,
          padding: !1,
          overflow: !1,
          model: 0,
          resizable: true,
          pinnable: false,
          modal: false,
          autoReset: false,
        },
      };
    },
    replace_file: function() {
      var $yesBtn = $('.replace_file .btn_yes'),
        $noBtn = $('.replace_file .btn_no');

      $('.storage_dialog #uploader .input-path').attr('disabled', true);
      $('.file_manager_ok').addClass('disabled');
      $('.replace_file, .fm_dimmer').show();

      $yesBtn.on('click',() => {
        $('.replace_file, .fm_dimmer').hide();
        $yesBtn.off();
        $noBtn.off();
        var newFile = $('.storage_dialog #uploader .input-path').val();

        pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:create_file', newFile);
        $('.file_manager_create_cancel').trigger('click');
        $('.storage_dialog #uploader .input-path').attr('disabled', false);
        $('.file_manager_ok').removeClass('disabled');
      });

      $noBtn.on('click',() => {
        $('.replace_file, .fm_dimmer').hide();
        $yesBtn.off();
        $noBtn.off();
        $('.storage_dialog #uploader .input-path').attr('disabled', false);
        $('.file_manager_ok').removeClass('disabled');
      });
    },
    is_file_exist: function() {
      var full_path = $('.storage_dialog #uploader .input-path').val(),
        path = full_path.substr(0, full_path.lastIndexOf('/') + 1),
        selected_item = full_path.substr(full_path.lastIndexOf('/') + 1),
        is_exist = false;

      var file_data = {
        'path': path,
        'name': selected_item,
        'mode': 'is_file_exist',
      };

      $.ajax({
        type: 'POST',
        data: JSON.stringify(file_data),
        url: url_for('file_manager.filemanager', {
          'trans_id': this.trans_id,
        }),
        dataType: 'json',
        contentType: 'application/x-download; charset=utf-8',
        async: false,
      })
        .done(function(resp) {
          var data = resp.data.result;
          if (data['Code'] === 1) {
            is_exist = true;
          } else {
            is_exist = false;
          }
        });
      return is_exist;
    },
    check_permission: function(path) {
      var permission = false,
        post_data = {
          'path': path,
          'mode': 'permission',
        };

      $.ajax({
        type: 'POST',
        data: JSON.stringify(post_data),
        url: url_for('file_manager.filemanager', {
          'trans_id': this.trans_id,
        }),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        async: false,
      })
        .done(function(resp) {
          var data = resp.data.result;
          if (data.Code === 1) {
            permission = true;
          } else {
            $('.file_manager_ok').addClass('disabled');
            Alertify.error(data.Error);
          }
        })
        .fail(function() {
          $('.file_manager_ok').addClass('disabled');
          Alertify.error(gettext('Error occurred while checking access permission.'));
        });
      return permission;
    },
    callback: function(closeEvent) {
      if (closeEvent.button.text == gettext('Create')) {
        var newFile = $('.storage_dialog #uploader .input-path').val(),
          file_data = {
            'path': $('.currentpath').val(),
          },
          innerbody,
          ext = $('.allowed_file_types select').val();

        /*
           Add the file extension if necessary, and if the file type selector
           isn't set to "All Files". If there's no . at all in the path, or
           there is a . already but it's not following the last /, AND the
           extension isn't *, then we add the extension.
         */
        if ((!newFile.includes('.') ||
            newFile.split('.').pop() != ext) &&
            ext != '*') {
          newFile = newFile + '.' + ext;
          $('.storage_dialog #uploader .input-path').val(newFile);
        }

        if (!this.check_permission(newFile)) {
          closeEvent.cancel = true;
          return;
        }

        if (!_.isUndefined(newFile) && newFile !== '' && this.is_file_exist()) {
          this.replace_file();
          this.$container.find('.replace_file').find('.btn_yes').trigger('focus');
          closeEvent.cancel = true;
        } else {
          pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:create_file', newFile);
          innerbody = $(this.elements.body).find('.storage_content');
          $(innerbody).find('*').off();
          innerbody.remove();
          removeTransId(this.trans_id);
        }

        set_last_traversed_dir(file_data, this.trans_id);
      } else if (closeEvent.button.text == gettext('Cancel')) {
        innerbody = $(this.elements.body).find('.storage_content');
        $(innerbody).find('*').off();
        innerbody.remove();
        removeTransId(this.trans_id);
        pgAdmin.Browser.Events.trigger('pgadmin-storage:cancel_btn:create_file');
      }
    },
  };
}, true, 'fileSelectionDlg');
