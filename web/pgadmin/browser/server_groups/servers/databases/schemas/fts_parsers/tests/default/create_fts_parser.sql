-- Text Search Parser: public.test_fts_parser_$%{}[]()&*^!@"'`\/#

-- DROP TEXT SEARCH PARSER public."test_fts_parser_$%{}[]()&*^!@""'`\/#"

CREATE TEXT SEARCH PARSER public."test_fts_parser_$%{}[]()&*^!@""'`\/#" (
    START = prsd_start,
    GETTOKEN = prsd_nexttoken,
    END = void_recv,
    LEXTYPES = dispell_init,
    HEADLINE = prsd_headline
);

COMMENT ON TEXT SEARCH PARSER public."test_fts_parser_$%{}[]()&*^!@""'`\/#" IS 'Creating test fts parser';
