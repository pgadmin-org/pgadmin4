REVOKE ALL ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" FROM PUBLIC;
GRANT USAGE ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
    REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT SELECT ON TABLES TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
    REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
GRANT UPDATE ON SEQUENCES TO PUBLIC;
