-- Role: "Role2_$%{}[]()&*^!@""'`\/#"
-- DROP ROLE "Role2_$%{}[]()&*^!@""'`\/#";

CREATE ROLE "Role2_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;

COMMENT ON ROLE "Role2_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
