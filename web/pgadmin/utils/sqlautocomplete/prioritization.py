import re
from collections import defaultdict

import sqlparse
from sqlparse.tokens import Name

white_space_regex = re.compile('\\s+', re.MULTILINE)


def _compile_regex(keyword):
    # Surround the keyword with word boundaries and replace interior whitespace
    # with whitespace wildcards
    pattern = '\\b' + re.sub(white_space_regex, '\\s+', keyword) + '\\b'
    return re.compile(pattern, re.MULTILINE | re.IGNORECASE)


class PrevalenceCounter(object):
    def __init__(self, keywords):
        self.keyword_counts = defaultdict(int)
        self.name_counts = defaultdict(int)
        self.keyword_regexs = dict((kw, _compile_regex(kw)) for kw in keywords)

    def update(self, text):
        self.update_keywords(text)
        self.update_names(text)

    def update_names(self, text):
        for parsed in sqlparse.parse(text):
            for token in parsed.flatten():
                if token.ttype in Name:
                    self.name_counts[token.value] += 1

    def clear_names(self):
        self.name_counts = defaultdict(int)

    def update_keywords(self, text):
        # Count keywords. Can't rely for sqlparse for this, because it's
        # database agnostic
        for keyword, regex in self.keyword_regexs.items():
            for _ in regex.finditer(text):
                self.keyword_counts[keyword] += 1

    def keyword_count(self, keyword):
        return self.keyword_counts[keyword]

    def name_count(self, name):
        return self.name_counts[name]
