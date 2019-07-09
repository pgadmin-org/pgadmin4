-- Text Search CONFIGURATION: test.test_fts_configuration_def1

-- DROP TEXT SEARCH CONFIGURATION test.test_fts_configuration_def1

CREATE TEXT SEARCH CONFIGURATION test.test_fts_configuration_def1 (
	PARSER = default
);

COMMENT ON TEXT SEARCH CONFIGURATION test.test_fts_configuration_def1 IS 'test comment';
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def1 ADD MAPPING FOR file WITH english_stem;
