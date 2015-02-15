##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for dealing with AJAX."""

import json

def make_json_result(success=1, errormsg='', info='', result={}, data={}):
    """Create a JSON response document describing the results of a request and
    containing the data."""
    doc = { }
    doc['success'] = success
    doc['errormsg'] = errormsg
    doc['info'] = info
    doc['result'] = result
    doc['data'] = data

    return json.dumps(doc)