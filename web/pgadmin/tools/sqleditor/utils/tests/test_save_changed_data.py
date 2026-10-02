##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import secrets

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import execute_query


class TestSaveChangedData(BaseTestGenerator):
    """ This class tests saving data changes to updatable query resultsets """
    scenarios = [
        ('When inserting new valid row', dict(
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "3",
                            "__temp_PK": "2",
                            "normal_col": "three",
                            "char_col": "char",
                            "bit_col": "10101"
                        }
                    }
                },
                "staged_rows": {},
                "deleted": {},
                "updated_index": {},
                "added_index": {"2": "2"},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=True,
            check_sql='SELECT * FROM %s WHERE pk_col = 3',
            check_result=[[3, "three", "char", "10101"]]
        )),
        ('When inserting row with long value for character varying data type',
         dict(
             save_payload={
                 "updated": {},
                 "added": {
                     "2": {
                         "err": False,
                         "data": {
                             "pk_col": "3",
                             "__temp_PK": "2",
                             "normal_col": "invalid-log-string"
                         }
                     }
                 },
                 "staged_rows": {},
                 "deleted": {},
                 "updated_index": {},
                 "added_index": {"2": "2"},
                 "columns": [{
                     "name": "pk_col",
                     "display_name": "pk_col",
                     "column_type": "[PK] integer",
                     "column_type_internal": "integer",
                     "pos": 0,
                     "label": "pk_col<br>[PK] integer",
                     "cell": "number",
                     "can_edit": True,
                     "type": "integer",
                     "not_null": True,
                     "has_default_val": False,
                     "is_array": False
                 }, {
                     "name": "normal_col",
                     "display_name": "normal_col",
                     "column_type": "character varying",
                     "column_type_internal": "character varying",
                     "pos": 1,
                     "label": "normal_col<br>character varying",
                     "cell": "string",
                     "can_edit": True,
                     "type": "character varying",
                     "not_null": False,
                     "has_default_val": False,
                     "is_array": False
                 }, {
                     "name": "char_col",
                     "display_name": "normal_col",
                     "column_type": "character",
                     "column_type_internal": "character",
                     "pos": 2,
                     "label": "char_col<br>character",
                     "cell": "string",
                     "can_edit": True,
                     "type": "character",
                     "not_null": False,
                     "has_default_val": False,
                     "is_array": False
                 }, {
                     "name": "bit_col",
                     "display_name": "bit_col",
                     "column_type": "bit",
                     "column_type_internal": "bit",
                     "pos": 3,
                     "label": "bit_col<br>bit",
                     "cell": "string",
                     "can_edit": True,
                     "type": "bit",
                     "not_null": False,
                     "has_default_val": False,
                     "is_array": False
                 }]
             },
             save_status=False,
             check_sql='SELECT * FROM %s WHERE pk_col = 3',
             check_result='SELECT 0')),
        ('When inserting row with long value for character data type', dict(
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "3",
                            "__temp_PK": "2",
                            "char_col": "invalid long string"
                        }
                    }
                },
                "staged_rows": {},
                "deleted": {},
                "updated_index": {},
                "added_index": {"2": "2"},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=False,
            check_sql='SELECT * FROM %s WHERE pk_col = 3',
            check_result='SELECT 0'
        )),
        ('When inserting row with long value for bit data type', dict(
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "3",
                            "__temp_PK": "2",
                            "bit_col": "1010101010"
                        }
                    }
                },
                "staged_rows": {},
                "deleted": {},
                "updated_index": {},
                "added_index": {"2": "2"},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=False,
            check_sql='SELECT * FROM %s WHERE pk_col = 3',
            check_result='SELECT 0'
        )),
        ('When inserting new invalid row', dict(
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "1",
                            "__temp_PK": "2",
                            "normal_col": "four"
                        }
                    }
                },
                "staged_rows": {},
                "deleted": {},
                "updated_index": {},
                "added_index": {"2": "2"},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=False,
            check_sql="SELECT * FROM %s "
                      "WHERE pk_col = 1 AND normal_col = 'four'",
            check_result='SELECT 0'
        )),
        ('When updating a row in a valid way', dict(
            save_payload={
                "updated": {
                    "1":
                        {"err": False,
                         "data": {"normal_col": "ONE"},
                         "primary_keys":
                             {"pk_col": 1}
                         }
                },
                "added": {},
                "staged_rows": {},
                "deleted": {},
                "updated_index": {"1": "1"},
                "added_index": {},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=True,
            check_sql='SELECT * FROM %s WHERE pk_col = 1',
            check_result=[[1, "ONE", 'ch1 ', '00000']]
        )),
        ('When updating a row with long data for character varying data type',
         dict(
             save_payload={
                 "updated": {
                     "1": {"err": False,
                           "data": {"normal_col": "INVALID-COL-LENGTH"},
                           "primary_keys": {"pk_col": 1}
                           }
                 },
                 "added": {},
                 "staged_rows": {},
                 "deleted": {},
                 "updated_index": {"1": "1"},
                 "added_index": {},
                 "columns": [{
                     "name": "pk_col",
                     "display_name": "pk_col",
                     "column_type": "[PK] integer",
                     "column_type_internal": "integer",
                     "pos": 0,
                     "label": "pk_col<br>[PK] integer",
                     "cell": "number",
                     "can_edit": True,
                     "type": "integer",
                     "not_null": True,
                     "has_default_val": False,
                     "is_array": False
                 }, {
                     "name": "normal_col",
                     "display_name": "normal_col",
                     "column_type": "character varying",
                     "column_type_internal": "character varying",
                     "pos": 1,
                     "label": "normal_col<br>character varying",
                     "cell": "string",
                     "can_edit": True,
                     "type": "character varying",
                     "not_null": False,
                     "has_default_val": False,
                     "is_array": False
                 }, {
                     "name": "char_col",
                     "display_name": "normal_col",
                     "column_type": "character",
                     "column_type_internal": "character",
                     "pos": 2,
                     "label": "char_col<br>character",
                     "cell": "string",
                     "can_edit": True,
                     "type": "character",
                     "not_null": False,
                     "has_default_val": False,
                     "is_array": False
                 }, {
                     "name": "bit_col",
                     "display_name": "bit_col",
                     "column_type": "bit",
                     "column_type_internal": "bit",
                     "pos": 3,
                     "label": "bit_col<br>bit",
                     "cell": "string",
                     "can_edit": True,
                     "type": "bit",
                     "not_null": False,
                     "has_default_val": False,
                     "is_array": False
                 }]
             },
             save_status=False,
             check_sql='SELECT * FROM %s WHERE pk_col = 1',
             check_result=[[1, "one", 'ch1 ', '00000']]
         )),
        ('When updating a row with long data for character data type',
         dict(
             save_payload={
                 "updated": {
                     "1":
                         {"err": False,
                          "data": {"char_col": "INVALID-COL-LENGTH"},
                          "primary_keys":
                              {"pk_col": 1}
                          }
                 },
                 "added": {},
                 "staged_rows": {},
                 "deleted": {},
                 "updated_index": {"1": "1"},
                 "added_index": {},
                 "columns": [
                     {
                         "name": "pk_col",
                         "display_name": "pk_col",
                         "column_type": "[PK] integer",
                         "column_type_internal": "integer",
                         "pos": 0,
                         "label": "pk_col<br>[PK] integer",
                         "cell": "number",
                         "can_edit": True,
                         "type": "integer",
                         "not_null": True,
                         "has_default_val": False,
                         "is_array": False
                     }, {
                         "name": "normal_col",
                         "display_name": "normal_col",
                         "column_type": "character varying",
                         "column_type_internal": "character varying",
                         "pos": 1,
                         "label": "normal_col<br>character varying",
                         "cell": "string",
                         "can_edit": True,
                         "type": "character varying",
                         "not_null": False,
                         "has_default_val": False,
                         "is_array": False
                     }, {
                         "name": "char_col",
                         "display_name": "normal_col",
                         "column_type": "character",
                         "column_type_internal": "character",
                         "pos": 2,
                         "label": "char_col<br>character",
                         "cell": "string",
                         "can_edit": True,
                         "type": "character",
                         "not_null": False,
                         "has_default_val": False,
                         "is_array": False
                     }, {
                         "name": "bit_col",
                         "display_name": "bit_col",
                         "column_type": "bit",
                         "column_type_internal": "bit",
                         "pos": 3,
                         "label": "bit_col<br>bit",
                         "cell": "string",
                         "can_edit": True,
                         "type": "bit",
                         "not_null": False,
                         "has_default_val": False,
                         "is_array": False
                     }
                 ]
             },
             save_status=False,
             check_sql='SELECT * FROM %s WHERE pk_col = 1',
             check_result=[[1, "one", 'ch1 ', '00000']]
         )),
        ('When updating a row with long data for bit data type',
         dict(
             save_payload={
                 "updated": {
                     "1":
                         {"err": False,
                          "data": {"bit_col": "1010110101"},
                          "primary_keys":
                              {"pk_col": 1}
                          }
                 },
                 "added": {},
                 "staged_rows": {},
                 "deleted": {},
                 "updated_index": {"1": "1"},
                 "added_index": {},
                 "columns": [
                     {
                         "name": "pk_col",
                         "display_name": "pk_col",
                         "column_type": "[PK] integer",
                         "column_type_internal": "integer",
                         "pos": 0,
                         "label": "pk_col<br>[PK] integer",
                         "cell": "number",
                         "can_edit": True,
                         "type": "integer",
                         "not_null": True,
                         "has_default_val": False,
                         "is_array": False
                     }, {
                         "name": "normal_col",
                         "display_name": "normal_col",
                         "column_type": "character varying",
                         "column_type_internal": "character varying",
                         "pos": 1,
                         "label": "normal_col<br>character varying",
                         "cell": "string",
                         "can_edit": True,
                         "type": "character varying",
                         "not_null": False,
                         "has_default_val": False,
                         "is_array": False
                     }, {
                         "name": "char_col",
                         "display_name": "normal_col",
                         "column_type": "character",
                         "column_type_internal": "character",
                         "pos": 2,
                         "label": "char_col<br>character",
                         "cell": "string",
                         "can_edit": True,
                         "type": "character",
                         "not_null": False,
                         "has_default_val": False,
                         "is_array": False
                     }, {
                         "name": "bit_col",
                         "display_name": "bit_col",
                         "column_type": "bit",
                         "column_type_internal": "bit",
                         "pos": 3,
                         "label": "bit_col<br>bit",
                         "cell": "string",
                         "can_edit": True,
                         "type": "bit",
                         "not_null": False,
                         "has_default_val": False,
                         "is_array": False
                     }
                 ]
             },
             save_status=False,
             check_sql='SELECT * FROM %s WHERE pk_col = 1',
             check_result=[[1, "one", 'ch1 ', '00000']]
         )),
        ('When updating a row in an invalid way', dict(
            save_payload={
                "updated": {
                    "1":
                        {"err": False,
                         "data": {"pk_col": "1"},
                         "primary_keys":
                             {"pk_col": 2}
                         }
                },
                "added": {},
                "staged_rows": {},
                "deleted": {},
                "updated_index": {"1": "1"},
                "added_index": {},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=False,
            check_sql="SELECT * FROM %s "
                      "WHERE pk_col = 1 AND normal_col = 'two'",
            check_result='SELECT 0'
        )),
        ('When deleting a row', dict(
            save_payload={
                "updated": {},
                "added": {},
                "staged_rows": {"1": {"pk_col": 2}},
                "deleted": {"1": {"pk_col": 2}},
                "updated_index": {},
                "added_index": {},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=True,
            check_sql='SELECT * FROM %s WHERE pk_col = 2',
            check_result='SELECT 0'
        )),
    ]

    def setUp(self):
        self._initialize_database_connection()
        self._initialize_query_tool()
        self._initialize_urls_and_select_sql()

    def runTest(self):
        self._create_test_table()
        self._execute_sql_query(self.select_sql)
        self._save_changed_data()
        self._check_saved_data()

    def tearDown(self):
        # Close query tool
        self._close_query_tool()
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def _execute_sql_query(self, query):
        is_success, response_data = \
            execute_query(tester=self.tester,
                          query=query,
                          start_query_tool_url=self.start_query_tool_url,
                          poll_url=self.poll_url)
        self.assertEqual(is_success, True)
        return response_data

    def _save_changed_data(self):
        # Send a request to save changed data
        response = self.tester.post(self.save_url,
                                    data=json.dumps(self.save_payload),
                                    content_type='html/json')

        self.assertEqual(response.status_code, 200)

        # Check that the save is successful
        response_data = json.loads(response.data.decode('utf-8'))
        save_status = response_data['data']['status']
        self.assertEqual(save_status, self.save_status)

    def _check_saved_data(self):
        check_sql = self.check_sql % self.test_table_name
        response_data = self._execute_sql_query(check_sql)
        # Check table for updates
        result = response_data['data']['result']
        self.assertEqual(result, self.check_result)

    def _initialize_database_connection(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]

        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        driver_version = utils.get_driver_version()
        driver_version = float('.'.join(driver_version.split('.')[:2]))

        if driver_version < 2.8:
            self.skipTest('Updatable resultsets require pyscopg 2.8 or later')

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

    def _initialize_query_tool(self):
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps({
            "dbname": self.db_name
        }))
        self.assertEqual(response.status_code, 200)

    def _initialize_urls_and_select_sql(self):
        self.start_query_tool_url = \
            '/sqleditor/query_tool/start/{0}'.format(self.trans_id)
        self.save_url = '/sqleditor/save/{0}'.format(self.trans_id)
        self.poll_url = '/sqleditor/poll/{0}'.format(self.trans_id)

    def _create_test_table(self):
        self.test_table_name = "test_for_save_data" + \
                               str(secrets.choice(range(1000, 9999)))
        create_sql = """
                            DROP TABLE IF EXISTS "%s";

                            CREATE TABLE "%s"(
                            pk_col	INT PRIMARY KEY,
                            normal_col character varying(5),
                            char_col character(4),
                            bit_col bit(5));

                            INSERT INTO "%s" VALUES
                            (1, 'one', 'ch1', '00000'),
                            (2, 'two', 'ch2', '11111');
                      """ % (self.test_table_name,
                             self.test_table_name,
                             self.test_table_name)
        self.select_sql = 'SELECT * FROM %s;' % self.test_table_name

        utils.create_table_with_query(self.server, self.db_name, create_sql)

    def _close_query_tool(self):
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)


