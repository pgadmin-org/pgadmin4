-- User: "Role2_$%{}[]()&*^!@""'`\/#"
-- DROP USER "Role2_$%{}[]()&*^!@""'`\/#";

CREATE USER "Role2_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  CREATEROLE
  REPLICATION;

COMMENT ON ROLE "Role2_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
