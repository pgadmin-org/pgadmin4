-- Role: "Role1_$%{}[]()&*^!@""'`\/#"
-- DROP ROLE IF EXISTS "Role1_$%{}[]()&*^!@""'`\/#";

CREATE ROLE "Role1_$%{}[]()&*^!@""'`\/#" WITH
  NOLOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;

COMMENT ON ROLE "Role1_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
