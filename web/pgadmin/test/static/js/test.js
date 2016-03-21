define(
  ['jquery', 'alertify', 'pgadmin', 'pgadmin.node.server', 'pgadmin.node.server-group'],
  function($, alertify, pgAdmin, pgServer, ServerGroup) {
    pgAdmin = pgAdmin || window.pgAdmin || {};

    if (pgAdmin.Test)
      return pgAdmin.Test;

    pgAdmin.Test = {
      test_alert: function() {
          alertify.alert(
            'Alert Test',
            'This is a test alert from Alertify!'
            );
        },
      test_prompt: function() {
        var alert = alertify.prompt(
          'Prompt Test',
          'Enter a value to configure the application',
          'Enter a value',
          function(evt, value) { alertify.message('You entered: ' + value);},
          function(evt, value) { alertify.message('You cancelled');}
          );
        alert.show();
      },
      test_confirm: function() {
        alertify.confirm(
            'Confirm Test',
            'This is a confirmation message from Alertify!');
      },
      test_notifier: function() {
        alertify.notify(
            'Notifier Test',
            'success',
            5,
            function() { console.log('dismissed'); }
            );
      },
      test_dialog: function() {
        if (!alertify.myAlert) {
          alertify.dialog('myAlert', function factory() {
            return {
              main: function(title, message, data) {
                this.set('title', title);
                this.message = message;
                this.data = data;
              },
              setup:function() {
                return {
                  buttons: [
                    {text: "Cancel", key: 27, className: "btn btn-danger"}],
                  focus: { element: 0 },
                  options: { modal: 0, title: this.title }
                };
              },
              prepare:function() {
                this.setContent(this.message);
              },
              callback:function(closeEvent) {
                alertify.alert('Close Event', 'You pressed: ' + closeEvent.button.text + ' on ' + this.data);
              }
            }
          },
          true /* Transient */ );
        }

        alertify.myAlert('Dialog Test',
            'This is a test dialog from Alertify!', 'This is dialog 1');

        alertify.myAlert('Dialog Test 2',
            'This is another test dialog from Alertify!', 'This is dialog 2');
      },
      init: function() {
        if (this.initialized)
          return;

        this.initialized = true;

        // Add the alertify category
        pgAdmin.Browser.add_menu_category(
          'alertify', 'Alertify', 3, 'fa fa-film', true, true
          );

        pgServer.on(
          'server-connected', function() {
            console.log(arguments);
            console.log('Yay - we connected the server!');
          },
          {'a': 'test'});

        ServerGroup.on('browser-node.loaded', function() {
            console.log('I know that the server-group has been expanded!');
          }, pgAdmin.Test);

      }
    };

    return pgAdmin.Test;
});
