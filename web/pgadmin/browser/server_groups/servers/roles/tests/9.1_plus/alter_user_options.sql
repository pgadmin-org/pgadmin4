-- User: new_test_resql_user_pg91
-- DROP USER new_test_resql_user_pg91;

CREATE USER new_test_resql_user_pg91 WITH
  LOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  CREATEROLE
  REPLICATION;

COMMENT ON ROLE new_test_resql_user_pg91 IS 'This is detailed description';
