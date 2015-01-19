##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# utils/views.py - Utility views
#
##########################################################################

import config
from flask import Blueprint
from time import time, ctime

# Initialise the module
blueprint = Blueprint('utils', __name__)

##########################################################################
# A test page
##########################################################################
@blueprint.route("/test")
def test():

    output = """
Today is <b>%s</b>
<br />
<i>This is Flask-generated HTML.</i>
<br /><br />
<a href="http://www.pgadmin.org/">%s v%s</a>""" % (ctime(time()), config.APP_NAME, config.APP_VERSION)

    return output

##########################################################################
# A special URL used to "ping" the server
##########################################################################
@blueprint.route("/ping")
def ping():
    return "PING"
