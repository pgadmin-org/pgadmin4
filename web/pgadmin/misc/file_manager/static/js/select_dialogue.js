import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import $ from 'jquery';
import Alertify from 'pgadmin.alertifyjs';
import pgAdmin from 'sources/pgadmin';
import {getTransId, removeTransId, set_last_traversed_dir} from './helpers';

// Declare the Selection dialog
module.exports =  Alertify.dialog('fileSelectionDlg', function() {
  // Dialog property
  return {
    main: function(params) {
      // Set title and button name
      var self = this;
      if (_.isUndefined(params['dialog_title'])) {
        params['dialog_title'] = 'Select file';
      }
      self.dialog_type = params['dialog_type'];

      this.set('title', params['dialog_title']);
      if (_.isUndefined(params['btn_primary'])) {
        params['btn_primary'] = 'Select';
      }
      this.set('label', params['btn_primary']);

      this.params = JSON.stringify(params);

      this.elements.dialog.style.minWidth = '630px';
      this.show();

    },
    settings: {
      label: undefined,
    },
    settingUpdated: function(key, oldValue, newValue) {
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
    prepare: function() {
      var self = this;
      self.$container.find('.storage_content').remove();
      self.$container.append('<div class=\'storage_content\'></div>');

      var content = self.$container.find('.storage_content');
      content.empty();

      $.get(url_for('file_manager.index'), function(data) {
        content.append(data);
      });

      var transId = getTransId(self.params);
      var t_res;
      if (transId.readyState == 4) {
        t_res = JSON.parse(transId.responseText);
      }
      self.trans_id = t_res.data.fileTransId;

      setTimeout(function() {
        $(self.$container.find('.file_manager')).on('enter-key', function() {
          $($(self.elements.footer).find('.file_manager_ok')).trigger('click');
        });
      }, 200);
      self.__internal.buttons[0].element.disabled = true;
    },
    setup: function() {
      return {
        buttons: [{
          text: gettext('Select'),
          key: 13,
          className: 'btn btn-primary fa fa-file file_manager_ok pg-alertify-button disabled',
        },
        {
          text: gettext('Cancel'),
          key: 27,
          className: 'btn btn-danger fa fa-times pg-alertify-button',
        },
        ],
        focus: {
          element: 0,
        },
        options: {
          closableByDimmer: false,
          maximizable: false,
          closable: false,
          movable: true,
        },
      };
    },
    callback: function(closeEvent) {
      var innerbody;

      if (closeEvent.button.text == gettext('Select')) {
        var newFile = $('.storage_dialog #uploader .input-path').val(),
          file_data = {
            'path': $('.currentpath').val(),
          };

        pgAdmin.Browser.Events.trigger('pgadmin-storage:finish_btn:' + this.dialog_type, newFile);
        innerbody = $(this.elements.body).find('.storage_content');
        $(innerbody).find('*').off();
        innerbody.remove();
        removeTransId(this.trans_id);
        // Ajax call to store the last directory visited once user press select button

        set_last_traversed_dir(file_data, this.trans_id);
      } else if (closeEvent.button.text == gettext('Cancel')) {
        innerbody = $(this.elements.body).find('.storage_content');
        $(innerbody).find('*').off();
        innerbody.remove();
        removeTransId(this.trans_id);
        pgAdmin.Browser.Events.trigger('pgadmin-storage:cancel_btn:' + this.dialog_type);
      }
    },
    build: function() {
      this.$container = $('<div class="storage_dialog file_selection_dlg"></div>');
      this.elements.content.appendChild(this.$container.get(0));
    },
    hooks: {
      onshow: function() {
        $(this.elements.body).addClass('pgadmin-storage-body');
      },
    },
  };
});
