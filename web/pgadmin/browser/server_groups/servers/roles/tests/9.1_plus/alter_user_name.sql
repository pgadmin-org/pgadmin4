-- User: "Role2_$%{}[]()&*^!@""'`\/#"
-- DROP USER "Role2_$%{}[]()&*^!@""'`\/#";

CREATE USER "Role2_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;


UPDATE pg_authid SET rolcatupdate=false WHERE rolname = 'Role2_$%{}[]()&*^!@"''`\/#'';

COMMENT ON ROLE "Role2_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
