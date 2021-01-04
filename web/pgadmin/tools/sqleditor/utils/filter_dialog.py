##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Code to handle data sorting in view data mode."""
import pickle
import simplejson as json
from flask_babelex import gettext
from flask import current_app
from pgadmin.utils.ajax import make_json_response, internal_server_error
from pgadmin.tools.sqleditor.utils.update_session_grid_transaction import \
    update_session_grid_transaction
from pgadmin.utils.exception import ConnectionLost, SSHTunnelConnectionLost
from pgadmin.utils.constants import ERROR_MSG_TRANS_ID_NOT_FOUND


class FilterDialog(object):
    @staticmethod
    def get(*args):
        """To fetch the current sorted columns"""
        status, error_msg, conn, trans_obj, session_obj = args
        if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
            return make_json_response(
                success=0,
                errormsg=error_msg,
                info='DATAGRID_TRANSACTION_REQUIRED',
                status=404
            )
        column_list = []
        if status and conn is not None and \
                trans_obj is not None and session_obj is not None:
            msg = gettext('Success')

            try:
                columns, column_list = \
                    trans_obj.get_all_columns_with_order(conn)
            except (ConnectionLost, SSHTunnelConnectionLost):
                raise
            except Exception as e:
                current_app.logger.error(e)
                raise

            sql = trans_obj.get_filter()
        else:
            status = False
            msg = error_msg
            columns = None
            sql = None

        return make_json_response(
            data={
                'status': status,
                'msg': msg,
                'result': {
                    'data_sorting': columns,
                    'column_list': column_list,
                    'sql': sql
                }
            }
        )

    @staticmethod
    def save(*args, **kwargs):
        """To save the sorted columns"""
        # Check the transaction and connection status
        status, error_msg, conn, trans_obj, session_obj = args
        trans_id = kwargs['trans_id']
        request = kwargs['request']

        if request.data:
            data = json.loads(request.data, encoding='utf-8')
        else:
            data = request.args or request.form

        if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
            return make_json_response(
                success=0,
                errormsg=error_msg,
                info='DATAGRID_TRANSACTION_REQUIRED',
                status=404
            )

        if status and conn is not None and \
           trans_obj is not None and session_obj is not None:
            trans_obj.set_data_sorting(data, True)
            status, res = trans_obj.set_filter(data.get('sql'))
            if status:
                # As we changed the transaction object we need to
                # restore it and update the session variable.
                session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
                update_session_grid_transaction(trans_id, session_obj)
                res = gettext('Data sorting object updated successfully')
        else:
            return internal_server_error(
                errormsg=gettext('Failed to update the data on server.')
            )

        return make_json_response(
            data={
                'status': status,
                'result': res
            }
        )
