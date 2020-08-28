-- Role: "Role2_$%{}[]()&*^!@""'`\/#"
-- DROP ROLE "Role2_$%{}[]()&*^!@""'`\/#";

CREATE ROLE "Role2_$%{}[]()&*^!@""'`\/#" WITH
  NOLOGIN
  SUPERUSER
  INHERIT
  CREATEDB
  NOCREATEROLE
  NOREPLICATION
  CONNECTION LIMIT 100
  ENCRYPTED PASSWORD '<PASSWORD>'
  VALID UNTIL '2050-01-01 00:00:00+05:30';

GRANT test_rolemembership_1, test_rolemembership_2 TO "Role2_$%{}[]()&*^!@""'`\/#" WITH ADMIN OPTION;

ALTER ROLE "Role2_$%{}[]()&*^!@""'`\/#" IN DATABASE postgres SET application_name TO 'pg4';

COMMENT ON ROLE "Role2_$%{}[]()&*^!@""'`\/#" IS 'This is detailed description';
