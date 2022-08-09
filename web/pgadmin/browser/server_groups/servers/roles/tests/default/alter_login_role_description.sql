-- Role: "Role1_$%{}[]()&*^!@""'`\/#"
-- DROP ROLE IF EXISTS "Role1_$%{}[]()&*^!@""'`\/#";

CREATE ROLE "Role1_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;

COMMENT ON ROLE "Role1_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
