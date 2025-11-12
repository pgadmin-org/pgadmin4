-- Database: test_database_icu_rules_$%{}[]()&*^!@""""'`\/#

-- DROP DATABASE IF EXISTS "test_database_icu_rules_$%{}[]()&*^!@""""""""'`\/#";

CREATE DATABASE "test_database_icu_rules_$%{}[]()&*^!@""""""""'`\/#"
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = '<LC_COLLATE>'
    LC_CTYPE = '<LC_CTYPE>'
    ICU_LOCALE = 'und'
    ICU_RULES = '&V << w <<< W'
    LOCALE_PROVIDER = 'icu'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;
