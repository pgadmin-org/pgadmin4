-- Collation: Cl1_$%{}[]()&*^!@"'`\/#b;

-- DROP COLLATION IF EXISTS testschema."Cl1_$%{}[]()&*^!@""'`\/#b";

CREATE COLLATION IF NOT EXISTS testschema."Cl1_$%{}[]()&*^!@""'`\/#b"
    (LC_COLLATE = 'locale', LC_CTYPE = 'locale', PROVIDER = 'i', DETERMINISTIC = true, VERSION = '1');

ALTER COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#b"
    OWNER TO <OWNER>;

COMMENT ON COLLATION testschema."Cl1_$%{}[]()&*^!@""'`\/#b"
    IS 'Description for extra params';
