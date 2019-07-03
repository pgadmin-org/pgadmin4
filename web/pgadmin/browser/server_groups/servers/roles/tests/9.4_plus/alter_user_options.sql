-- User: new_test_resql_user_pg95
-- DROP USER new_test_resql_user_pg95;

CREATE USER new_test_resql_user_pg95 WITH
  LOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  CREATEROLE
  REPLICATION;

COMMENT ON ROLE new_test_resql_user_pg95 IS 'This is detailed description';
