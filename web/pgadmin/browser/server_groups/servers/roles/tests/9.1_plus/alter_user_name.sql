-- User: new_test_resql_user_pg91
-- DROP USER new_test_resql_user_pg91;

CREATE USER new_test_resql_user_pg91 WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;


UPDATE pg_authid SET rolcatupdate=false WHERE rolname = new_test_resql_user_pg91;

COMMENT ON ROLE new_test_resql_user_pg91 IS 'This is detailed description';
