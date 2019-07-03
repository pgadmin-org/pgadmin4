-- Role: new_test_resql_role_pg91
-- DROP ROLE new_test_resql_role_pg91;

CREATE ROLE new_test_resql_role_pg91 WITH
  NOLOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  NOCREATEROLE
  NOREPLICATION;


UPDATE pg_authid SET rolcatupdate=false WHERE rolname = new_test_resql_role_pg91;

COMMENT ON ROLE new_test_resql_role_pg91 IS 'This is detailed description';
