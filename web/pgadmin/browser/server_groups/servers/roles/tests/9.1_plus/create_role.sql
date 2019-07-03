-- Role: test_resql_role_pg91
-- DROP ROLE test_resql_role_pg91;

CREATE ROLE test_resql_role_pg91 WITH
  NOLOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;
