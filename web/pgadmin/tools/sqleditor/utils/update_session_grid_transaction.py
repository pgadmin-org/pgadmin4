##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update session with gridData."""
from flask import session


def update_session_grid_transaction(trans_id, data):
    if 'gridData' in session:
        grid_data = session['gridData']
        grid_data[str(trans_id)] = data
        session['gridData'] = grid_data
