##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for dealing with AJAX."""

from flask import jsonify
import json

def make_json_response(success=True, **kwargs):
    """Create a HTML response document describing the results of a request and
    containing the data."""
    response = kwargs.copy()
    response.setdefault('result', {})
    response.setdefault('data', {})
    return jsonify(response)
