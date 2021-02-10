-- SCHEMA: test_schema_$%{}[]()&*^!@""'`\/#

-- DROP SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" ;

CREATE SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
    AUTHORIZATION postgres;

GRANT USAGE ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" TO PUBLIC;

GRANT ALL ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT SELECT ON TABLES TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT UPDATE ON SEQUENCES TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT USAGE ON TYPES TO PUBLIC;
