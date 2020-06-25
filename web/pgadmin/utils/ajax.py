##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for dealing with AJAX."""

import datetime
import decimal

import simplejson as json
from flask import Response
from flask_babelex import gettext as _


class DataTypeJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime) \
                or hasattr(obj, 'isoformat'):
            return obj.isoformat()
        elif isinstance(obj, datetime.timedelta):
            return (datetime.datetime.min + obj).time().isoformat()
        if isinstance(obj, decimal.Decimal):
            return float(obj)

        return json.JSONEncoder.default(self, obj)


class ColParamsJSONDecoder(json.JSONDecoder):
    def decode(self, obj):
        retval = obj
        try:
            retval = json.JSONDecoder.decode(self, obj)
            if type(retval) == str:
                retval = obj
        except (ValueError, TypeError, KeyError):
            retval = obj

        return retval


def get_no_cache_header():
    """
    Prevent browser from caching data every time an
    http request is made.
    Returns: headers
    """
    headers = {}
    # HTTP 1.1.
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    headers["Pragma"] = "no-cache"  # HTTP 1.0.
    headers["Expires"] = "0"  # Proxies.
    return headers


def make_json_response(
        success=1, errormsg='', info='', result=None, data=None, status=200,
        encoding='utf-8'
):
    """Create a HTML response document describing the results of a request and
    containing the data."""
    doc = dict()
    doc['success'] = success
    doc['errormsg'] = errormsg
    doc['info'] = info
    doc['result'] = result
    doc['data'] = data

    return Response(
        response=json.dumps(doc, cls=DataTypeJSONEncoder,
                            separators=(',', ':'), encoding=encoding),
        status=status,
        mimetype="application/json",
        headers=get_no_cache_header()
    )


def make_response(response=None, status=200):
    """Create a JSON response handled by the backbone models."""
    return Response(
        response=json.dumps(
            response, cls=DataTypeJSONEncoder, separators=(',', ':')),
        status=status,
        mimetype="application/json",
        headers=get_no_cache_header()
    )


def internal_server_error(errormsg=''):
    """Create a response with HTTP status code 500 - Internal Server Error."""
    return make_json_response(
        status=500,
        success=0,
        errormsg=errormsg
    )


def forbidden(errmsg=''):
    """Create a response with HTTP status code 403 - Forbidden."""
    return make_json_response(
        status=403,
        success=0,
        errormsg=errmsg
    )


def unauthorized(errormsg=''):
    """Create a response with HTTP status code 401 - Unauthorized."""
    return make_json_response(
        status=401,
        success=0,
        errormsg=errormsg
    )


def bad_request(errormsg=''):
    """Create a response with HTTP status code 400 - Bad Request."""
    return make_json_response(
        status=400,
        success=0,
        errormsg=errormsg
    )


def precondition_required(errormsg=''):
    """Create a response with HTTP status code 428 - Precondition Required."""
    return make_json_response(
        status=428,
        success=0,
        errormsg=errormsg
    )


def success_return(message=''):
    """Create a response with HTTP status code 200 - OK."""
    return make_json_response(
        status=200,
        success=1,
        info=message
    )


def gone(errormsg=''):
    """Create a response with HTTP status code 410 - GONE."""
    return make_json_response(
        status=410,
        success=0,
        errormsg=errormsg
    )


def not_implemented(errormsg=_('Not implemented.'), info='',
                    result=None, data=None):
    """Create a response with HTTP status code 501 - Not Implemented."""
    return make_json_response(
        status=501,
        success=0,
        errormsg=errormsg,
        info=info,
        result=result,
        data=data
    )


def service_unavailable(errormsg=_("Service Unavailable"), info='',
                        result=None, data=None):
    """Create a response with HTTP status code 503 - Server Unavailable."""
    return make_json_response(
        status=503,
        success=0,
        errormsg=errormsg,
        info=info,
        result=result,
        data=data
    )
