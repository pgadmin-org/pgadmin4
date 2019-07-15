-- Role: "Role2_$%{}[]()&*^!@""'`\/#"
-- DROP ROLE "Role2_$%{}[]()&*^!@""'`\/#";

CREATE ROLE "Role2_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  CREATEROLE
  REPLICATION;

COMMENT ON ROLE "Role2_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
