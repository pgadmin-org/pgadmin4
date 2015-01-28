{#
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
#}

function test_alert() {
    alertify.alert(
        'Alert Test',
        'This is a test alert from Alertify!'
    );
}

function test_prompt() {
    var alert = alertify.prompt(
        'Prompt Test',
        'Enter a value to configure the application', 
        'Enter a value', 
        function(evt, value) { alertify.message('You entered: ' + value);},
        function(evt, value) { alertify.message('You cancelled');}
    );
    alert.show();
}

function test_confirm() {
    alertify.confirm(
        'Confirm Test',
        'This is a confirmation message from Alertify!');
}

function test_notifier() {
    alertify.notify(
        'Notifier Test', 
        'success', 
        5, 
        function() { console.log('dismissed'); }
    );
}

function test_dialog() {
    if (!alertify.myAlert) {
        alertify.dialog('myAlert', function factory() {
            return {
                main:function(title, message, data) {
                    this.set('title', title);
                    this.message = message;
                    this.data = data;
                },
                setup:function() {
                    return { 
                        buttons:[{ text: "Cancel", key: 27, className: "btn btn-danger"}],
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
}