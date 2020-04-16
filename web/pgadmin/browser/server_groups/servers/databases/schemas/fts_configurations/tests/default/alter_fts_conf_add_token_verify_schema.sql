-- Text Search CONFIGURATION: test.test_fts_conf_$%{}[]()&*^!@"'`\/#

-- DROP TEXT SEARCH CONFIGURATION test."test_fts_conf_$%{}[]()&*^!@""'`\/#"

CREATE TEXT SEARCH CONFIGURATION test."test_fts_conf_$%{}[]()&*^!@""'`\/#" (
	PARSER = default
);
ALTER TEXT SEARCH CONFIGURATION test."test_fts_conf_$%{}[]()&*^!@""'`\/#" ADD MAPPING FOR asciiword WITH test.test_dic;
