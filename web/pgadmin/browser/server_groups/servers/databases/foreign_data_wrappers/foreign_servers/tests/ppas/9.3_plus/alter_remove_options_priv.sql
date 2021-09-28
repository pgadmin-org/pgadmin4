-- Foreign Server: FS_$%{}[]()&*^!@"'`\/#

-- DROP SERVER IF EXISTS FS_$%{}[]()&*^!@"'`\/#

CREATE SERVER "FS_$%{}[]()&*^!@""'`\/#"
    VERSION '1.1'
    FOREIGN DATA WRAPPER test_fdw_for_fs;

ALTER SERVER "FS_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

COMMENT ON SERVER "FS_$%{}[]()&*^!@""'`\/#"
    IS 'Test comment';

GRANT USAGE ON FOREIGN SERVER "FS_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
