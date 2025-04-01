-- Text Search CONFIGURATION: test.test_fts_configuration

-- DROP TEXT SEARCH CONFIGURATION test.test_fts_configuration

CREATE TEXT SEARCH CONFIGURATION test.test_fts_configuration (
	PARSER = default
);

COMMENT ON TEXT SEARCH CONFIGURATION test.test_fts_configuration IS 'test comment';
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration ADD MAPPING FOR file WITH english_stem;
