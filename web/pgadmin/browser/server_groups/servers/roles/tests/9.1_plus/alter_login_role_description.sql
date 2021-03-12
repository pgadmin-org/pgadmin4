-- Role: "Role1_$%{}[]()&*^!@""'`\/#"
-- DROP ROLE "Role1_$%{}[]()&*^!@""'`\/#";

CREATE ROLE "Role1_$%{}[]()&*^!@""'`\/#" WITH
  LOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  CREATEROLE
  REPLICATION;


UPDATE pg_catalog.pg_authid SET rolcatupdate=false WHERE rolname = 'Role1_$%{}[]()&*^!@"''`\/#';

COMMENT ON ROLE "Role1_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
