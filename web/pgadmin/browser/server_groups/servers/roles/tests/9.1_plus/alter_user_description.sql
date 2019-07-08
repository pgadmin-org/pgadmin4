-- User: "Role1_$%{}[]()&*^!@""'`\/#"
-- DROP USER "Role1_$%{}[]()&*^!@""'`\/#";

CREATE USER "Role1_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;


UPDATE pg_authid SET rolcatupdate=false WHERE rolname = 'Role1_$%{}[]()&*^!@"''`\/#';

COMMENT ON ROLE "Role1_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
