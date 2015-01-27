##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""
MODULE_NAME = 'test'

import config
from flask import Blueprint, render_template
from flask.ext.security import login_required
from time import time, ctime

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, static_folder='static',  static_url_path='', template_folder='templates', url_prefix='/' + MODULE_NAME)

##########################################################################
# A test page
##########################################################################
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
