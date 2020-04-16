-- Foreign Data Wrapper: Fdw2_$%{}[]()&*^!@"'`\/#

-- DROP FOREIGN DATA WRAPPER "Fdw2_$%{}[]()&*^!@""'`\/#"

CREATE FOREIGN DATA WRAPPER "Fdw2_$%{}[]()&*^!@""'`\/#"
    VALIDATOR pg_catalog.postgresql_fdw_validator
    OPTIONS (opt1 'val1');

ALTER FOREIGN DATA WRAPPER "Fdw2_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;

COMMENT ON FOREIGN DATA WRAPPER "Fdw2_$%{}[]()&*^!@""'`\/#"
    IS 'a comment';

GRANT USAGE ON FOREIGN DATA WRAPPER "Fdw2_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
GRANT USAGE ON FOREIGN DATA WRAPPER "Fdw2_$%{}[]()&*^!@""'`\/#" TO postgres WITH GRANT OPTION;
