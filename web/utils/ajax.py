##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for dealing with AJAX."""

from flask import Response
import json

def make_json_response(success=1, errormsg='', info='', result={}, data={}):
    """Create a HTML response document describing the results of a request and
    containing the data."""
    doc = { }
    doc['success'] = success
    doc['errormsg'] = errormsg
    doc['info'] = info
    doc['result'] = result
    doc['data'] = data

    response = Response(response=json.dumps(doc),
                        status=200,
                        mimetype="text/json")
    return response