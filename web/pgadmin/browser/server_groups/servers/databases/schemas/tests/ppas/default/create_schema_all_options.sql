-- SCHEMA: test_schema_$%{}[]()&*^!@""'`\/#

-- DROP SCHEMA IF EXISTS "test_schema_$%{}[]()&*^!@""""'`\/#" ;

CREATE SCHEMA IF NOT EXISTS "test_schema_$%{}[]()&*^!@""""'`\/#"
    AUTHORIZATION enterprisedb;

COMMENT ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
    IS 'This is a test comment';

GRANT ALL ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" TO PUBLIC;

GRANT ALL ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" TO enterprisedb;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT ALL ON TABLES TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT ALL ON SEQUENCES TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT USAGE ON TYPES TO PUBLIC;
