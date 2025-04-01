ALTER TEXT SEARCH PARSER public."test_fts_parser_$%{}[]()&*^!@""'`\/#"
    RENAME TO "test_fts_parser_updated_$%{}[]()&*^!@""'`\/#";

COMMENT ON TEXT SEARCH PARSER public."test_fts_parser_updated_$%{}[]()&*^!@""'`\/#"
    IS 'Updating test fts parser';