class TestSaveAddedRowSkipsNonEditableColumn(TestSaveChangedData):
    """Regression test for issue #9939.

    When a Query Tool result includes an expression or alias column
    (e.g. ``first_name || ' ' || last_name AS the_name``), the alias is
    not a real column of the underlying table. The new-row save flow
    must drop those keys before rendering INSERT; otherwise PostgreSQL
    rejects the row with ``column "the_name" does not exist``.
    """

    scenarios = [
        ('Insert via SELECT that aliases a concatenation', dict(
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "id": "1",
                            "__temp_PK": "2",
                            "first_name": "John",
                            "last_name": "Doe",
                            # The client populates every column when
                            # building a new row. ``the_name`` is the
                            # aliased expression — sending it must not
                            # break the INSERT.
                            "the_name": None
                        }
                    }
                },
                "staged_rows": {},
                "deleted": {},
                "updated_index": {},
                "added_index": {"2": "2"},
                "columns": [
                    {"name": "id", "pos": 0, "can_edit": True,
                     "type": "integer", "cell": "number",
                     "not_null": True, "has_default_val": False,
                     "is_array": False, "display_name": "id"},
                    {"name": "first_name", "pos": 1, "can_edit": True,
                     "type": "text", "cell": "string",
                     "not_null": False, "has_default_val": False,
                     "is_array": False, "display_name": "first_name"},
                    {"name": "last_name", "pos": 2, "can_edit": True,
                     "type": "text", "cell": "string",
                     "not_null": False, "has_default_val": False,
                     "is_array": False, "display_name": "last_name"},
                    {"name": "the_name", "pos": 3, "can_edit": False,
                     "type": "text", "cell": "string",
                     "not_null": False, "has_default_val": False,
                     "is_array": False, "display_name": "the_name"},
                ]
            },
            save_status=True,
            check_sql='SELECT id, first_name, last_name '
                      'FROM %s WHERE id = 1',
            check_result=[[1, "John", "Doe"]]
        )),
    ]

    def _create_test_table(self):
        self.test_table_name = "test_for_save_data_alias_" + \
                               str(secrets.choice(range(1000, 9999)))
        create_sql = """
            DROP TABLE IF EXISTS "{0}";

            CREATE TABLE "{0}"(
                id INT PRIMARY KEY,
                first_name TEXT,
                last_name TEXT
            );
        """.format(self.test_table_name)
        self.select_sql = (
            "SELECT id, first_name, last_name, "
            "first_name || ' ' || last_name AS the_name "
            "FROM {0};"
        ).format(self.test_table_name)
        utils.create_table_with_query(self.server, self.db_name, create_sql)


