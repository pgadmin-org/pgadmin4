-- Database: <TEST_DB_NAME>

-- DROP DATABASE IF EXISTS <TEST_DB_NAME>;

CREATE DATABASE <TEST_DB_NAME>
    WITH
    OWNER = enterprisedb
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb REVOKE ALL ON TABLES FROM enterprisedb;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb REVOKE ALL ON SEQUENCES FROM enterprisedb;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb
GRANT SELECT, USAGE ON SEQUENCES TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE enterprisedb REVOKE USAGE ON TYPES FROM PUBLIC;
