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


def compare_dictionaries(source_dict, target_dict, node, node_label,
                         ignore_keys=None):
    """
    This function will compare the two dictionaries.

    :param source_dict: First Dictionary
    :param target_dict: Second Dictionary
    :param node: node type
    :param ignore_keys: List of keys that will be ignored while comparing
    :return:
    """

    dict1 = copy.deepcopy(source_dict)
    dict2 = copy.deepcopy(target_dict)

    # Find the duplicate keys in both the dictionaries
    dict1_keys = set(dict1.keys())
    dict2_keys = set(dict2.keys())
    intersect_keys = dict1_keys.intersection(dict2_keys)

    # Keys that are available in source and missing in target.
    source_only = []
    added = dict1_keys - dict2_keys
    global count
    for item in added:
        source_only.append({
            'id': count,
            'type': node,
            'label': node_label,
            'title': item,
            'oid': source_dict[item]['oid'],
            'status': SchemaDiffModel.COMPARISON_STATUS['source_only']
        })
        count += 1

    target_only = []
    # Keys that are available in target and missing in source.
    removed = dict2_keys - dict1_keys
    for item in removed:
        target_only.append({
            'id': count,
            'type': node,
            'label': node_label,
            'title': item,
            'oid': target_dict[item]['oid'],
            'status': SchemaDiffModel.COMPARISON_STATUS['target_only']
        })
        count += 1

    # Compare the values of duplicates keys.
    identical = []
    different = []
    for key in intersect_keys:
        # ignore the keys if available.
        for ig_key in ignore_keys:
            if ig_key in dict1[key]:
                dict1[key].pop(ig_key)
            if ig_key in dict2[key]:
                dict2[key].pop(ig_key)

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
            different.append({
                'id': count,
                'type': node,
                'label': node_label,
                'title': key,
                'oid': source_dict[key]['oid'],
                'source_oid': source_dict[key]['oid'],
                'target_oid': target_dict[key]['oid'],
                'status': SchemaDiffModel.COMPARISON_STATUS['different']
            })
        count += 1

    return source_only + target_only + different + identical


def are_lists_identical(source_list, target_list, ignore_keys):
    """
    This function is used to compare two list.
    :param source_list:
    :param target_list:
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
    :param source_dict:
    :param target_dict:
    :return:
    """

    src_keys = set(source_dict.keys())
    tar_keys = set(target_dict.keys())

    # ignore the keys if available.
    for ig_key in ignore_keys:
        if ig_key in src_keys:
            source_dict.pop(ig_key)
        if ig_key in target_dict:
            target_dict.pop(ig_key)

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
            target_only[key] = target_dict[key]
            # Target only values in deleted list
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
            for index in range(len(source_dict[key])):
                source = copy.deepcopy(source_dict[key][index])
                if type(source) is list:
                    # TODO
                    pass
                elif type(source) is dict:
                    if 'name' in source or 'colname' in source:
                        if type(target_dict[key]) is list and len(
                                target_dict[key]) > 0:
                            tmp = None
                            tmp_target = copy.deepcopy(target_dict[key])
                            for item in tmp_target:
                                if (
                                        'name' in item and
                                        item['name'] == source['name']
                                ) or (
                                        'colname' in item and
                                        item['colname'] == source['colname']
                                ):
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
                    difference[key]['added'] = added
                    difference[key]['changed'] = updated
                elif target_dict[key] is None or \
                        (type(target_dict[key]) is list and
                         len(target_dict[key]) < index and
                         source != target_dict[key][index]):
                    difference[key] = source
                elif type(target_dict[key]) is list and\
                        len(target_dict[key]) > index:
                    difference[key] = source

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
                difference[key] = source_dict[key]

    return difference
