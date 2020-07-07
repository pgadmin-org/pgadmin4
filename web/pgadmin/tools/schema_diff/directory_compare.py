##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Directory comparison"""

import copy
import string
from pgadmin.tools.schema_diff.model import SchemaDiffModel

count = 1

list_keys_array = ['name', 'colname', 'argid', 'token', 'option', 'conname',
                   'member_name', 'label', 'attname']


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
    source_dict = kwargs.get('source_dict')
    target_dict = kwargs.get('target_dict')
    node = kwargs.get('node')
    node_label = kwargs.get('node_label')
    ignore_whitespaces = kwargs.get('ignore_whitespaces')
    ignore_keys = kwargs.get('ignore_keys', None)

    dict1 = copy.deepcopy(source_dict)
    dict2 = copy.deepcopy(target_dict)

    # Find the duplicate keys in both the dictionaries
    dict1_keys = set(dict1.keys())
    dict2_keys = set(dict2.keys())
    intersect_keys = dict1_keys.intersection(dict2_keys)

    # Add gid to the params
    source_params['gid'] = target_params['gid'] = 1

    # Keys that are available in source and missing in target.
    source_only = []
    added = dict1_keys - dict2_keys
    global count
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
            temp_src_params.update({
                'diff_schema': target_schema
            })
            diff_ddl = view_object.get_sql_from_table_diff(**temp_src_params)
        else:
            temp_src_params = copy.deepcopy(source_params)
            temp_src_params['oid'] = source_object_id
            source_ddl = view_object.get_sql_from_diff(**temp_src_params)
            temp_src_params.update({
                'diff_schema': target_schema
            })
            diff_ddl = view_object.get_sql_from_diff(**temp_src_params)

        source_only.append({
            'id': count,
            'type': node,
            'label': node_label,
            'title': item,
            'oid': source_object_id,
            'status': SchemaDiffModel.COMPARISON_STATUS['source_only'],
            'source_ddl': source_ddl,
            'target_ddl': '',
            'diff_ddl': diff_ddl
        })
        count += 1

    target_only = []
    # Keys that are available in target and missing in source.
    removed = dict2_keys - dict1_keys
    for item in removed:
        target_object_id = None
        if 'oid' in target_dict[item]:
            target_object_id = target_dict[item]['oid']

        if node == 'table':
            temp_tgt_params = copy.deepcopy(target_params)
            temp_tgt_params['tid'] = target_object_id
            temp_tgt_params['json_resp'] = False
            target_ddl = view_object.get_sql_from_table_diff(**temp_tgt_params)
            if 'gid' in temp_tgt_params:
                del temp_tgt_params['gid']
            if 'json_resp' in temp_tgt_params:
                del temp_tgt_params['json_resp']
            diff_ddl = view_object.get_drop_sql(**temp_tgt_params)
        else:
            temp_tgt_params = copy.deepcopy(target_params)
            temp_tgt_params['oid'] = target_object_id
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
            'diff_ddl': diff_ddl
        })
        count += 1

    # Compare the values of duplicates keys.
    identical = []
    different = []
    for key in intersect_keys:
        source_object_id = None
        target_object_id = None
        if 'oid' in source_dict[key]:
            source_object_id = source_dict[key]['oid']
            target_object_id = target_dict[key]['oid']

        # Recursively Compare the two dictionary
        if are_dictionaries_identical(dict1[key], dict2[key],
                                      ignore_whitespaces, ignore_keys):
            identical.append({
                'id': count,
                'type': node,
                'label': node_label,
                'title': key,
                'oid': source_object_id,
                'source_oid': source_object_id,
                'target_oid': target_object_id,
                'status': SchemaDiffModel.COMPARISON_STATUS['identical']
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
                target_ddl = \
                    view_object.get_sql_from_table_diff(**temp_tgt_params)
                diff_ddl = view_object.get_sql_from_submodule_diff(
                    source_params=temp_src_params,
                    target_params=temp_tgt_params,
                    target_schema=target_schema,
                    source=dict1[key], target=dict2[key], diff_dict=diff_dict,
                    ignore_whitespaces=ignore_whitespaces)
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
                source_ddl = view_object.get_sql_from_diff(**temp_src_params)
                target_ddl = view_object.get_sql_from_diff(**temp_tgt_params)
                temp_tgt_params.update(
                    {'data': diff_dict})
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
                'diff_ddl': diff_ddl
            })
        count += 1

    return source_only + target_only + different + identical


def are_lists_identical(source_list, target_list, ignore_whitespaces,
                        ignore_keys):
    """
    This function is used to compare two list.
    :param source_list:
    :param target_list:
    :param ignore_whitespaces: ignore whitespaces
    :param ignore_keys: ignore keys to compare
    :return:
    """
    if source_list is None or target_list is None or \
            len(source_list) != len(target_list):
        return False
    else:
        for index in range(len(source_list)):
            # Check the type of the value if it is an dictionary then
            # call are_dictionaries_identical() function.
            if type(source_list[index]) is dict:
                if not are_dictionaries_identical(source_list[index],
                                                  target_list[index],
                                                  ignore_whitespaces,
                                                  ignore_keys):
                    return False
            else:
                if source_list[index] != target_list[index]:
                    return False
    return True


