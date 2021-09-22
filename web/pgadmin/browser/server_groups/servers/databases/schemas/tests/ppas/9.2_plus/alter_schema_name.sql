-- SCHEMA: test_schema1_$%{}[]()&*^!@""'`\/#

-- DROP SCHEMA IF EXISTS "test_schema1_$%{}[]()&*^!@""""'`\/#" ;

CREATE SCHEMA IF NOT EXISTS "test_schema1_$%{}[]()&*^!@""""'`\/#"
    AUTHORIZATION enterprisedb;

COMMENT ON SCHEMA "test_schema1_$%{}[]()&*^!@""""'`\/#"
    IS 'This is a test comment';
