-- Role: new_test_resql_role_pg91
-- DROP ROLE new_test_resql_role_pg91;

CREATE ROLE new_test_resql_role_pg91 WITH
  NOLOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;

COMMENT ON ROLE new_test_resql_role_pg91 IS 'This is detailed description';