def are_dictionaries_identical(source_dict, target_dict, ignore_whitespaces,
                               ignore_keys):
    """
    This function is used to recursively compare two dictionaries with
    same keys.
    :param source_dict: source dict
    :param target_dict: target dict
    :param ignore_whitespaces: If set to True then ignore whitespaces
    :param ignore_keys: ignore keys to compare
    :return:
    """

    src_keys = set(source_dict.keys())
    tar_keys = set(target_dict.keys())

    # Keys that are available in source and missing in target.
    src_only = src_keys - tar_keys
    # Keys that are available in target and missing in source.
    tar_only = tar_keys - src_keys

    # If number of keys are different in source and target then
    # return False
    if len(src_only) != len(tar_only):
        return False
    else:
        # If number of keys are same but key is not present in target then
        # return False
        for key in src_only:
            if key not in tar_only:
                return False

    for key in source_dict.keys():
        # Continue if key is available in ignore_keys
        if key in ignore_keys:
            continue

        if type(source_dict[key]) is dict:
            if not are_dictionaries_identical(source_dict[key],
                                              target_dict[key],
                                              ignore_whitespaces,
                                              ignore_keys):
                return False
        elif type(source_dict[key]) is list:
            # Sort the source and target list on the basis of
            # list key array.
            source_dict[key], target_dict[key] = sort_list(source_dict[key],
                                                           target_dict[key])
            # Compare the source and target lists
            if not are_lists_identical(source_dict[key], target_dict[key],
                                       ignore_whitespaces,
                                       ignore_keys):
                return False
        else:
            source_value = source_dict[key]
            target_value = target_dict[key]

            # If ignore_whitespaces is True then check the source_value and
            # target_value if of type string. If the values is of type string
            # then using translate function ignore all the whitespaces.
            if ignore_whitespaces:
                if isinstance(source_value, str):
                    source_value = source_value.translate(
                        str.maketrans('', '', string.whitespace))
                if isinstance(target_value, str):
                    target_value = target_value.translate(
                        str.maketrans('', '', string.whitespace))

            if source_value != target_value:
                return False

    return True


def directory_diff(source_dict, target_dict, ignore_keys=[], difference={}):
    """
    This function is used to recursively compare two dictionaries and
    return the difference.
    The difference is from source to target
    :param source_dict: source dict
    :param target_dict: target dict
    :param ignore_keys: ignore keys to compare
    :param difference:
    """

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
            if type(target_dict[key]) is list:
                difference[key] = {}
                difference[key]['deleted'] = target_dict[key]
        elif key in src_only:
            # Source only values in the newly added list
            if type(source_dict[key]) is list:
                difference[key] = {}
                difference[key]['added'] = source_dict[key]
        elif type(source_dict[key]) is dict:
            directory_diff(source_dict[key], target_dict[key],
                           ignore_keys, difference)
        elif type(source_dict[key]) is list:
            tmp_target = None
            tmp_list = list(filter(
                lambda x: type(x) == list or type(x) == dict, source_dict[key]
            ))

            if len(tmp_list) > 0:
                tmp_target = copy.deepcopy(target_dict[key])
                for index in range(len(source_dict[key])):
                    source = copy.deepcopy(source_dict[key][index])
                    if type(source) is list:
                        # TODO
                        pass
                    elif type(source) is dict:
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
                            (type(target_dict[key]) is list and
                             len(target_dict[key]) < index and
                             source != target_dict[key][index]):
                        difference[key] = source
                    elif type(target_dict[key]) is list and\
                            len(target_dict[key]) > index:
                        difference[key] = source
            elif len(source_dict[key]) > 0:
                difference[key] = source_dict[key]
            elif key in target_dict and type(target_dict[key]) is list:
                # If no element in source dict then check for the element
                # is available in target and the type is of list.
                # Added such elements as a deleted.
                tmp_tar_list = list(filter(
                    lambda x: type(x) == list or type(x) == dict,
                    target_dict[key]
                ))
                if len(tmp_tar_list):
                    difference[key] = {'deleted': target_dict[key]}

            if type(source) is dict and tmp_target and key in tmp_target and \
                    tmp_target[key] and len(tmp_target[key]) > 0:
                if type(tmp_target[key]) is list and \
                        type(tmp_target[key][0]) is dict:
                    deleted = deleted + tmp_target[key]
                else:
                    deleted.append({key: tmp_target[key]})
                difference[key]['deleted'] = deleted
            elif tmp_target and type(tmp_target) is list:
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
    if key is None:
        key = is_key_exists(acl_keys, target)
        if key is None:
            key = 'acl'
    elif key is not None and type(source[key]) != list:
        key = 'acl'

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
    if len(source) > 0 and type(source[0]) == dict:
        tmp_key = is_key_exists(list_keys_array, source[0])
        if tmp_key is not None:
            source = sorted(source, key=lambda k: k[tmp_key])

    # Check the above keys are exist in the dictionary
    if len(target) > 0 and type(target[0]) == dict:
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
    if type(target_list) is list and len(target_list) > 0:
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
            for ig_key in ignore_keys:
                if ig_key in source_with_ignored_keys:
                    del source_with_ignored_keys[ig_key]
                if ig_key in target_with_ignored_keys:
                    del target_with_ignored_keys[ig_key]

            if source_with_ignored_keys != target_with_ignored_keys:
                updated.append(source_list)
                target_list.remove(tmp_target)
            elif source_with_ignored_keys == target_with_ignored_keys:
                target_list.remove(tmp_target)
    else:
        added.append(source_list)
