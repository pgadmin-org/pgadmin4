##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Check if requires BEGIN in the current query."""


def is_begin_required(query):
    word_len = 0
    query = query.strip()
    query_len = len(query)

    # Check word length (since "beginx" is not "begin").
    while (word_len < query_len) and query[word_len].isalpha():
        word_len += 1

    # Transaction control commands.  These should include every keyword that
    #  gives rise to a TransactionStmt in the backend grammar, except for the
    #  savepoint-related commands.
    #
    #  (We assume that START must be START TRANSACTION, since there is
    #  presently no other "START foo" command.)

    keyword = query[0:word_len]

    if word_len == 5 and keyword.lower() == "abort":
        return False
    if word_len == 5 and keyword.lower() == "begin":
        return False
    if word_len == 5 and keyword.lower() == "start":
        return False
    if word_len == 6 and keyword.lower() == "commit":
        return False
    if word_len == 3 and keyword.lower() == "end":
        return False
    if word_len == 8 and keyword.lower() == "rollback":
        return False
    if word_len == 7 and keyword.lower() == "prepare":
        # PREPARE TRANSACTION is a TC command, PREPARE foo is not
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 11 and keyword.lower() == "transaction":
            return False
        return True

    # Commands not allowed within transactions. The statements checked for
    # here should be exactly those that call PreventTransactionChain() in the
    # backend.
    if word_len == 6 and keyword.lower() == "vacuum":
        return False

    if word_len == 7 and keyword.lower() == "cluster":
        # CLUSTER with any arguments is allowed in transactions
        query = query[word_len:query_len]
        query = query.strip()

        if query[0].isalpha():
            return True  # has additional words
        return False  # it's CLUSTER without arguments

    if word_len == 6 and keyword.lower() == "create":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 8 and keyword.lower() == "database":
            return False
        if word_len == 10 and keyword.lower() == "tablespace":
            return False

        # CREATE [UNIQUE] INDEX CONCURRENTLY isn't allowed in xacts
        if word_len == 7 and keyword.lower() == "cluster":
            query = query[word_len:query_len]
            query = query.strip()
            query_len = len(query)
            word_len = 0

            while (word_len < query_len) and query[word_len].isalpha():
                word_len += 1

            keyword = query[0:word_len]

        if word_len == 5 and keyword.lower() == "index":
            query = query[word_len:query_len]
            query = query.strip()
            query_len = len(query)
            word_len = 0

            while (word_len < query_len) and query[word_len].isalpha():
                word_len += 1

            keyword = query[0:word_len]
            if word_len == 12 and keyword.lower() == "concurrently":
                return False
        return True

    if word_len == 5 and keyword.lower() == "alter":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]

        # ALTER SYSTEM isn't allowed in xacts
        if word_len == 6 and keyword.lower() == "system":
            return False
        return True

    # Note: these tests will match DROP SYSTEM and REINDEX TABLESPACE, which
    # aren't really valid commands so we don't care much. The other four
    # possible matches are correct.
    if word_len == 4 and keyword.lower() == "drop" \
            or word_len == 7 and keyword.lower() == "reindex":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 8 and keyword.lower() == "database":
            return False
        if word_len == 6 and keyword.lower() == "system":
            return False
        if word_len == 10 and keyword.lower() == "tablespace":
            return False
        return True

    # DISCARD ALL isn't allowed in xacts, but other variants are allowed.
    if word_len == 7 and keyword.lower() == "discard":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 3 and keyword.lower() == "all":
            return False
        return True

    return True
