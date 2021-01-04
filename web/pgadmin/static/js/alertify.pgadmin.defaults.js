/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'alertify', 'jquery', 'sources/utils',
], function(gettext, alertify, $, commonUtils) {
  alertify.defaults.transition = 'zoom';
  alertify.defaults.theme.ok = 'btn btn-primary fa fa-lg fa-check pg-alertify-button';
  alertify.defaults.theme.cancel = 'btn btn-secondary fa fa-lg fa-times pg-alertify-button';
  alertify.defaults.theme.input = 'form-control';
  alertify.defaults.closable = false;
  alertify.pgIframeDialog || alertify.dialog('pgIframeDialog', function() {
    var iframe;
    return {
      // dialog constructor function, this will be called when the user calls
      // alertify.pgIframeDialog(message)
      main: function(message) {
        //set the videoId setting and return current instance for chaining.
        return this.set({
          'pg_msg': message,
        });
      },
      // we only want to override two options (padding and overflow).
      setup: function() {
        return {
          options: {
            // Disable both padding and overflow control.
            padding: !1,
            overflow: !1,
            closable: true,
          },
        };
      },
      // This will be called once the DOM is ready and will never be invoked
      // again. Here we create the iframe to embed the video.
      build: function() {
        // create the iframe element
        iframe = document.createElement('iframe');

        iframe.src = '';
        iframe.frameBorder = 'no';
        iframe.width = '100%';
        iframe.height = '100%';

        // add it to the dialog
        this.elements.content.appendChild(iframe);

        //give the dialog initial height (half the screen height).
        this.elements.body.style.minHeight = screen.height * .5 + 'px';
      },
      // dialog custom settings
      settings: {
        pg_msg: undefined,
      },
      // listen and respond to changes in dialog settings.
      settingUpdated: function(key, oldValue, newValue) {
        if(key === 'pg_msg') {
          let doc = iframe.contentWindow || iframe.contentDocument;
          if (doc.document) {
            doc = doc.document;
          }

          doc.open();
          doc.write(newValue);
          doc.close();
        }
      },
      // listen to internal dialog events.
      hooks: {
        // triggered when a dialog option gets update.
        // warning! this will not be triggered for settings updates.
        onupdate: function(option, oldValue, newValue) {
          if(option === 'resizable') {
            if (newValue) {
              this.elements.content.removeAttribute('style');
              iframe && iframe.removeAttribute('style');
            } else {
              this.elements.content.style.minHeight = 'inherit';
              iframe && (iframe.style.minHeight = 'inherit');
            }
          }
        },
      },
    };
  });
  alertify.pgNotifier = function(type, xhr, promptmsg, onJSONResult) {
    var msg = xhr.responseText,
      contentType = xhr.getResponseHeader('Content-Type');

    if (xhr.status == 0) {
      msg = gettext('Connection to the server has been lost.');
      promptmsg = gettext('Connection Lost');
    } else {
      if (contentType) {
        try {
          if (contentType.indexOf('application/json') == 0) {
            var resp = JSON.parse(msg);

            if(resp.info == 'CRYPTKEY_MISSING') {
              var pgBrowser = window.pgAdmin.Browser;
              pgBrowser.set_master_password('', ()=> {
                if(onJSONResult && typeof(onJSONResult) == 'function') {
                  onJSONResult('CRYPTKEY_SET');
                }
              });
              return;
            } else if (resp.result != null && (!resp.errormsg || resp.errormsg == '') &&
              onJSONResult && typeof(onJSONResult) == 'function') {
              return onJSONResult(resp.result);
            }
            msg = _.escape(resp.result) || _.escape(resp.errormsg) || 'Unknown error';
          }
          if (contentType.indexOf('text/html') == 0) {
            var alertMessage = promptmsg;
            if (type === 'error') {
              alertMessage =
                  '<div class="media text-danger text-14">'
                  +  '<div class="media-body media-middle">'
                  +    '<div class="alert-text" role="alert">' + promptmsg + '</div><br/>'
                  +    '<div class="alert-text" role="alert">' + gettext('Click for details.') + '</div>'
                  +  '</div>'
                  + '</div>';
            }

            alertify.notify(
              alertMessage, type, 0,
              function() {
                alertify.pgIframeDialog().show().set({
                  frameless: false,
                }).set(
                  'pg_msg', msg
                );
              });
            return;
          }
        } catch (e) {
          alertify.alert().show().set('message', e.message).set(
            'title', 'Error'
          ).set('closable', true);
        }
      }
    }
    alertify.alert().show().set(
      'message', msg.replace(new RegExp(/\r?\n/, 'g'), '<br />')
    ).set('title', promptmsg).set('closable', true);
  };

  alertify.pgRespErrorNotify = (xhr, error, prefixMsg='') => {
    var contentType = xhr.getResponseHeader('Content-Type');
    if (xhr.status === 410) {
      const pgBrowser = window.pgAdmin.Browser;
      pgBrowser.report_error(gettext('Error: Object not found - %s.', xhr.statusText), xhr.responseJSON.errormsg);
    } else {
      try {
        if (xhr.status === 0) {
          error = gettext('Connection to the server has been lost.');
        } else {
          if(contentType){
            if(contentType.indexOf('application/json') >= 0) {
              var resp = JSON.parse(xhr.responseText);
              error = _.escape(resp.result) || _.escape(resp.errormsg) || gettext('Unknown error');
            }
          }
          if (contentType.indexOf('text/html') >= 0) {
            var alertMessage =
                   '<div class="media text-danger text-14">'
                   +  '<div class="media-body media-middle">'
                   +  '<div class="alert-text" role="alert">' + gettext('INTERNAL SERVER ERROR') + '</div><br/>'
                   +    '<div class="alert-text" role="alert">' + gettext('Click for details.') + '</div>'
                   +  '</div>'
                   + '</div>';

            alertify.notify(
              alertMessage, 'error', 0, () => {
                alertify.pgIframeDialog()
                  .show()
                  .set({frameless: false})
                  .set('pg_msg', xhr.responseText);
              }
            );
            return;
          }
        }
      }
      catch(e){
        error = e.message;
      }
      alertify.error(prefixMsg +' '+error);
    }
  };

  var alertifyDialogResized = function(stop) {
    var self = this;

    if (stop) {
      self.pgResizeRecursion = false;
    }

    if (self.pgResizeTimeout) {
      return;
    }

    self.pgResizeTimeout = setTimeout(
      function() {
        var $el = $(this.elements.dialog),
          w = $el.width(),
          elAttr = 'xs';

        this.pgResizeTimeout = null;

        /** Calculations based on https://getbootstrap.com/docs/4.1/layout/grid/#grid-options **/
        if (w < 480) {
          elAttr = 'xs';
        }
        if (w >= 480) {
          elAttr = 'sm';
        }
        if (w >= 768) {
          elAttr = 'md';
        }
        if (w >= 992) {
          elAttr = 'lg';
        }
        if (w >=1200) {
          elAttr = 'xl';
        }

        $el.attr('el', elAttr);
      }.bind(self),
      100
    );
  };

  var alertifyDialogStartResizing = function(start) {
    var self = this;

    if (start) {
      self.pgResizeRecursion = true;
    }

    setTimeout(
      function() {
        alertifyDialogResized.apply(self);

        if (self.pgResizeRecursion) {
          alertifyDialogStartResizing.apply(self, [false]);
        }
      }, 100
    );
  };

  alertify.pgDialogBuild = function() {
    this.set('onshow', function() {
      this.elements.dialog.classList.add('pg-el-container');
      $(this.elements.commands.close).attr('title', gettext('Close'));
      $(this.elements.commands.maximize).attr('title', gettext('Maximize'));
      $(this.elements.commands.close).attr('aria-label', gettext('Close'));
      $(this.elements.commands.maximize).attr('aria-label', gettext('Maximize'));
      alertifyDialogResized.apply(this, arguments);
      let _self = this;

      let cmds = Object.values(this.elements.commands);
      $(cmds).on('keydown', 'button', (event) => {
        if (event.shiftKey && event.keyCode == 9 && $(this).nextAll('button:not([disabled])').length == 0){
          let container = $(_self.elements.footer);
          commonUtils.findAndSetFocus(container.find('button:not([disabled]):last'));
        }
      });
    });
    this.set('onresize', alertifyDialogStartResizing.bind(this, true));
    this.set('onresized', alertifyDialogResized.bind(this, true));
    this.set('onmaximized', alertifyDialogResized);
    this.set('onrestored', alertifyDialogResized);

    /* Set the key to null if it is not defined
     * When Browser autofill drop down value is clicked it raises a keyup event
     * with undefined keyCode. The undefined keyCode matches the undefined key
     * of alertify and triggers the button
     */
    for(let i=0; i<this.__internal.buttons.length; i++) {
      if(_.isUndefined(this.__internal.buttons[i]['key'])) {
        this.__internal.buttons[i]['key'] = null;
      }
    }
    let self = this;

    $(this.elements.footer).on('keydown', 'button', function(event) {
      if (!event.shiftKey && event.keyCode == 9 && $(this).nextAll('button:not([disabled])').length == 0) {
        // set focus back to first editable input element of current active tab once we cycle through all enabled buttons.
        commonUtils.findAndSetFocus($(self.elements.dialog));
        return false;
      }
    });
  };

  alertify.pgHandleItemError = function(xhr, error, message, args) {
    var pgBrowser = window.pgAdmin.Browser;

    if (!xhr || !pgBrowser) {
      return;
    }

    var contentType = xhr.getResponseHeader('Content-Type'),
      jsonResp = contentType &&
      contentType.indexOf('application/json') == 0 &&
      JSON.parse(xhr.responseText);

    if (
      jsonResp && (
        xhr.status == 503 ? (
          jsonResp.info == 'CONNECTION_LOST' &&
          'server' in args.info && jsonResp.data.sid >= 0 &&
          jsonResp.data.sid == args.info.server._id
        ) : (
          xhr.status == 428 &&
          jsonResp.errormsg &&
          jsonResp.errormsg == gettext('Connection to the server has been lost.')
        )
      )
    ) {
      if (
        args.preHandleConnectionLost &&
        typeof(args.preHandleConnectionLost) == 'function'
      ) {
        args.preHandleConnectionLost.apply(this, arguments);
      }

      // Check the status of the maintenance server connection.
      var server = pgBrowser.Nodes['server'],
        ctx = {
          resp: jsonResp,
          xhr: xhr,
          args: args,
        },
        reconnectServer = function() {
          var ctx_local = this,
            onServerConnect = function(_sid, _i, _d) {
              // Yay - server is reconnected.
              if (this.args.info.server._id == _sid) {
                pgBrowser.Events.off(
                  'pgadmin:server:connected', onServerConnect
                );
                pgBrowser.Events.off(
                  'pgadmin:server:connect:cancelled', onConnectCancel
                );

                // Do we need to connect the disconnected server now?
                if (
                  this.resp.data.database &&
                  this.resp.data.database != _d.db
                ) {
                  // Server is connected now, we will need to inform the
                  // database to connect it now.
                  pgBrowser.Events.trigger(
                    'pgadmin:database:connection:lost', this.args.item,
                    this.resp, true
                  );
                }
              }
            }.bind(ctx_local),
            onConnectCancel = function(_sid, _item, _data) {
              // User has cancelled the operation in between.
              if (_sid == this.args.info.server.id) {
                pgBrowser.Events.off('pgadmin:server:connected', onServerConnect);
                pgBrowser.Events.off('pgadmin:server:connect:cancelled', onConnectCancel);

                // Connection to the database will also be cancelled
                pgBrowser.Events.trigger(
                  'pgadmin:database:connect:cancelled', _sid,
                  this.resp.data.database || _data.db, _item, _data
                );
              }
            }.bind(ctx_local);

          pgBrowser.Events.on('pgadmin:server:connected', onServerConnect);
          pgBrowser.Events.on('pgadmin:server:connect:cancelled', onConnectCancel);

          // Connection to the server has been lost, we need to inform the
          // server first to take the action first.
          pgBrowser.Events.trigger(
            'pgadmin:server:connection:lost', this.args.item, this.resp
          );
        }.bind(ctx);

      $.ajax({
        url: server.generate_url(
          null, 'connect', args.info.server, true, args.info
        ),
        dataType: 'json',
      })
        .done(function(res) {
          if (res.success && 'connected' in res.data) {
            if (res.data.connected) {
            // Server is connected, but - the connection with the
            // particular database has been lost.
              pgBrowser.Events.trigger(
                'pgadmin:database:connection:lost', args.item, jsonResp
              );
              return;
            }
          }

          // Serever was not connected, we should first try to connect
          // the server.
          reconnectServer();
        })
        .fail(function() {
          reconnectServer();
        });
      return true;
    } else if (jsonResp && jsonResp.info == 'CRYPTKEY_MISSING' && xhr.status == 503) {
      /* Suppress the error here and handle in Alertify.pgNotifier wherever
       * required, as it has callback option
       */
      return false;
    }
    return false;
  };

  var alertifySuccess = alertify.success,
    alertifyError = alertify.error,
    alertifyWarning = alertify.warning;

  /*
  For adding the jasmine test cases, we needed to refer the original success,
   and error functions, as orig_success and orig_error respectively.
  */
  _.extend(alertify, {
    orig_success: alertifySuccess,
    orig_error: alertifyError,
    orig_warning: alertifyWarning,
  });

  _.extend(alertify, {
    success: function(message, timeout, callback) {
      var alertMessage =
      `<div class="d-flex px-3 py-2">
        <div class="pr-2">
          <i class="fa fa-check" aria-hidden="true"></i>
        </div>
        <div class="alert-text-body" role="status">${message}</div>
      </div>`;
      return alertify.orig_success(alertMessage, timeout, callback);
    },
    error: function(message, timeout, callback) {
      var alertMessage =
      `<div class="d-flex px-3 py-2">
        <div class="pr-2">
          <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
        </div>
        <div class="alert-text-body" role="status">${message}</div>
      </div>`;
      return alertify.orig_error(alertMessage, timeout, callback);
    },
    info: function(message, timeout) {
      var alertMessage =
      `<div class="d-flex px-3 py-2">
        <div class="mr-3">
          <i class="fa fa-info-circle" aria-hidden="true"></i>
        </div>
        <div class="alert-text-body" role="status">${message}</div>
      </div>`;
      var alert = alertify.notify(alertMessage, timeout);
      return alert;
    },
    warning: function(message, timeout) {
      var alertMessage =
      `<div class="d-flex px-3 py-2">
        <div class="mr-3">
          <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
        </div>
        <div class="alert-text-body" role="status">${message}</div>
      </div>`;
      var alert = alertify.orig_warning(alertMessage, timeout);
      return alert;
    },
  });

  // Confirm dialogue: Set title attribute
  alertify.confirm().set({
    onshow:function() {
      $(this.elements.commands.close).attr('title', gettext('Close'));
      $(this.elements.commands.maximize).attr('title', gettext('Maximize'));
      $(this.elements.content).addClass('ajs-wrap-text');
      $(this.elements.header).attr('id', 'confirm-dialog-header');
      $(this.elements.body).attr('id', 'confirm-dialog-body');
      $(this.elements.dialog).attr({
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'confirm-dialog-header',
        'aria-describedby': 'confirm-dialog-body',
      });
    },
    reverseButtons: true,
  });

  alertify.prompt().set({
    reverseButtons: true,
  });

  alertify.alert().set({
    onshow:function() {
      $(this.elements.header).attr('id', 'alert-dialog-header');
      $(this.elements.body).attr('id', 'alert-dialog-body');
      $(this.elements.modal).attr({
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'alert-dialog-header',
        'aria-describedby': 'alert-dialog-body',
      });
    },
  });

  /* Suppress the enter key events occurring from select2 boxes
   * so that the dialog does not close.
   * Alertify listens to keyup events on the body element unfortunately
   * instead of alertify dialog
   */
  $('body').off('keyup').on('keyup', function(ev){
    if(ev.which === 13 || ev.which === 27) {
      let suppressForClasses = ['select2-selection', 'select2-search__field'];
      let $el = $(ev.target);
      for(let i=0; i<suppressForClasses.length; i++){
        if($el.hasClass(suppressForClasses[i])){
          ev.preventDefault();
          ev.stopImmediatePropagation();
          ev.stopPropagation();
          break;
        }
      }
    }
  });
  return alertify;
});
