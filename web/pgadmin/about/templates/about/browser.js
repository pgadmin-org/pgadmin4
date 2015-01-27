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
    BootstrapDialog.show({
        title: 'About {{ config.APP_NAME }}',
        message: $('<div></div>').load('{{ url_for('about.index') }}')});
}