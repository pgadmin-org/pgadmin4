-- SCHEMA: test_schema_$%{}[]()&*^!@""'`\/#

-- DROP SCHEMA IF EXISTS "test_schema_$%{}[]()&*^!@""""'`\/#" ;

CREATE SCHEMA IF NOT EXISTS "test_schema_$%{}[]()&*^!@""""'`\/#"
    AUTHORIZATION postgres;

GRANT ALL ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT SELECT ON TABLES TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
