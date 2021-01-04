##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask_babelex import gettext


class SchemaDiffModel(object):
    """
    SchemaDiffModel
    """

    COMPARISON_STATUS = {
        'source_only': 'Source Only',
        'target_only': 'Target Only',
        'different': 'Different',
        'identical': 'Identical'
    }

    def __init__(self, **kwargs):
        """
        This method is used to initialize the class and
        create a proper object name which will be used
        to fetch the data using namespace name and object name.

        Args:
            **kwargs : N number of parameters
        """
        self._comparison_result = dict()
        self._comparison_msg = gettext('Comparision started...')
        self._comparison_percentage = 0

    def clear_data(self):
        """
        This function clear the model data.
        """
        self._comparison_result.clear()

    def set_result(self, node_name, compare_result):
        """
        This method set the result of the comparision based on nodes.
        """
        self._comparison_result[node_name] = compare_result

    def get_result(self, node_name=None):
        """
        This function will return the result for the node if specified
        else return the complete result.
        :param node_name: Name of the node ex: Database, Schema, etc..
        :return:
        """

        if node_name is not None:
            return self._comparison_result[node_name]

        return self._comparison_result

    def get_comparison_info(self):
        """
        This function is used to get the comparison information.
        :return:
        """
        return self._comparison_msg, self._comparison_percentage

    def set_comparison_info(self, msg, percentage):
        """
        This function is used to set the comparison information.
        :param msg:
        :param percentage:
        :return:
        """
        self._comparison_msg = msg
        self._comparison_percentage = percentage
