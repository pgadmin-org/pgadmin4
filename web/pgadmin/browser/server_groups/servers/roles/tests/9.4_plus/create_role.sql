-- Role: test_resql_role_pg95
-- DROP ROLE test_resql_role_pg95;

CREATE ROLE test_resql_role_pg95 WITH
  NOLOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;
