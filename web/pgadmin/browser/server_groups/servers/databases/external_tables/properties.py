##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from gettext import gettext
from os import path

from pgadmin.browser.server_groups.servers.databases.external_tables import \
    map_execution_location
from pgadmin.utils.ajax import internal_server_error


class PropertiesException(Exception):
    def __init__(self, response_object, *args):
        super(PropertiesException, self).__init__(*args)
        self.response_object = response_object


class PropertiesTableNotFoundException(PropertiesException):
    def __init__(self, *args):
        super(PropertiesException, self).__init__(None, *args)


class Properties:
    def __init__(self, render_template, db_connection, sql_template_path):
        self.render_template = render_template
        self.db_connection = db_connection
        self.sql_template_path = sql_template_path

    def retrieve(self, table_oid):
        table_information_sql = self.render_template(
            template_name_or_list=path.join(self.sql_template_path,
                                            'get_table_information.sql'),
            table_oid=table_oid
        )

        (status, table_information_results) = \
            self.db_connection.execute_2darray(table_information_sql)
        if not status:
            raise PropertiesException(
                internal_server_error(table_information_results))
        if len(table_information_results['rows']) != 1:
            raise PropertiesTableNotFoundException()

        table_information_result = table_information_results['rows'][0]
        execute_on = map_execution_location(
            table_information_result['execlocation'])
        execute_on_text = self.translate_execute_on_text(execute_on)
        response = dict(
            name=table_information_result['name'],
            type=gettext('readable') if not table_information_result[
                'writable'] else gettext('writable'),
            format_type=table_information_result['pg_encoding_to_char'],
            format_options=table_information_result['fmtopts'],
            external_options=table_information_result['options'],
            command=table_information_result['command'],
            execute_on=execute_on_text,
        )
        return response

    @staticmethod
    def translate_execute_on_text(execute_on):
        if execute_on['type'] == 'host':
            return gettext('host {}').format(execute_on['value'])
        elif execute_on['type'] == 'per_host':
            return gettext('per host')
        elif execute_on['type'] == 'master_only':
            return gettext('master segment')
        elif execute_on['type'] == 'all_segments':
            return gettext('all segments')
        elif execute_on['type'] == 'segment':
            return gettext('{} segment').format(execute_on['value'])
        elif execute_on['type'] == 'segments':
            return gettext('{} segments').format(execute_on['value'])
