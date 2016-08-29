##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from werkzeug.exceptions import HTTPException
from werkzeug.http import HTTP_STATUS_CODES
from flask_babel import gettext as _
from flask import request

from pgadmin.utils.ajax import service_unavailable


class ConnectionLost(HTTPException):
    """
    Exception
    """

    def __init__(self, _server_id, _database_name, _conn_id):
        self.sid = _server_id
        self.db = _database_name
        self.conn_id = _conn_id
        HTTPException.__init__(self)

    @property
    def name(self):
        return HTTP_STATUS_CODES.get(505, 'Service Unavailable')

    def get_response(self, environ=None):
        return service_unavailable(
            _("Connection to the server has been lost!"),
            info="CONNECTION_LOST",
            data={
                'sid': self.sid,
                'database': self.db,
                'conn_id': self.conn_id
            }
        )
