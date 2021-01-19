##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Directory comparison"""

import copy
import string
from pgadmin.tools.schema_diff.model import SchemaDiffModel
from flask import current_app
from pgadmin.utils.preferences import Preferences

count = 1

list_keys_array = ['name', 'colname', 'argid', 'token', 'option', 'conname',
                   'member_name', 'label', 'attname', 'fdwoption',
                   'fsrvoption', 'umoption']


def _get_source_list(**kwargs):
    """
    Get only source list.
    :param kwargs
    :return: list of source dict.
    """
    added = kwargs.get('added')
    source_dict = kwargs.get('source_dict')
    node = kwargs.get('node')
    source_params = kwargs.get('source_params')
    view_object = kwargs.get('view_object')
    node_label = kwargs.get('node_label')
    group_name = kwargs.get('group_name')
    source_schema_name = kwargs.get('source_schema_name')
    target_schema = kwargs.get('target_schema')

    global count
    source_only = []
    for item in added:
        source_object_id = None
        if 'oid' in source_dict[item]:
            source_object_id = source_dict[item]['oid']

        if node == 'table':
            temp_src_params = copy.deepcopy(source_params)
            temp_src_params['tid'] = source_object_id
            temp_src_params['json_resp'] = False
            source_ddl = \
                view_object.get_sql_from_table_diff(**temp_src_params)
            temp_src_params.update({'target_schema': target_schema})
            diff_ddl = view_object.get_sql_from_table_diff(**temp_src_params)
            source_dependencies = \
                view_object.get_table_submodules_dependencies(
                    **temp_src_params)
        else:
            temp_src_params = copy.deepcopy(source_params)
            temp_src_params['oid'] = source_object_id
            # Provide Foreign Data Wrapper ID
            if 'fdwid' in source_dict[item]:
                temp_src_params['fdwid'] = source_dict[item]['fdwid']
            # Provide Foreign Server ID
            if 'fsid' in source_dict[item]:
                temp_src_params['fsid'] = source_dict[item]['fsid']

            source_ddl = view_object.get_sql_from_diff(**temp_src_params)
            temp_src_params.update({'target_schema': target_schema})
            diff_ddl = view_object.get_sql_from_diff(**temp_src_params)
            source_dependencies = view_object.get_dependencies(
                view_object.conn, source_object_id, where=None,
                show_system_objects=None, is_schema_diff=True)

        source_only.append({
            'id': count,
            'type': node,
            'label': node_label,
            'title': item,
            'oid': source_object_id,
            'status': SchemaDiffModel.COMPARISON_STATUS['source_only'],
            'source_ddl': source_ddl,
            'target_ddl': '',
            'diff_ddl': diff_ddl,
            'group_name': group_name,
            'dependencies': source_dependencies,
            'source_schema_name': source_schema_name
        })
        count += 1

    return source_only


def _delete_keys(temp_tgt_params):
    """
    Delete keys from temp target parameters.
    :param temp_tgt_params:
    :type temp_tgt_params:
    :return:
    """
    if 'gid' in temp_tgt_params:
        del temp_tgt_params['gid']
    if 'json_resp' in temp_tgt_params:
        del temp_tgt_params['json_resp']


def _get_target_list(removed, target_dict, node, target_params, view_object,
                     node_label, group_name):
    """
    Get only target list.
    :param removed: removed list.
    :param target_dict: target dict.
    :param node: node type.
    :param target_params: target parameters.
    :param view_object: view object for get sql.
    :param node_label: node label.
    :param group_name: group name.
    :return: list of target dict.
    """
    global count
    target_only = []
    for item in removed:
        target_object_id = None
        if 'oid' in target_dict[item]:
            target_object_id = target_dict[item]['oid']

        if node == 'table':
            temp_tgt_params = copy.deepcopy(target_params)
            temp_tgt_params['tid'] = target_object_id
            temp_tgt_params['json_resp'] = False
            target_ddl = view_object.get_sql_from_table_diff(**temp_tgt_params)
            _delete_keys(temp_tgt_params)
            diff_ddl = view_object.get_drop_sql(**temp_tgt_params)
        else:
            temp_tgt_params = copy.deepcopy(target_params)
            temp_tgt_params['oid'] = target_object_id
            # Provide Foreign Data Wrapper ID
            if 'fdwid' in target_dict[item]:
                temp_tgt_params['fdwid'] = target_dict[item]['fdwid']
            # Provide Foreign Server ID
            if 'fsid' in target_dict[item]:
                temp_tgt_params['fsid'] = target_dict[item]['fsid']

            target_ddl = view_object.get_sql_from_diff(**temp_tgt_params)
            temp_tgt_params.update(
                {'drop_sql': True})
            diff_ddl = view_object.get_sql_from_diff(**temp_tgt_params)

        target_only.append({
            'id': count,
            'type': node,
            'label': node_label,
            'title': item,
            'oid': target_object_id,
            'status': SchemaDiffModel.COMPARISON_STATUS['target_only'],
            'source_ddl': '',
            'target_ddl': target_ddl,
            'diff_ddl': diff_ddl,
            'group_name': group_name,
            'dependencies': []
        })
        count += 1

    return target_only


