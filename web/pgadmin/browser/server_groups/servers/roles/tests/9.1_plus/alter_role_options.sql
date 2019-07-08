-- Role: "Role2_$%{}[]()&*^!@""'`\/#"
-- DROP ROLE "Role2_$%{}[]()&*^!@""'`\/#";

CREATE ROLE "Role2_$%{}[]()&*^!@""'`\/#" WITH
  NOLOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  NOCREATEROLE
  NOREPLICATION;


UPDATE pg_authid SET rolcatupdate=false WHERE rolname = 'Role2_$%{}[]()&*^!@"''`\/#';

COMMENT ON ROLE "Role2_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
