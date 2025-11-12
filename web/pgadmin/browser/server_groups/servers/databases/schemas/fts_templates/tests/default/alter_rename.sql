-- Text Search Template: test_fts_template.FTSTemp1_$%{}[]()&*^!@"'`\/#

-- DROP TEXT SEARCH TEMPLATE test_fts_template."FTSTemp1_$%{}[]()&*^!@""'`\/#"

CREATE TEXT SEARCH TEMPLATE test_fts_template."FTSTemp1_$%{}[]()&*^!@""'`\/#" (
    INIT = dsimple_init,
    LEXIZE = dsimple_lexize
);
