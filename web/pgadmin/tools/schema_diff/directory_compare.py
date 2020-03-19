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
from pgadmin.tools.schema_diff.model import SchemaDiffModel

count = 1


def compare_dictionaries(view_object, source_params, target_params,
                         target_schema, source_dict, target_dict, node,
                         node_label,
                         ignore_keys=None):
    """
    This function will compare the two dictionaries.

    :param view_object: View Object
    :param source_params: Source Parameters
    :param target_params: Target Parameters
    :param target_schema: Target Schema Name
    :param source_dict: First Dictionary
    :param target_dict: Second Dictionary
    :param node: node type
    :param node_label: node label
    :param ignore_keys: List of keys that will be ignored while comparing
    :return:
    """

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
        if node == 'table':
            temp_src_params = copy.deepcopy(source_params)
            temp_src_params['tid'] = source_dict[item]['oid']
            temp_src_params['json_resp'] = False
            source_ddl = \
                view_object.get_sql_from_table_diff(**temp_src_params)
            temp_src_params.update({
                'diff_schema': target_schema
            })
            diff_ddl = view_object.get_sql_from_table_diff(**temp_src_params)
        else:
            temp_src_params = copy.deepcopy(source_params)
            temp_src_params['oid'] = source_dict[item]['oid']
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
            'oid': source_dict[item]['oid'],
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
        if node == 'table':
            temp_tgt_params = copy.deepcopy(target_params)
            temp_tgt_params['tid'] = target_dict[item]['oid']
            temp_tgt_params['json_resp'] = False
            target_ddl = view_object.get_sql_from_table_diff(**temp_tgt_params)
            if 'gid' in temp_tgt_params:
                del temp_tgt_params['gid']
            if 'json_resp' in temp_tgt_params:
                del temp_tgt_params['json_resp']
            diff_ddl = view_object.get_drop_sql(**temp_tgt_params)
        else:
            temp_tgt_params = copy.deepcopy(target_params)
            temp_tgt_params['oid'] = target_dict[item]['oid']
            target_ddl = view_object.get_sql_from_diff(**temp_tgt_params)
            temp_tgt_params.update(
                {'drop_sql': True})
            diff_ddl = view_object.get_sql_from_diff(**temp_tgt_params)

        target_only.append({
            'id': count,
            'type': node,
            'label': node_label,
            'title': item,
            'oid': target_dict[item]['oid'],
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
        # Recursively Compare the two dictionary
        if are_dictionaries_identical(dict1[key], dict2[key], ignore_keys):
            identical.append({
                'id': count,
                'type': node,
                'label': node_label,
                'title': key,
                'oid': source_dict[key]['oid'],
                'source_oid': source_dict[key]['oid'],
                'target_oid': target_dict[key]['oid'],
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
                diff_dict.update(parce_acl(dict1[key], dict2[key]))

                temp_src_params['tid'] = source_dict[key]['oid']
                temp_tgt_params['tid'] = target_dict[key]['oid']
                temp_src_params['json_resp'] = \
                    temp_tgt_params['json_resp'] = False

                source_ddl = \
                    view_object.get_sql_from_table_diff(**temp_src_params)
                target_ddl = \
                    view_object.get_sql_from_table_diff(**temp_tgt_params)
                diff_ddl = view_object.get_sql_from_submodule_diff(
                    temp_src_params, temp_tgt_params, target_schema,
                    dict1[key], dict2[key], diff_dict)
            else:
                temp_src_params = copy.deepcopy(source_params)
                temp_tgt_params = copy.deepcopy(target_params)
                diff_dict = directory_diff(
                    dict1[key], dict2[key],
                    ignore_keys=view_object.keys_to_ignore, difference={}
                )
                diff_dict.update(parce_acl(dict1[key], dict2[key]))

                temp_src_params['oid'] = source_dict[key]['oid']
                temp_tgt_params['oid'] = target_dict[key]['oid']
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
                'oid': source_dict[key]['oid'],
                'source_oid': source_dict[key]['oid'],
                'target_oid': target_dict[key]['oid'],
                'status': SchemaDiffModel.COMPARISON_STATUS['different'],
                'source_ddl': source_ddl,
                'target_ddl': target_ddl,
                'diff_ddl': diff_ddl
            })
        count += 1

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
    else:
        for index in range(len(source_list)):
            # Check the type of the value if it is an dictionary then
            # call are_dictionaries_identical() function.
            if type(source_list[index]) is dict:
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
                                              target_dict[key], ignore_keys):
                return False
        elif type(source_dict[key]) is list:
            if not are_lists_identical(source_dict[key], target_dict[key],
                                       ignore_keys):
                return False
        else:
            if source_dict[key] != target_dict[key]:
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
            pass
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
                        tmp_key_array = ['name', 'colname', 'argid', 'token',
                                         'option']
                        # Check the above keys are exist in the dictionary
                        tmp_key = is_key_exists(tmp_key_array, source)
                        if tmp_key is not None:
                            if type(target_dict[key]) is list and \
                                    len(target_dict[key]) > 0:
                                tmp = None
                                for item in tmp_target:
                                    if tmp_key in item and \
                                            item[tmp_key] == \
                                            source[tmp_key]:
                                        tmp = copy.deepcopy(item)
                                if tmp and source != tmp:
                                    updated.append(copy.deepcopy(source))
                                    tmp_target.remove(tmp)
                                elif tmp and source == tmp:
                                    tmp_target.remove(tmp)
                                elif tmp is None:
                                    added.append(source)
                            else:
                                added.append(source)

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


def parce_acl(source, target):
    key = 'acl'

    if 'datacl' in source:
        key = 'datacl'
    elif 'relacl' in source:
        key = 'relacl'

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

    return {key: diff}
