-- User: "Role1_$%{}[]()&*^!@""'`\/#"
-- DROP USER "Role1_$%{}[]()&*^!@""'`\/#";

CREATE USER "Role1_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;

COMMENT ON ROLE "Role1_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
