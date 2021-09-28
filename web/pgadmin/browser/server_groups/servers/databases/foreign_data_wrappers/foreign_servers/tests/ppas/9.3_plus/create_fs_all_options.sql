-- Foreign Server: FS_$%{}[]()&*^!@"'`\/#

-- DROP SERVER IF EXISTS FS_$%{}[]()&*^!@"'`\/#

CREATE SERVER "FS_$%{}[]()&*^!@""'`\/#"
    TYPE 'oracle'
    VERSION '1.1'
    FOREIGN DATA WRAPPER test_fdw_for_fs
    OPTIONS (host '192.168.1.1', dbname 'edb', port '5450');

ALTER SERVER "FS_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

COMMENT ON SERVER "FS_$%{}[]()&*^!@""'`\/#"
    IS 'Test comment';

GRANT USAGE ON FOREIGN SERVER "FS_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
GRANT USAGE ON FOREIGN SERVER "FS_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