def _generated_col_payload(updated=None, added=None):
    return {
        "updated": updated or {},
        "added": added or {},
        "staged_rows": {},
        "deleted": {},
        "updated_index": {k: k for k in (updated or {})},
        "added_index": {k: k for k in (added or {})},
        "columns": [
            {"name": "id", "pos": 0, "can_edit": True,
             "type": "integer", "cell": "number",
             "not_null": True, "has_default_val": False,
             "is_array": False, "display_name": "id"},
            {"name": "a", "pos": 1, "can_edit": True,
             "type": "integer", "cell": "number",
             "not_null": False, "has_default_val": False,
             "is_array": False, "display_name": "a"},
            {"name": "g", "pos": 2, "can_edit": False,
             "type": "integer", "cell": "number",
             "not_null": False, "has_default_val": True,
             "is_array": False, "display_name": "g"},
        ]
    }


class TestSaveChangedDataGeneratedColumns(TestSaveChangedData):
    """Regression test for issue #9672.

    Generated columns can't be written, so they must be left out of the
    INSERT and UPDATE, and an UPDATE must return their recalculated values
    so the grid can show them.
    """

    _insert = dict(
        save_payload=_generated_col_payload(added={
            "2": {"err": False, "data": {
                "id": "3", "__temp_PK": "2", "a": "5", "g": "999"}}
        }),
        save_status=True,
        check_sql='SELECT id, a, g FROM %s WHERE id = 3',
        check_result=[[3, 5, 10]]
    )
    _update = dict(
        save_payload=_generated_col_payload(updated={
            "1": {"err": False, "data": {"a": "7"},
                  "primary_keys": {"id": 1}}
        }),
        save_status=True,
        check_sql='SELECT id, a, g FROM %s WHERE id = 1',
        check_result=[[1, 7, 14]],
        expected_row_added=[{"1": {"g": 14}}]
    )
    _update_generated_only = dict(
        save_payload=_generated_col_payload(updated={
            "1": {"err": False, "data": {"g": "100"},
                  "primary_keys": {"id": 1}}
        }),
        save_status=True,
        check_sql='SELECT id, a, g FROM %s WHERE id = 1',
        check_result=[[1, 1, 2]],
        expected_row_added=[]
    )

    scenarios = [
        ('Insert a row into a table with a stored generated column',
         dict(_insert, generated_kind='STORED')),
        ('Update a row in a table with a stored generated column',
         dict(_update, generated_kind='STORED')),
        ('Update only a stored generated column',
         dict(_update_generated_only, generated_kind='STORED')),
        ('Insert a row into a table with a virtual generated column',
         dict(_insert, generated_kind='VIRTUAL')),
        ('Update a row in a table with a virtual generated column',
         dict(_update, generated_kind='VIRTUAL')),
    ]

    def setUp(self):
        server_version = parent_node_dict["schema"][-1]["server_version"]
        if server_version < 120000:
            self.skipTest('Generated columns require PostgreSQL 12 or later')
        if self.generated_kind == 'VIRTUAL' and server_version < 180000:
            self.skipTest('Virtual generated columns require PostgreSQL 18 '
                          'or later')
        super().setUp()

    def _save_changed_data(self):
        response = self.tester.post(self.save_url,
                                    data=json.dumps(self.save_payload),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        response_data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(response_data['data']['status'], self.save_status)

        expected_row_added = getattr(self, 'expected_row_added', None)
        if expected_row_added is not None:
            row_added = [
                qr['row_added']
                for qr in response_data['data']['query_results']
                if qr['row_added'] is not None
            ]
            self.assertEqual(row_added, expected_row_added)

    def _create_test_table(self):
        self.test_table_name = "test_for_save_data_generated_" + \
                               str(secrets.choice(range(1000, 9999)))
        create_sql = """
            DROP TABLE IF EXISTS "{0}";

            CREATE TABLE "{0}"(
                id INT PRIMARY KEY,
                a INT,
                g INT GENERATED ALWAYS AS (a * 2) {1}
            );

            INSERT INTO "{0}" (id, a) VALUES (1, 1), (2, 2);
        """.format(self.test_table_name, self.generated_kind)
        self.select_sql = 'SELECT * FROM "{0}";'.format(self.test_table_name)
        utils.create_table_with_query(self.server, self.db_name, create_sql)