def _check_add_req_ids(source_dict, target_dict, key, temp_src_params,
                       temp_tgt_params):
    """
    Check for Foreign Data Wrapper ID and Foreign Server ID and update it
    in req parameters.
    :param source_dict: Source dict for compare schema.
    :param target_dict: Target dict for compare schema.
    :param key: Key for get obj.
    :param temp_src_params:
    :param temp_tgt_params:
    :return:
    """
    if 'fdwid' in source_dict[key]:
        temp_src_params['fdwid'] = source_dict[key]['fdwid']
        temp_tgt_params['fdwid'] = target_dict[key]['fdwid']
    # Provide Foreign Server ID
    if 'fsid' in source_dict[key]:
        temp_src_params['fsid'] = source_dict[key]['fsid']
        temp_tgt_params['fsid'] = target_dict[key]['fsid']


def get_source_target_oid(source_dict, target_dict, key):
    """
    Get source and target object ID.
    :param source_dict: Source schema diff data.
    :param target_dict: Target schema diff data.
    :param key: Key.
    :return: source and target object ID.
    """
    source_object_id = None
    target_object_id = None
    if 'oid' in source_dict[key]:
        source_object_id = source_dict[key]['oid']
        target_object_id = target_dict[key]['oid']

    return source_object_id, target_object_id


