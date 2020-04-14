-- Text Search Template: test_fts_template.FTSTemp_$%{}[]()&*^!@"'`\/#

-- DROP TEXT SEARCH TEMPLATE test_fts_template."FTSTemp_$%{}[]()&*^!@""'`\/#"

CREATE TEXT SEARCH TEMPLATE test_fts_template."FTSTemp_$%{}[]()&*^!@""'`\/#" (
    INIT = dsimple_init,
    LEXIZE = dsimple_lexize
);
