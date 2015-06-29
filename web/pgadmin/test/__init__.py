##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for the Test module."""
MODULE_NAME = 'test'
from flask.ext.security import login_required
from flask import render_template, url_for
from flask.ext.babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.menu import MenuItem
from time import time, ctime

class TestModule(PgAdminModule):

    def get_own_menuitems(self):
        return {'file_items': [
            MenuItem(name='mnu_generate_test_html',
                     label=gettext('Generated Test HTML'),
                     priority=100,
                     url=url_for('test.generated')),
            MenuItem(name='mnu_test_alert',
                     label=gettext('Test Alert'),
                     priority=200,
                     url='#',
                     onclick='test_alert()'),
            MenuItem(name='mnu_test_confirm',
                     label=gettext('Test Confirm'),
                     priority=300,
                     url='#',
                     onclick='test_confirm()'),
            MenuItem(name='mnu_test_dialog',
                     label=gettext('Test Dialog'),
                     priority=400,
                     url='#',
                     onclick='test_dialog()'),
            MenuItem(name='mnu_test_prompt',
                     label=gettext('Test Prompt'),
                     priority=500,
                     url='#',
                     onclick='test_prompt()'),
            MenuItem(name='mnu_test_notifier',
                     label=gettext('Test Notifier'),
                     priority=600,
                     url='#',
                     onclick='test_notifier()')
        ]}

    def get_own_javascripts(self):
        return [ url_for('test.static', filename='js/test.js') ]

# Initialise the module
blueprint = TestModule(MODULE_NAME, __name__)

@blueprint.route("/generated")
@login_required
def generated():
    """Generate a simple test page to demonstrate that output can be rendered."""
    output = """
Today is <b>%s</b>
<br />
<i>This is Flask-generated HTML.</i>
<br /><br />
<a href="http://www.pgadmin.org/">%s v%s</a>""" % (ctime(time()), config.APP_NAME, config.APP_VERSION)
    return output
