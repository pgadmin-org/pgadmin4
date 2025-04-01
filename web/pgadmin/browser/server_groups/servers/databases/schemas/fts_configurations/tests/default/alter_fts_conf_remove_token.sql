-- Text Search CONFIGURATION: test.test_fts_configuration_def2

-- DROP TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2

CREATE TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 (
	PARSER = default
);
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR asciihword WITH english_stem;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR asciiword WITH english_stem;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR email WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR file WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR float WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR host WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR hword WITH english_stem;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR hword_asciipart WITH english_stem;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR hword_numpart WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR hword_part WITH english_stem;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR int WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR numhword WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR numword WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR sfloat WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR uint WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR url WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR url_path WITH simple;
ALTER TEXT SEARCH CONFIGURATION test.test_fts_configuration_def2 ADD MAPPING FOR version WITH simple;
