-- SCHEMA: test_schema_$%{}[]()&*^!@""'`\/#

-- DROP SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" ;

CREATE SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
    AUTHORIZATION enterprisedb;

GRANT ALL ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" TO enterprisedb;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT SELECT ON TABLES TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
