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

      let el_name = ev.target.name;
      if(el_name == 'key'){
        let $parentDiv = $el.closest('.value'),
          $nextField = $parentDiv.find('.shift .btn-checkbox');

        if ($nextField.length == 0) {
          $nextField = $el.closest('.value').next().find('input.form-control');
        }

        if ($nextField.length) {
          $nextField.focus();
          ev.preventDefault();
          ev.stopImmediatePropagation();
          ev.stopPropagation();
        }
      }
    }
  });
  return alertify;
});
