//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
// This file contains common utilities functions used in sqleditor modules

define(['jquery', 'underscore', 'sources/gettext', 'sources/url_for', 'pgadmin.alertifyjs'],
  function ($, _, gettext, url_for, alertify) {
    var sqlEditorUtils = {
      /* Reference link http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
       * Modified as per requirement.
       */
      epicRandomString: function(length) {
        var s = [];
        var hexDigits = '0123456789abcdef';
        for (var i = 0; i < 36; i++) {
          s[i] = hexDigits.substr(
            Math.floor(Math.random() * 0x10), 1
          );
        }
        // bits 12-15 of the time_hi_and_version field to 0010
        s[14] = '4';
        // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
        s[8] = s[13] = s[18] = s[23] = '-';

        var uuid = s.join('');
        return uuid.replace(/-/g, '').substr(0, length);
      },

      // Returns a unique hash for input string
      getHash: function(input) {
        var hash = 0, len = input.length;
        for (var i = 0; i < len; i++) {
          hash  = ((hash << 5) - hash) + input.charCodeAt(i);
          hash |= 0; // to 32bit integer
        }
        return hash;
      },
      calculateColumnWidth: function (text) {
        // Calculate column header width based on column name or type
        // Create a temporary element with given label, append to body
        // calculate its width and remove the element.
        $('body').append(
          '<span id="pg_text" style="visibility: hidden;">'+ text + '</span>'
        );
        var width = $('#pg_text').width() + 23;
        $('#pg_text').remove(); // remove element

        return width;
      },
      capitalizeFirstLetter: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      },

      // Disables arrow to change connection
      disable_connection_dropdown: function (status) {
        if (status){
          $('.conn-info-dd').prop('disabled',true);
          $('.connection-data').css({pointerEvents: 'none', cursor: 'arrow'});
        }else{
          $('.conn-info-dd').prop('disabled',false);
          $('.connection-data').css({pointerEvents: 'auto', cursor: 'pointer'});
        }
      },

      // Status flag
      previousStatus: null,

      // This function will fetch the connection status via ajax
      fetchConnectionStatus: function(target, $el, $status_el) {
        // If user has switch the browser Tab or Minimized window or
        // if wcDocker panel is not in focus then don't fire AJAX
        var url = url_for('sqleditor.connection_status', {
          'trans_id': target.transId,
        });

        if (document.visibilityState !== 'visible' ||
              $el.data('panel-visible') !== 'visible' ) {
          return;
        }

        if($status_el.hasClass('obtaining-conn')){
          return;
        }
        let sqleditor_obj = target;

        // Start polling..
        $.ajax({
          url: url,
          method: 'GET',
        })
          .done(function (res) {
            if(res && res.data) {
              var status = res.data.status,
                msg = res.data.message,
                is_status_changed = false;

              // Raise notify messages comes from database server.
              sqleditor_obj.update_notifications(res.data.notifies);

              // Inject CSS as required
              switch(status) {
              // Busy
              case 1:
                // if received busy status more than once then only
                if(status == sqlEditorUtils.previousStatus &&
                        !$status_el.hasClass('fa-hourglass-half')) {
                  $status_el.removeClass()
                    .addClass('fa fa-hourglass-half');
                  is_status_changed = true;
                }
                break;
                // Idle in transaction
              case 2:
                if(sqlEditorUtils.previousStatus != status &&
                        !$status_el.hasClass('fa-clock')) {
                  $status_el.removeClass()
                    .addClass('fa fa-clock');
                  is_status_changed = true;
                }
                break;
                // Failed in transaction
              case 3:
                if(sqlEditorUtils.previousStatus != status &&
                        !$status_el.hasClass('fa-exclamation-circle')) {
                  $status_el.removeClass()
                    .addClass('fa fa-exclamation-circle');
                  is_status_changed = true;
                }
                break;
                // Failed in transaction with unknown server side error
              case 4:
                if(sqlEditorUtils.previousStatus != status &&
                        !$status_el.hasClass('fa-exclamation-triangle')) {
                  $status_el.removeClass()
                    .addClass('fa fa-exclamation-triangle');
                  is_status_changed = true;
                }
                break;
              default:
                if(sqlEditorUtils.previousStatus != status &&
                        !$status_el.hasClass('fa-query_tool_connected')) {
                  $status_el.removeClass()
                    .addClass('pg-font-icon icon-connected');
                  is_status_changed = true;
                }
              }

              sqlEditorUtils.previousStatus = status;
              // Set bootstrap popover message
              if(is_status_changed) {
                $el.popover('hide');
                $el.attr('data-content', msg);
              }
            } else {
            // We come here means we did not receive expected response
            // from server, we need to error out
              sqlEditorUtils.previousStatus = -99;
              msg = gettext('An unexpected error occurred - ' +
                          'ensure you are logged into the application.');
              $el.attr('data-content', msg);
              if(!$status_el.hasClass('icon-disconnected')) {
                $el.popover('hide');
                $status_el.removeClass()
                  .addClass('pg-icon-font icon-disconnected');
              }
            }
          })
          .fail(function (e) {
            sqlEditorUtils.previousStatus = -1;
            var msg = gettext('Transaction status check failed.');
            if (e.readyState == 0) {
              msg = gettext('Not connected to the server or the connection to ' +
                          'the server has been closed.');
            } else if (e.responseJSON && e.responseJSON.errormsg) {
              msg = e.responseJSON.errormsg;
            }

            // Set bootstrap popover
            $el.attr('data-content', msg);
            // Add error class
            if(!$status_el.hasClass('icon-disconnected')) {
              $el.popover('hide');
              $status_el.removeClass()
                .addClass('pg-font-icon icon-disconnected');
            }
          });
      },

      // Updates the flag for connection status poll
      updateConnectionStatusFlag: function(status) {
        var $el = $('.connection_status');
        if ($el.data('panel-visible') != status) {
          $el.data('panel-visible', status);
        }
      },

      calcFontSize: function(fontSize) {
        if(fontSize) {
          fontSize = parseFloat((Math.round(parseFloat(fontSize + 'e+2')) + 'e-2'));
          let rounded = Number(fontSize);
          if(rounded > 0) {
            return rounded + 'em';
          }
        }
        return '1em';
      },

      addEditableIcon: function(columnDefinition, is_editable) {
        /* This uses Slickgrid.HeaderButtons plugin to add an icon to the
        columns headers. Instead of a button, an icon is created */
        let content = null;
        if(is_editable) {
          content = '<i class="fa fa-pencil-alt"></i>';
        }
        else {
          content = '<i class="fa fa-lock"></i>';
        }
        let button = {
          cssClass: 'editable-column-header-icon',
          content: content,
        };
        // Check for existing buttons
        if(!_.isUndefined(columnDefinition.header) &&
           !_.isUndefined(columnDefinition.header.buttons)) {
          columnDefinition.header.buttons.push(button);
        }
        else {
          columnDefinition.header = {
            buttons: [button],
          };
        }
      },

      isModalOpen: function(dialog_list) {
        /* check the modals inside the sqleditor are open or not */
        if(Array.isArray(dialog_list)) {
          for(let d of dialog_list) {
            try {
              if(alertify.dialog(d) && alertify.dialog(d).isOpen())
                return true;
            }
            catch (err) {
              // Do nothing
              console.warn(err.stack || err);
            }
          }
        }
        return false;
      },
    };
    return sqlEditorUtils;
  });
