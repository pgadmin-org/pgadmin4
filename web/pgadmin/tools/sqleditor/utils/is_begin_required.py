##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


def _get_keyword(query):
    """
    Calculate word len, used internally by is_begin_required
    :param query: query
    :return: keyword len, keyword
    """
    query_len = len(query)
    word_len = 0
    while (word_len < query_len) and query[word_len].isalpha():
        word_len += 1

    keyword = query[0:word_len]
    return word_len, keyword


def _check_next_keyword(query, word_len, keyword_list):
    """
    Check if the next keyword is from the keyword list
    :param query: query
    :param word_len: current keyword len
    :param keyword_list: next keyword list
    :return: boolean
    """
    if keyword_list is None:
        return True
    query_len = len(query)
    query = query[word_len:query_len]
    query = query.strip()
    word_len, keyword = _get_keyword(query)

    if keyword.lower() in keyword_list:
        return False
    return True


def is_begin_required(query):
    """Check if requires BEGIN in the current query."""
    query = query.strip()
    query_len = len(query)

    # Check word length (since "beginx" is not "begin").
    word_len, keyword = _get_keyword(query)
    # Transaction control commands.  These should include every keyword that
    #  gives rise to a TransactionStmt in the backend grammar, except for the
    #  savepoint-related commands.
    #
    #  (We assume that START must be START TRANSACTION, since there is
    #  presently no other "START foo" command.)

    # Commands not allowed within transactions. The statements checked for
    # here should be exactly those that call PreventTransactionChain() in the
    # backend.
    if keyword.lower() in ["abort", "begin", "start", "commit", "vacuum",
                           "end", "rollback"]:
        return False

    if keyword.lower() == "cluster":
        # CLUSTER with any arguments is allowed in transactions
        query = query[word_len:query_len]
        query = query.strip()

        if query[0].isalpha():
            return True  # has additional words
        return False  # it's CLUSTER without arguments

    if keyword.lower() == "create":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len, keyword = _get_keyword(query)

        if keyword.lower() in ["database", "tablespace"]:
            return False

        # CREATE [UNIQUE] INDEX CONCURRENTLY isn't allowed in xacts
        if keyword.lower() == "cluster":
            query = query[word_len:query_len]
            query = query.strip()
            query_len = len(query)
            word_len, keyword = _get_keyword(query)

        if keyword.lower() == "index":
            query = query[word_len:query_len]
            query = query.strip()
            word_len, keyword = _get_keyword(query)

            if keyword.lower() == "concurrently":
                return False
        return True

    next_keyword_map = {
        # PREPARE TRANSACTION is a TC command, PREPARE foo is not
        "prepare": ["transaction"],
        # ALTER SYSTEM isn't allowed in xacts
        "alter": ["system"],
        # Note: these tests will match DROP SYSTEM and REINDEX TABLESPACE,
        # which aren't really valid commands so we don't care much. The other
        # four possible matches are correct.
        "drop": ["database", "system", "tablespace"],
        "reindex": ["database", "system", "tablespace"],
        # DISCARD ALL isn't allowed in xacts, but other variants are allowed.
        "discard": ["all"],
    }

    return _check_next_keyword(
        query, word_len, next_keyword_map.get(keyword.lower(), None))