def _get_identical_and_different_list(intersect_keys, source_dict, target_dict,
                                      node, node_label, view_object,
                                      **kwargs):
    """
    get lists of identical and different keys list.
    :param intersect_keys:
    :param source_dict:
    :param target_dict:
    :param node:
    :param node_label:
    :param view_object:
    :param other_param:
    :return: return list of identical and different dict.
    """
    global count
    identical = []
    different = []
    dict1 = kwargs['dict1']
    dict2 = kwargs['dict2']
    ignore_keys = kwargs['ignore_keys']
    source_params = kwargs['source_params']
    target_params = kwargs['target_params']
    group_name = kwargs['group_name']
    target_schema = kwargs.get('target_schema')
    for key in intersect_keys:
        source_object_id, target_object_id = \
            get_source_target_oid(source_dict, target_dict, key)

        # Recursively Compare the two dictionary
        current_app.logger.debug(
            "Schema Diff: Source Dict: {0}".format(dict1[key]))
        current_app.logger.debug(
            "Schema Diff: Target Dict: {0}".format(dict2[key]))

        if are_dictionaries_identical(dict1[key], dict2[key], ignore_keys):
            identical.append({
                'id': count,
                'type': node,
                'label': node_label,
                'title': key,
                'oid': source_object_id,
                'source_oid': source_object_id,
                'target_oid': target_object_id,
                'status': SchemaDiffModel.COMPARISON_STATUS['identical'],
                'group_name': group_name,
                'dependencies': [],
                'source_scid': source_params['scid']
                if 'scid' in source_params else 0,
                'target_scid': target_params['scid']
                if 'scid' in target_params else 0,
            })
        else:
            if node == 'table':
                temp_src_params = copy.deepcopy(source_params)
                temp_tgt_params = copy.deepcopy(target_params)
                # Add submodules into the ignore keys so that directory
                # difference won't include those in added, deleted and changed
                sub_module = ['index', 'rule', 'trigger', 'compound_trigger']
                temp_ignore_keys = view_object.keys_to_ignore + sub_module

                diff_dict = directory_diff(
                    dict1[key], dict2[key],
                    ignore_keys=temp_ignore_keys,
                    difference={}
                )
                parse_acl(dict1[key], dict2[key], diff_dict)

                temp_src_params['tid'] = source_object_id
                temp_tgt_params['tid'] = target_object_id
                temp_src_params['json_resp'] = \
                    temp_tgt_params['json_resp'] = False

                source_ddl = \
                    view_object.get_sql_from_table_diff(**temp_src_params)
                diff_dependencies = \
                    view_object.get_table_submodules_dependencies(
                        **temp_src_params)
                target_ddl = \
                    view_object.get_sql_from_table_diff(**temp_tgt_params)
                diff_ddl = view_object.get_sql_from_submodule_diff(
                    source_params=temp_src_params,
                    target_params=temp_tgt_params,
                    source=dict1[key], target=dict2[key], diff_dict=diff_dict,
                    target_schema=target_schema)
            else:
                temp_src_params = copy.deepcopy(source_params)
                temp_tgt_params = copy.deepcopy(target_params)
                diff_dict = directory_diff(
                    dict1[key], dict2[key],
                    ignore_keys=view_object.keys_to_ignore, difference={}
                )
                parse_acl(dict1[key], dict2[key], diff_dict)

                temp_src_params['oid'] = source_object_id
                temp_tgt_params['oid'] = target_object_id
                # Provide Foreign Data Wrapper ID
                _check_add_req_ids(source_dict, target_dict, key,
                                   temp_src_params, temp_tgt_params)

                source_ddl = view_object.get_sql_from_diff(**temp_src_params)
                diff_dependencies = view_object.get_dependencies(
                    view_object.conn, source_object_id, where=None,
                    show_system_objects=None, is_schema_diff=True)
                target_ddl = view_object.get_sql_from_diff(**temp_tgt_params)
                temp_tgt_params.update(
                    {'data': diff_dict, 'target_schema': target_schema})
                diff_ddl = view_object.get_sql_from_diff(**temp_tgt_params)

            different.append({
                'id': count,
                'type': node,
                'label': node_label,
                'title': key,
                'oid': source_object_id,
                'source_oid': source_object_id,
                'target_oid': target_object_id,
                'status': SchemaDiffModel.COMPARISON_STATUS['different'],
                'source_ddl': source_ddl,
                'target_ddl': target_ddl,
                'diff_ddl': diff_ddl,
                'group_name': group_name,
                'dependencies': diff_dependencies
            })
        count += 1

    return identical, different


def compare_dictionaries(**kwargs):
    """
    This function will compare the two dictionaries.

    :param kwargs:
    :return:
    """
    view_object = kwargs.get('view_object')
    source_params = kwargs.get('source_params')
    target_params = kwargs.get('target_params')
    target_schema = kwargs.get('target_schema')
    group_name = kwargs.get('group_name')
    source_dict = kwargs.get('source_dict')
    target_dict = kwargs.get('target_dict')
    node = kwargs.get('node')
    node_label = kwargs.get('node_label')
    ignore_keys = kwargs.get('ignore_keys', None)
    source_schema_name = kwargs.get('source_schema_name')

    dict1 = copy.deepcopy(source_dict)
    dict2 = copy.deepcopy(target_dict)

    # Find the duplicate keys in both the dictionaries
    dict1_keys = set(dict1.keys())
    dict2_keys = set(dict2.keys())
    intersect_keys = dict1_keys.intersection(dict2_keys)

    # Add gid to the params
    source_params['gid'] = target_params['gid'] = 1

    # Keys that are available in source and missing in target.

    added = dict1_keys - dict2_keys

    source_only = _get_source_list(added=added, source_dict=source_dict,
                                   node=node, source_params=source_params,
                                   view_object=view_object,
                                   node_label=node_label,
                                   group_name=group_name,
                                   source_schema_name=source_schema_name,
                                   target_schema=target_schema)

    target_only = []
    # Keys that are available in target and missing in source.
    removed = dict2_keys - dict1_keys
    target_only = _get_target_list(removed, target_dict, node, target_params,
                                   view_object, node_label, group_name)

    pref = Preferences.module('schema_diff')
    ignore_owner = pref.preference('ignore_owner').get()
    # if ignore_owner if True then add all the possible owner keys to the
    # ignore keys.
    if ignore_owner:
        owner_keys = ['owner', 'eventowner', 'funcowner', 'fdwowner',
                      'fsrvowner', 'lanowner', 'relowner', 'seqowner',
                      'typowner', 'typeowner']
        ignore_keys = ignore_keys + owner_keys

    # Compare the values of duplicates keys.
    other_param = {
        "dict1": dict1,
        "dict2": dict2,
        "ignore_keys": ignore_keys,
        "source_params": source_params,
        "target_params": target_params,
        "group_name": group_name,
        "target_schema": target_schema
    }

    identical, different = _get_identical_and_different_list(
        intersect_keys, source_dict, target_dict, node, node_label,
        view_object, **other_param)

    return source_only + target_only + different + identical


