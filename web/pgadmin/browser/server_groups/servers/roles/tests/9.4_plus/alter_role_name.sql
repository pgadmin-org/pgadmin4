-- Role: new_test_resql_role_pg95
-- DROP ROLE new_test_resql_role_pg95;

CREATE ROLE new_test_resql_role_pg95 WITH
  NOLOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;

COMMENT ON ROLE new_test_resql_role_pg95 IS 'This is detailed description';
