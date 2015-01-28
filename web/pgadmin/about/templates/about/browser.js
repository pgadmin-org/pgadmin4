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

function about_show() {
    if (!alertify.aboutDialog) {
        alertify.dialog('aboutDialog', function factory() {
            return {
                main:function(title, message) {
                    this.set('title', title);
                    this.message = message;
                },
                setup:function() {
                    return { 
                        buttons:[{ text: "OK", key: 27, className: "btn btn-primary" }],
                        focus: { element: 0 },
                        options: { modal: 0, overflow: false, resizable: true }
                    };
                },
                build:function() {
                    this.elements.body.style.minHeight = "450px";
                    this.elements.body.style.minWidth = "800px";
                },
                prepare:function() {
                    this.setContent(this.message);
                }
            }
        });
    }

    var content = '';
    $.get("{{ url_for('about.index') }}", 
        function(data) { 
            alertify.aboutDialog('About {{ config.APP_NAME }}', data);
        }
    );
    
}