def are_lists_identical(source_list, target_list, ignore_keys):
    """
    This function is used to compare two list.
    :param source_list:
    :param target_list:
    :param ignore_keys: ignore keys to compare
    :return:
    """
    if source_list is None or target_list is None or \
            len(source_list) != len(target_list):
        return False

    for index in range(len(source_list)):
        # Check the type of the value if it is an dictionary then
        # call are_dictionaries_identical() function.
        if isinstance(source_list[index], dict):
            if not are_dictionaries_identical(source_list[index],
                                              target_list[index],
                                              ignore_keys):
                return False
        else:
            if source_list[index] != target_list[index]:
                return False
    return True


def are_dictionaries_identical(source_dict, target_dict, ignore_keys):
    """
    This function is used to recursively compare two dictionaries with
    same keys.
    :param source_dict: source dict
    :param target_dict: target dict
    :param ignore_keys: ignore keys to compare
    :return:
    """
    pref = Preferences.module('schema_diff')
    ignore_whitespaces = pref.preference('ignore_whitespaces').get()

    src_keys = set(source_dict.keys())
    tar_keys = set(target_dict.keys())

    # Keys that are available in source and missing in target.
    src_only = src_keys - tar_keys
    # Keys that are available in target and missing in source.
    tar_only = tar_keys - src_keys

    # If number of keys are different in source and target then
    # return False
    if len(src_only) != len(tar_only):
        current_app.logger.debug("Schema Diff: Number of keys are different "
                                 "in source and target")
        return False

    # If number of keys are same but key is not present in target then
    # return False
    for key in src_only:
        if key not in tar_only:
            current_app.logger.debug(
                "Schema Diff: Number of keys are same but key is not"
                " present in target")
            return False

    for key in source_dict.keys():
        # Continue if key is available in ignore_keys
        if key in ignore_keys:
            continue

        if isinstance(source_dict[key], dict):
            if not are_dictionaries_identical(source_dict[key],
                                              target_dict[key],
                                              ignore_keys):
                return False
        elif isinstance(source_dict[key], list):
            # Sort the source and target list on the basis of
            # list key array.
            source_dict[key], target_dict[key] = sort_list(source_dict[key],
                                                           target_dict[key])
            # Compare the source and target lists
            if not are_lists_identical(source_dict[key], target_dict[key],
                                       ignore_keys):
                return False
        else:
            source_value = source_dict[key]
            target_value = target_dict[key]
            # Check if ignore whitespaces or not.
            source_value, target_value = check_for_ignore_whitespaces(
                ignore_whitespaces, source_value, target_value)

            # We need a proper solution as sometimes we observe that
            # source_value is '' and target_value is None or vice versa
            # in such situation we shown the comparison as different
            # which is wrong.
            if (source_value == '' and target_value is None) or \
                    (source_value is None and target_value == ''):
                continue

            if source_value != target_value:
                current_app.logger.debug(
                    "Schema Diff: Object name: '{0}', Source Value: '{1}', "
                    "Target Value: '{2}', Key: '{3}'".format(
                        source_dict['name'] if 'name' in source_dict else '',
                        source_value, target_value, key))
                return False

    return True


def check_for_ignore_whitespaces(ignore_whitespaces, source_value,
                                 target_value):
    """
    If ignore_whitespaces is True then check the source_value and
    target_value if of type string. If the values is of type string
    then using translate function ignore all the whitespaces.
    :param ignore_whitespaces: flag to check ignore whitespace.
    :param source_value: source schema diff value
    :param target_value: target schema diff value
    :return: return source and target values.
    """
    if ignore_whitespaces:
        if isinstance(source_value, str):
            source_value = source_value.translate(
                str.maketrans('', '', string.whitespace))
        if isinstance(target_value, str):
            target_value = target_value.translate(
                str.maketrans('', '', string.whitespace))

    return source_value, target_value


