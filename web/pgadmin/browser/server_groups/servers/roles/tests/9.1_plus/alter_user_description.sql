-- User: test_resql_user_pg91
-- DROP USER test_resql_user_pg91;

CREATE USER test_resql_user_pg91 WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;


UPDATE pg_authid SET rolcatupdate=false WHERE rolname = test_resql_user_pg91;

COMMENT ON ROLE test_resql_user_pg91 IS 'This is detailed description';
