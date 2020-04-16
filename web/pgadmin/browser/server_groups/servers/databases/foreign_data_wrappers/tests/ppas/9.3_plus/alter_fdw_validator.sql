-- Foreign Data Wrapper: Fdw1_$%{}[]()&*^!@"'`\/#

-- DROP FOREIGN DATA WRAPPER "Fdw1_$%{}[]()&*^!@""'`\/#"

CREATE FOREIGN DATA WRAPPER "Fdw1_$%{}[]()&*^!@""'`\/#"
    VALIDATOR pg_catalog.postgresql_fdw_validator
    OPTIONS (opt1 'val1');

ALTER FOREIGN DATA WRAPPER "Fdw1_$%{}[]()&*^!@""'`\/#"
    OWNER TO <OWNER>;

COMMENT ON FOREIGN DATA WRAPPER "Fdw1_$%{}[]()&*^!@""'`\/#"
    IS 'a comment';