def directory_diff(source_dict, target_dict, ignore_keys=[], difference=None):
    """
    This function is used to recursively compare two dictionaries and
    return the difference.
    The difference is from source to target
    :param source_dict: source dict
    :param target_dict: target dict
    :param ignore_keys: ignore keys to compare
    :param difference:
    """

    difference = {} if difference is None else difference
    src_keys = set(source_dict.keys())
    tar_keys = set(target_dict.keys())

    # Keys that are available in source and missing in target.
    src_only = src_keys - tar_keys
    # Keys that are available in target and missing in source.
    tar_only = tar_keys - src_keys

    for key in source_dict.keys():
        added = []
        deleted = []
        updated = []
        source = None

        # ignore the keys if available.
        if key in ignore_keys:
            continue
        elif key in tar_only:
            if isinstance(target_dict[key], list):
                difference[key] = {}
                difference[key]['deleted'] = target_dict[key]
        elif key in src_only:
            # Source only values in the newly added list
            if isinstance(source_dict[key], list):
                difference[key] = {}
                difference[key]['added'] = source_dict[key]
        elif isinstance(source_dict[key], dict):
            directory_diff(source_dict[key], target_dict[key],
                           ignore_keys, difference)
        elif isinstance(source_dict[key], list):
            tmp_target = None
            tmp_list = [x for x in source_dict[key]
                        if isinstance(x, (list, dict))]

            if tmp_list:
                tmp_target = copy.deepcopy(target_dict[key])
                for index in range(len(source_dict[key])):
                    source = copy.deepcopy(source_dict[key][index])
                    if isinstance(source, list):
                        # TODO
                        pass
                    elif isinstance(source, dict):
                        # Check the above keys are exist in the dictionary
                        tmp_key = is_key_exists(list_keys_array, source)
                        if tmp_key is not None:
                            # Compare the two list by ignoring the keys.
                            compare_list_by_ignoring_keys(source, tmp_target,
                                                          added, updated,
                                                          tmp_key, ignore_keys)

                        difference[key] = {}
                        if len(added) > 0:
                            difference[key]['added'] = added
                        if len(updated) > 0:
                            difference[key]['changed'] = updated
                    elif target_dict[key] is None or \
                            (isinstance(target_dict[key], list) and
                             len(target_dict[key]) < index and
                             source != target_dict[key][index]):
                        difference[key] = source
                    elif isinstance(target_dict[key], list) and\
                            len(target_dict[key]) > index:
                        difference[key] = source
            elif len(source_dict[key]) > 0:
                difference[key] = source_dict[key]
            elif key in target_dict and isinstance(target_dict[key], list):
                # If no element in source dict then check for the element
                # is available in target and the type is of list.
                # Added such elements as a deleted.
                tmp_tar_list = [x for x in target_dict[key]
                                if isinstance(x, (list, dict))]
                if tmp_tar_list:
                    difference[key] = {'deleted': target_dict[key]}

            if isinstance(source, dict) and tmp_target and key in tmp_target \
                    and tmp_target[key] and len(tmp_target[key]) > 0:
                if isinstance(tmp_target[key], list) and \
                        isinstance(tmp_target[key][0], dict):
                    deleted = deleted + tmp_target[key]
                else:
                    deleted.append({key: tmp_target[key]})
                difference[key]['deleted'] = deleted
            elif tmp_target and isinstance(tmp_target, list):
                difference[key]['deleted'] = tmp_target

            # No point adding empty list into difference.
            if key in difference and len(difference[key]) == 0:
                difference.pop(key)
        else:
            if source_dict[key] != target_dict[key]:
                if (key == 'comment' or key == 'description') and \
                        source_dict[key] is None:
                    difference[key] = ''
                else:
                    difference[key] = source_dict[key]

    if len(src_only) == 0 and len(tar_only) > 0:
        for key in tar_only:
            if isinstance(target_dict[key], list):
                difference[key] = {}
                difference[key]['deleted'] = target_dict[key]

    return difference


def is_key_exists(key_list, target_dict):
    """
    This function is used to iterate the key list and check that key is
    present in the given dictionary
    :param key_list:
    :param target_dict:
    :return:
    """
    for key in key_list:
        if key in target_dict:
            return key

    return None


