# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

# This utility will extract SQL keywords from postgres website and
# pgsql keywords from the code git paths mentioned in PG_CODES_URLS
# Note that, PG_CODES_URLS may need to be changed manually per version change

import re
import requests
import argparse

PG_CODES_URLS = [
    "https://git.postgresql.org/gitweb/?p=postgresql.git;a=blob_plain;"
    "f=src/pl/plpgsql/src/pl_scanner.c",
]
PG_CODES_REGEX = "PG_KEYWORD\(\"([a-z]*)\"[A-Z_, ]*\)"

PG_SQL_DOCS_URL = \
    "https://www.postgresql.org/docs/current/sql-keywords-appendix.html"
PG_SQL_DOCS_REGEX = "<[a-z =\"]*>([A-Z_]*)"

PG_CURRENT_VERSION_URL = "https://www.postgresql.org/docs/current/index.html"
PG_CURRENT_VERSION_REGEX = "PostgreSQL ([0-9.]+) Documentation"


def apply_regex(text, regex):
    return re.findall(regex, text)


def get_file_from_url(url):
    req = requests.get(url)
    return req.text


def extract_keywords(text, regex):
    keywords = apply_regex(text, regex)
    return [k.lower() for k in keywords]


def get_release_tag(current_url=PG_CURRENT_VERSION_URL,
                    version_regex=PG_CURRENT_VERSION_REGEX):
    resp_text = get_file_from_url(current_url)
    version = apply_regex(resp_text, version_regex)
    if isinstance(version, list):
        version = version[0]

    return "REL_" + version.replace(".", "_")


def get_keywords_pg_code(file_urls=PG_CODES_URLS,
                         keyword_regex=PG_CODES_REGEX):
    keywords = []

    # Lets get the latest version first
    rel_tag = get_release_tag()
    for file_url in file_urls:
        if "hb" not in file_url:
            file_url = file_url + ";hb=" + rel_tag
        resp_text = get_file_from_url(file_url)

        # Sample entry - PG_KEYWORD("begin", K_BEGIN, RESERVED_KEYWORD)
        keywords.extend(extract_keywords(resp_text, keyword_regex))

    return keywords


def get_keywords_pg_docs(docs_url=PG_SQL_DOCS_URL,
                         keyword_regex=PG_SQL_DOCS_REGEX):
    resp_text = get_file_from_url(docs_url)
    # Sample entry - <code class="token">ABORT</code>
    keywords = extract_keywords(resp_text, keyword_regex)

    return keywords


def get_all_keywords():
    final_keywords = set()

    final_keywords.update(get_keywords_pg_code())
    final_keywords.update(get_keywords_pg_docs())

    return len(final_keywords), " ".join(sorted(list(final_keywords))).strip()


if __name__ == '__main__':
    args_parser = argparse.ArgumentParser(description="SQL Keywords extractor")
    args_parser.add_argument(
        '--total',
        help="Print with total number of keywords",
        action="store_true"
    )
    args = args_parser.parse_args()

    total, keywords = get_all_keywords()
    if args.total:
        print(keywords + "%s\n\n%d keywords extracted." % (keywords, total))
    else:
        print(keywords)
