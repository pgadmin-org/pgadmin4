REVOKE ALL ON SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#" FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
    REVOKE ALL ON SEQUENCES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb IN SCHEMA "test_schema_$%{}[]()&*^!@""""'`\/#"
    REVOKE ALL ON TYPES FROM PUBLIC;