def _check_key_in_source_target(key, acl_keys, target, source):
    """
    Check if key is present in source if not then check it's present in target.
    :param key: key to be checked.
    :param acl_keys:  acl keys
    :param target: target object.
    :param source: source object.
    :return: return key.
    """
    if key is None:
        key = is_key_exists(acl_keys, target)
        if key is None:
            key = 'acl'
    elif key is not None and not isinstance(source[key], list):
        key = 'acl'

    return key


def parse_acl(source, target, diff_dict):
    """
    This function is used to parse acl.

    :param source: Source Dict
    :param target: Target Dict
    :param diff_dict: Difference Dict
    """
    acl_keys = ['datacl', 'relacl', 'typacl', 'pkgacl']
    key = is_key_exists(acl_keys, source)

    # If key is not found in source then check the key is available
    # in target.
    key = _check_key_in_source_target(key, acl_keys, target, source)

    tmp_source = source[key] if\
        key in source and source[key] is not None else []
    tmp_target = copy.deepcopy(target[key]) if\
        key in target and target[key] is not None else []

    diff = {'added': [], 'deleted': []}
    for acl in tmp_source:
        if acl in tmp_target:
            tmp_target.remove(acl)
        elif acl not in tmp_target:
            diff['added'].append(acl)
    diff['deleted'] = tmp_target

    # Update the key if there are some element in added or deleted
    # else remove that key from diff dict
    if len(diff['added']) > 0 or len(diff['deleted']) > 0:
        diff_dict.update({key: diff})
    elif key in diff_dict:
        diff_dict.pop(key)


def sort_list(source, target):
    """
    This function is used to sort the source and target list on the
    basis of key found in the source and target list.
    :param source:
    :param target:
    :return:
    """
    # Check the above keys are exist in the dictionary
    if source is not None and source and isinstance(source[0], dict):
        tmp_key = is_key_exists(list_keys_array, source[0])
        if tmp_key is not None:
            source = sorted(source, key=lambda k: k[tmp_key])

    # Check the above keys are exist in the dictionary
    if target is not None and target and isinstance(target[0], dict):
        tmp_key = is_key_exists(list_keys_array, target[0])
        if tmp_key is not None:
            target = sorted(target, key=lambda k: k[tmp_key])

    return source, target


def compare_list_by_ignoring_keys(source_list, target_list, added, updated,
                                  key, ignore_keys):
    """
    This function is used to compare the two list by ignoring the keys
    specified in ignore_keys.
    :param source_list:
    :param target_list:
    :param added:
    :param updated:
    :param key:
    :param ignore_keys:
    :return:
    """
    if isinstance(target_list, list) and target_list:
        tmp_target = None
        for item in target_list:
            if key in item and item[key] == source_list[key]:
                tmp_target = copy.deepcopy(item)

        if tmp_target is None:
            added.append(source_list)
        else:
            source_with_ignored_keys = copy.deepcopy(source_list)
            target_with_ignored_keys = copy.deepcopy(tmp_target)

            # Remove ignore keys from source and target before comparison
            _remove_keys(ignore_keys, source_with_ignored_keys,
                         target_with_ignored_keys)

            _compare_source_and_target(source_with_ignored_keys,
                                       target_with_ignored_keys, source_list,
                                       target_list, updated, tmp_target)
    else:
        added.append(source_list)


def _remove_keys(ignore_keys, source_with_ignored_keys,
                 target_with_ignored_keys):
    """
    Remove non required keys form both source and target object.
    :param ignore_keys: ignore keys list.
    :param source_with_ignored_keys: source keys list.
    :param target_with_ignored_keys: target keys list.
    :return: None
    """
    for ig_key in ignore_keys:
        if ig_key in source_with_ignored_keys:
            del source_with_ignored_keys[ig_key]
        if ig_key in target_with_ignored_keys:
            del target_with_ignored_keys[ig_key]


def _compare_source_and_target(source_with_ignored_keys,
                               target_with_ignored_keys, source_list,
                               target_list, updated, tmp_target):
    """
    Compare source and target keys
    :param source_with_ignored_keys:
    :param target_with_ignored_keys:
    :param source_list:
    :param target_list:
    :param updated:
    :param tmp_target:
    :return:
    """
    if source_with_ignored_keys != target_with_ignored_keys:
        updated.append(source_list)
        target_list.remove(tmp_target)
    elif source_with_ignored_keys == target_with_ignored_keys:
        target_list.remove(tmp_target)
